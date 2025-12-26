#!/usr/bin/env python3
"""
PostgreSQL to MSSQL Conversion Script - Enhanced Version
Converts PostgreSQL dump to Microsoft SQL Server compatible format
"""

import re
import sys

class PostgresToMSSQLConverter:
    def __init__(self):
        self.conversion_notes = []
        self.tables_created = []

    def convert(self, pg_sql):
        """Main conversion method"""
        lines = pg_sql.split('\n')
        output = []

        # Add MSSQL header
        output.extend(self.generate_header())

        i = 0
        current_table = None
        in_table_def = False
        table_columns = []
        in_copy_block = False
        copy_table = None
        copy_columns = []
        copy_data_lines = []

        while i < len(lines):
            line = lines[i].rstrip()

            # Skip PostgreSQL-specific commands
            if self.should_skip_line(line):
                i += 1
                continue

            # Handle functions (convert to comment for now)
            if 'CREATE FUNCTION' in line:
                i = self.skip_function(lines, i, output)
                continue

            # Handle sequences
            if 'CREATE SEQUENCE' in line:
                seq_name = re.search(r'CREATE SEQUENCE\s+(\S+)', line)
                if seq_name:
                    output.append(f"-- PostgreSQL SEQUENCE {seq_name.group(1)} omitted")
                    output.append(f"-- Will be implemented as IDENTITY or SEQUENCE in SQL Server")
                    output.append("")
                    self.conversion_notes.append(f"Sequence {seq_name.group(1)} needs manual implementation")
                i = self.skip_until_semicolon(lines, i)
                continue

            # Handle table creation
            if line.startswith('CREATE TABLE'):
                in_table_def = True
                table_match = re.search(r'CREATE TABLE\s+(\S+)\s*\(', line)
                if table_match:
                    current_table = table_match.group(1).replace('public.', '')
                    output.append(f"-- ========================================")
                    output.append(f"-- Table: {current_table}")
                    output.append(f"-- ========================================")
                    output.append(f"IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = '{current_table}')")
                    output.append(f"BEGIN")
                    output.append(f"    CREATE TABLE [dbo].[{current_table}] (")
                    table_columns = []
                    self.tables_created.append(current_table)
                i += 1
                continue

            # Handle table column definitions
            if in_table_def:
                if line.strip() == ');':
                    # End of table
                    in_table_def = False
                    if table_columns:
                        output.append("        " + ",\n        ".join(table_columns))
                    output.append("    );")
                    output.append("END")
                    output.append("GO")
                    output.append("")
                    table_columns = []
                    i += 1
                    continue

                # Parse column
                col_def = line.strip()
                if col_def and not col_def.startswith('--'):
                    col_def = self.convert_column_definition(col_def, current_table)
                    if col_def:
                        table_columns.append(col_def)
                i += 1
                continue

            # Handle COMMENT ON statements
            if line.startswith('COMMENT ON'):
                comment_sql = self.convert_comment(line)
                if comment_sql:
                    output.extend(comment_sql)
                i += 1
                continue

            # Handle COPY data blocks
            if line.startswith('COPY '):
                in_copy_block = True
                copy_match = re.search(r'COPY\s+(\S+)\s+\(([^)]+)\)\s+FROM stdin;', line)
                if copy_match:
                    copy_table = copy_match.group(1).replace('public.', '')
                    copy_columns = [c.strip() for c in copy_match.group(2).split(',')]
                    copy_data_lines = []
                    output.append(f"-- ========================================")
                    output.append(f"-- Data for table: {copy_table}")
                    output.append(f"-- ========================================")
                i += 1
                continue

            if in_copy_block:
                if line == '\\.':
                    # End of COPY block
                    in_copy_block = False
                    if copy_data_lines:
                        insert_statements = self.generate_inserts(copy_table, copy_columns, copy_data_lines)
                        output.extend(insert_statements)
                    output.append("GO")
                    output.append("")
                    copy_data_lines = []
                    i += 1
                    continue
                else:
                    copy_data_lines.append(line)
                    i += 1
                    continue

            # Handle ALTER TABLE constraints
            if line.startswith('ALTER TABLE') and 'ADD CONSTRAINT' in line:
                constraint_sql = self.convert_constraint(line)
                if constraint_sql:
                    output.append(constraint_sql)
                    output.append("GO")
                    output.append("")
                i += 1
                continue

            # Handle CREATE INDEX
            if line.startswith('CREATE') and 'INDEX' in line:
                index_sql = self.convert_index(line)
                if index_sql:
                    output.append(index_sql)
                    output.append("GO")
                    output.append("")
                i += 1
                continue

            # Handle CREATE TRIGGER
            if line.startswith('CREATE TRIGGER'):
                trigger_lines = self.convert_trigger(lines, i)
                if trigger_lines:
                    output.extend(trigger_lines)
                    output.append("GO")
                    output.append("")
                i = self.skip_until_semicolon(lines, i)
                continue

            # Keep comments and blank lines
            if line.startswith('--') or line.strip() == '':
                if not ('Owner: postgres' in line or 'Type:' in line and 'Owner:' in line):
                    output.append(line)

            i += 1

        return '\n'.join(output)

    def generate_header(self):
        """Generate MSSQL script header"""
        return [
            "-- =============================================",
            "-- Microsoft SQL Server Database Script",
            "-- Converted from PostgreSQL dump",
            "-- Conversion Date: 2025-12-25",
            "-- =============================================",
            "--",
            "-- IMPORTANT NOTES:",
            "-- 1. Review all DEFAULT constraints",
            "-- 2. Test FOREIGN KEY relationships",
            "-- 3. Verify date/time data",
            "-- 4. Check numeric precision",
            "-- 5. Arrays stored as JSON in NVARCHAR(MAX)",
            "-- 6. Sequences need manual implementation",
            "-- =============================================",
            "",
            "SET NOCOUNT ON;",
            "SET ANSI_NULLS ON;",
            "SET QUOTED_IDENTIFIER ON;",
            "GO",
            ""
        ]

    def should_skip_line(self, line):
        """Check if line should be skipped"""
        skip_patterns = [
            'SET statement_timeout',
            'SET lock_timeout',
            'SET idle_in_transaction_session_timeout',
            'SET client_encoding',
            'SET standard_conforming_strings',
            'SELECT pg_catalog.set_config',
            'SET check_function_bodies',
            'SET xmloption',
            'SET client_min_messages',
            'SET row_security',
            'SET default_tablespace',
            'SET default_table_access_method',
        ]

        for pattern in skip_patterns:
            if line.startswith(pattern):
                return True

        if 'OWNER TO postgres' in line:
            return True

        return False

    def convert_column_definition(self, col_def, table_name):
        """Convert PostgreSQL column definition to MSSQL"""
        # Remove trailing comma
        if col_def.endswith(','):
            col_def = col_def[:-1]

        # Convert gen_random_uuid()
        col_def = re.sub(r'DEFAULT\s+gen_random_uuid\(\)', 'DEFAULT NEWID()', col_def)
        col_def = re.sub(r'DEFAULT\s+\(gen_random_uuid\(\)\)::text', 'DEFAULT NEWID()', col_def)

        # Convert character varying
        col_def = re.sub(r'character varying\((\d+)\)', r'NVARCHAR(\1)', col_def)
        col_def = re.sub(r'character varying\b', 'NVARCHAR(MAX)', col_def)

        # Convert text
        col_def = re.sub(r'\btext\b', 'NVARCHAR(MAX)', col_def)

        # Convert timestamps
        col_def = re.sub(r'timestamp without time zone', 'DATETIME2', col_def)
        col_def = re.sub(r'timestamp with time zone', 'DATETIMEOFFSET', col_def)

        # Convert now()
        col_def = re.sub(r'DEFAULT\s+now\(\)', 'DEFAULT GETDATE()', col_def)

        # Convert numeric
        col_def = re.sub(r'\bnumeric\((\d+),(\d+)\)', r'DECIMAL(\1,\2)', col_def)
        col_def = re.sub(r'\bnumeric\b(?!\()', 'DECIMAL(18,2)', col_def)

        # Convert integer
        col_def = re.sub(r'\binteger\b', 'INT', col_def)

        # Convert boolean
        col_def = re.sub(r'\bboolean\b', 'BIT', col_def)

        # Convert arrays
        col_def = re.sub(r'character varying\[\]', 'NVARCHAR(MAX)', col_def)
        col_def = re.sub(r"DEFAULT\s+ARRAY\[\]::character varying\[\]", "DEFAULT '[]'", col_def)

        # Convert jsonb/json
        col_def = re.sub(r'\bjsonb\b', 'NVARCHAR(MAX)', col_def)
        col_def = re.sub(r'\bjson\b', 'NVARCHAR(MAX)', col_def)

        # Handle sequence-based defaults
        if 'nextval' in col_def:
            col_def = re.sub(r"DEFAULT\s+\('EMP'::text\s*\|\|\s*lpad\(\(nextval\([^)]+\)\)::text,\s*5,\s*'0'::text\)\)", '', col_def)
            self.conversion_notes.append(f"Table {table_name}: emp_code sequence default removed - needs trigger")

        # Remove PostgreSQL type casts
        col_def = re.sub(r"'([^']+)'::character varying", r"'\1'", col_def)
        col_def = re.sub(r"'([^']+)'::NVARCHAR(?:\([^)]+\))?", r"'\1'", col_def)
        col_def = re.sub(r"'(\d+)'::numeric", r"\1", col_def)
        col_def = re.sub(r"::text\b", "", col_def)

        # Convert boolean defaults
        col_def = re.sub(r'\bDEFAULT\s+false\b', 'DEFAULT 0', col_def)
        col_def = re.sub(r'\bDEFAULT\s+true\b', 'DEFAULT 1', col_def)

        # Add brackets to column name
        parts = col_def.split(None, 1)
        if len(parts) >= 1:
            col_name = parts[0]
            rest = parts[1] if len(parts) > 1 else ''
            col_def = f"[{col_name}] {rest}" if rest else f"[{col_name}]"

        return col_def.strip()

    def convert_comment(self, line):
        """Convert COMMENT ON to sp_addextendedproperty"""
        # Column comment
        col_match = re.search(r"COMMENT ON COLUMN\s+(\S+)\.(\S+)\.(\S+)\s+IS\s+'([^']+)';", line)
        if col_match:
            schema = col_match.group(1)
            table = col_match.group(2)
            column = col_match.group(3)
            comment = col_match.group(4).replace("'", "''")

            return [
                f"EXEC sp_addextendedproperty",
                f"    @name = N'MS_Description',",
                f"    @value = N'{comment}',",
                f"    @level0type = N'SCHEMA', @level0name = N'dbo',",
                f"    @level1type = N'TABLE', @level1name = N'{table}',",
                f"    @level2type = N'COLUMN', @level2name = N'{column}';",
                "GO",
                ""
            ]

        # Table comment
        table_match = re.search(r"COMMENT ON TABLE\s+(\S+)\.(\S+)\s+IS\s+'([^']+)';", line)
        if table_match:
            schema = table_match.group(1)
            table = table_match.group(2)
            comment = table_match.group(3).replace("'", "''")

            return [
                f"EXEC sp_addextendedproperty",
                f"    @name = N'MS_Description',",
                f"    @value = N'{comment}',",
                f"    @level0type = N'SCHEMA', @level0name = N'dbo',",
                f"    @level1type = N'TABLE', @level1name = N'{table}';",
                "GO",
                ""
            ]

        return None

    def convert_constraint(self, line):
        """Convert ALTER TABLE ADD CONSTRAINT to MSSQL"""
        # Replace schema prefix
        line = re.sub(r'ALTER TABLE ONLY\s+public\.(\w+)', r'ALTER TABLE [dbo].[\1]', line)
        line = re.sub(r'ALTER TABLE\s+public\.(\w+)', r'ALTER TABLE [dbo].[\1]', line)

        # Convert PRIMARY KEY
        line = re.sub(
            r'ADD CONSTRAINT\s+(\w+)\s+PRIMARY KEY\s+\(([^)]+)\)',
            lambda m: f'ADD CONSTRAINT [{m.group(1)}] PRIMARY KEY ([{m.group(2).strip()}])',
            line
        )

        # Convert UNIQUE
        line = re.sub(
            r'ADD CONSTRAINT\s+(\w+)\s+UNIQUE\s+\(([^)]+)\)',
            lambda m: f'ADD CONSTRAINT [{m.group(1)}] UNIQUE ([{m.group(2).strip()}])',
            line
        )

        # Convert FOREIGN KEY
        line = re.sub(
            r'ADD CONSTRAINT\s+(\w+)\s+FOREIGN KEY\s+\(([^)]+)\)\s+REFERENCES\s+(\S+)\s*\(([^)]+)\)',
            lambda m: f'ADD CONSTRAINT [{m.group(1)}] FOREIGN KEY ([{m.group(2).strip()}]) REFERENCES [dbo].[{m.group(3).replace("public.", "")}]([{m.group(4).strip()}])',
            line
        )

        # Handle ON DELETE/UPDATE cascades
        line = re.sub(r'ON DELETE CASCADE', 'ON DELETE CASCADE', line)
        line = re.sub(r'ON UPDATE CASCADE', 'ON UPDATE CASCADE', line)

        return line

    def convert_index(self, line):
        """Convert CREATE INDEX to MSSQL"""
        # Remove CONCURRENTLY
        line = re.sub(r'CREATE\s+UNIQUE\s+INDEX\s+CONCURRENTLY', 'CREATE UNIQUE INDEX', line)
        line = re.sub(r'CREATE\s+INDEX\s+CONCURRENTLY', 'CREATE INDEX', line)

        # Extract index components
        index_match = re.search(r'CREATE\s+(UNIQUE\s+)?INDEX\s+(\S+)\s+ON\s+public\.(\S+)\s+USING\s+\w+\s+\(([^)]+)\)', line)
        if index_match:
            unique = index_match.group(1) or ''
            index_name = index_match.group(2)
            table_name = index_match.group(3)
            columns = index_match.group(4)

            # Clean up column names
            col_list = []
            for col in columns.split(','):
                col = col.strip()
                # Remove DESC keyword and operators
                col = re.sub(r'\s+DESC\s*$', '', col)
                # Handle column with sort order
                if ' ' in col:
                    col_parts = col.split()
                    col_list.append(f'[{col_parts[0]}]')
                else:
                    col_list.append(f'[{col}]')

            cols_str = ', '.join(col_list)
            return f"CREATE {unique}INDEX [{index_name}] ON [dbo].[{table_name}] ({cols_str});"

        return line

    def convert_trigger(self, lines, start_idx):
        """Convert PostgreSQL trigger to MSSQL"""
        line = lines[start_idx]
        trigger_match = re.search(r'CREATE TRIGGER\s+(\S+)\s+(BEFORE|AFTER)\s+(\w+)\s+ON\s+public\.(\w+)', line)

        if not trigger_match:
            return None

        trigger_name = trigger_match.group(1)
        timing = trigger_match.group(2)
        event = trigger_match.group(3).upper()
        table_name = trigger_match.group(4)

        result = [
            f"-- ========================================",
            f"-- Trigger: {trigger_name}",
            f"-- ========================================",
            f"CREATE TRIGGER [{trigger_name}]",
            f"ON [dbo].[{table_name}]",
        ]

        # MSSQL uses AFTER or INSTEAD OF
        if timing == 'BEFORE':
            result.append(f"INSTEAD OF {event}")
        else:
            result.append(f"AFTER {event}")

        result.extend([
            "AS",
            "BEGIN",
            "    SET NOCOUNT ON;",
            ""
        ])

        # For updated_at triggers
        if 'updated_at' in trigger_name.lower():
            result.extend([
                f"    UPDATE t",
                f"    SET t.updated_at = GETDATE()",
                f"    FROM [dbo].[{table_name}] t",
                f"    INNER JOIN inserted i ON t.id = i.id;",
            ])

        result.extend([
            "END;",
        ])

        self.conversion_notes.append(f"Trigger {trigger_name} converted")
        return result

    def generate_inserts(self, table_name, columns, data_lines):
        """Generate INSERT statements from COPY data"""
        inserts = []

        # Check if we need IDENTITY_INSERT
        has_id_column = 'id' in columns

        if has_id_column:
            inserts.append(f"SET IDENTITY_INSERT [dbo].[{table_name}] ON;")
            inserts.append("GO")

        for line in data_lines:
            if not line.strip():
                continue

            values = self.parse_copy_values(line)
            if len(values) != len(columns):
                continue

            cols_str = ', '.join([f'[{col}]' for col in columns])
            vals_str = ', '.join(values)

            inserts.append(f"INSERT INTO [dbo].[{table_name}] ({cols_str})")
            inserts.append(f"VALUES ({vals_str});")

        if has_id_column:
            inserts.append("GO")
            inserts.append(f"SET IDENTITY_INSERT [dbo].[{table_name}] OFF;")

        return inserts

    def parse_copy_values(self, line):
        """Parse PostgreSQL COPY data line into SQL values"""
        parts = line.split('\t')
        values = []

        for part in parts:
            part = part.strip()

            # NULL
            if part == '\\N' or part == '':
                values.append('NULL')
            # Boolean
            elif part == 't':
                values.append('1')
            elif part == 'f':
                values.append('0')
            # Number
            elif re.match(r'^-?\d+(\.\d+)?$', part):
                values.append(part)
            # Array
            elif part.startswith('{') and part.endswith('}'):
                content = part[1:-1]
                if content:
                    # Simple array to JSON conversion
                    items = content.split(',')
                    json_array = '["' + '","'.join(items) + '"]'
                    values.append(f"N'{json_array}'")
                else:
                    values.append("N'[]'")
            # Date
            elif re.match(r'^\d{4}-\d{2}-\d{2}$', part):
                values.append(f"'{part}'")
            # JSON object
            elif part.startswith('{') and ':' in part:
                escaped = part.replace("'", "''")
                values.append(f"N'{escaped}'")
            # String
            else:
                escaped = part.replace("'", "''")
                # Limit length for very long strings
                if len(escaped) > 4000:
                    escaped = escaped[:4000]
                values.append(f"N'{escaped}'")

        return values

    def skip_function(self, lines, start_idx, output):
        """Skip function definition"""
        output.append("-- PostgreSQL function omitted - implement as T-SQL procedure if needed")
        output.append("")

        i = start_idx
        while i < len(lines):
            if '$$;' in lines[i] or lines[i].strip().endswith(';'):
                return i + 1
            i += 1
        return i

    def skip_until_semicolon(self, lines, start_idx):
        """Skip lines until semicolon"""
        i = start_idx
        while i < len(lines):
            if ';' in lines[i]:
                return i + 1
            i += 1
        return i

def main():
    input_file = r'D:\VendorRegistrationForm\eomsdb_full.sql'
    output_file = r'D:\VendorRegistrationForm\eomsdb_full_MSSQL.sql'
    notes_file = r'D:\VendorRegistrationForm\CONVERSION_SUMMARY.md'

    print(f"Reading PostgreSQL dump: {input_file}")

    with open(input_file, 'r', encoding='utf-8') as f:
        pg_sql = f.read()

    print("Converting to MSSQL format...")
    converter = PostgresToMSSQLConverter()
    mssql_sql = converter.convert(pg_sql)

    print(f"Writing MSSQL script: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(mssql_sql)

    print(f"Writing conversion summary: {notes_file}")
    with open(notes_file, 'w', encoding='utf-8') as f:
        f.write("# PostgreSQL to MSSQL Conversion Summary\n\n")
        f.write("**Conversion Date:** 2025-12-25\n\n")
        f.write("## Overview\n\n")
        f.write("This document summarizes the conversion of the PostgreSQL database dump to Microsoft SQL Server T-SQL format.\n\n")

        f.write("## Tables Created\n\n")
        for table in converter.tables_created:
            f.write(f"- `{table}`\n")
        f.write(f"\n**Total Tables:** {len(converter.tables_created)}\n\n")

        f.write("## Major Conversion Changes\n\n")
        f.write("### 1. Data Type Conversions\n\n")
        f.write("| PostgreSQL | SQL Server |\n")
        f.write("|------------|------------|\n")
        f.write("| `character varying(n)` | `NVARCHAR(n)` |\n")
        f.write("| `character varying` | `NVARCHAR(MAX)` |\n")
        f.write("| `text` | `NVARCHAR(MAX)` |\n")
        f.write("| `timestamp without time zone` | `DATETIME2` |\n")
        f.write("| `timestamp with time zone` | `DATETIMEOFFSET` |\n")
        f.write("| `boolean` | `BIT` |\n")
        f.write("| `integer` | `INT` |\n")
        f.write("| `numeric` | `DECIMAL(18,2)` |\n")
        f.write("| `numeric(p,s)` | `DECIMAL(p,s)` |\n")
        f.write("| `jsonb` | `NVARCHAR(MAX)` |\n")
        f.write("| `json` | `NVARCHAR(MAX)` |\n")
        f.write("| `character varying[]` | `NVARCHAR(MAX)` (as JSON) |\n\n")

        f.write("### 2. Function Conversions\n\n")
        f.write("| PostgreSQL | SQL Server |\n")
        f.write("|------------|------------|\n")
        f.write("| `gen_random_uuid()` | `NEWID()` |\n")
        f.write("| `now()` | `GETDATE()` |\n")
        f.write("| `CURRENT_TIMESTAMP` | `CURRENT_TIMESTAMP` |\n\n")

        f.write("### 3. Boolean Value Conversions\n\n")
        f.write("| PostgreSQL | SQL Server |\n")
        f.write("|------------|------------|\n")
        f.write("| `true` | `1` |\n")
        f.write("| `false` | `0` |\n\n")

        f.write("### 4. Schema Changes\n\n")
        f.write("- Removed `public.` schema prefix\n")
        f.write("- Using `[dbo]` schema for all objects\n")
        f.write("- Added brackets `[]` around all identifiers\n")
        f.write("- Removed `OWNER TO postgres` statements\n\n")

        f.write("### 5. Index Changes\n\n")
        f.write("- Removed `CONCURRENTLY` keyword\n")
        f.write("- Converted `USING btree` to standard syntax\n")
        f.write("- Converted `USING gin` for array/JSON indexes\n\n")

        f.write("### 6. Trigger Changes\n\n")
        f.write("- Converted `BEFORE` triggers to `INSTEAD OF`\n")
        f.write("- Converted `AFTER` triggers to MSSQL `AFTER`\n")
        f.write("- Replaced function-based triggers with inline T-SQL\n\n")

        f.write("### 7. Sequence Handling\n\n")
        f.write("- PostgreSQL `SEQUENCE` objects noted for manual implementation\n")
        f.write("- Can use `IDENTITY(1,1)` columns or SQL Server `SEQUENCE` objects\n")
        f.write("- `empcode_seq` needs custom trigger or computed column\n\n")

        f.write("### 8. Array and JSON Handling\n\n")
        f.write("- PostgreSQL arrays converted to `NVARCHAR(MAX)` for JSON storage\n")
        f.write("- Array data converted to JSON array format\n")
        f.write("- Consider using SQL Server 2016+ JSON functions for querying\n\n")

        f.write("### 9. Comments\n\n")
        f.write("- `COMMENT ON COLUMN` → `sp_addextendedproperty` for columns\n")
        f.write("- `COMMENT ON TABLE` → `sp_addextendedproperty` for tables\n\n")

        f.write("## Conversion Notes\n\n")
        for i, note in enumerate(converter.conversion_notes, 1):
            f.write(f"{i}. {note}\n")
        f.write("\n")

        f.write("## Post-Conversion Tasks\n\n")
        f.write("### Critical\n\n")
        f.write("1. **Review and test all DEFAULT constraints**\n")
        f.write("   - Verify NEWID() defaults work correctly\n")
        f.write("   - Check date/time defaults\n")
        f.write("   - Validate numeric defaults\n\n")

        f.write("2. **Implement sequence for emp_code**\n")
        f.write("   - Create SEQUENCE object or use IDENTITY\n")
        f.write("   - Create trigger to generate emp_code format: 'EMP' + padded number\n\n")

        f.write("3. **Test all FOREIGN KEY relationships**\n")
        f.write("   - Verify CASCADE options work as expected\n")
        f.write("   - Test referential integrity\n\n")

        f.write("4. **Validate data integrity**\n")
        f.write("   - Check that all data was inserted correctly\n")
        f.write("   - Verify JSON data in array columns\n")
        f.write("   - Test date/time values\n\n")

        f.write("5. **Review and update triggers**\n")
        f.write("   - Test updated_at trigger functionality\n")
        f.write("   - Verify trigger logic matches application needs\n\n")

        f.write("### Recommended\n\n")
        f.write("1. **Add appropriate indexes**\n")
        f.write("   - Review execution plans\n")
        f.write("   - Add covering indexes as needed\n\n")

        f.write("2. **Configure collation if needed**\n")
        f.write("   - Default collation may differ from PostgreSQL\n")
        f.write("   - Consider case sensitivity requirements\n\n")

        f.write("3. **Optimize NVARCHAR(MAX) columns**\n")
        f.write("   - Consider fixed-size NVARCHAR where appropriate\n")
        f.write("   - May improve performance and reduce storage\n\n")

        f.write("4. **Test application compatibility**\n")
        f.write("   - Verify all queries work with SQL Server\n")
        f.write("   - Update any PostgreSQL-specific SQL\n")
        f.write("   - Test JSON querying if using array/jsonb columns\n\n")

        f.write("5. **Consider using proper JSON columns**\n")
        f.write("   - SQL Server 2016+ supports JSON functions\n")
        f.write("   - May want to validate JSON data with CHECK constraints\n\n")

        f.write("## Known Limitations\n\n")
        f.write("1. **Array columns** stored as JSON strings, not native arrays\n")
        f.write("2. **Sequence-based defaults** need manual implementation\n")
        f.write("3. **Complex functions** may need rewriting in T-SQL\n")
        f.write("4. **Some PostgreSQL-specific features** may not have direct equivalents\n\n")

        f.write("## Testing Recommendations\n\n")
        f.write("1. Run the script in a test environment first\n")
        f.write("2. Verify table structures match expectations\n")
        f.write("3. Test all constraints and foreign keys\n")
        f.write("4. Validate data integrity and completeness\n")
        f.write("5. Run application tests against new database\n")
        f.write("6. Performance test critical queries\n\n")

        f.write("## Support and Troubleshooting\n\n")
        f.write("If you encounter issues:\n\n")
        f.write("1. Check the conversion notes above for specific warnings\n")
        f.write("2. Review SQL Server error messages carefully\n")
        f.write("3. Verify data types are compatible with your application\n")
        f.write("4. Test incrementally - create tables, then add constraints, then insert data\n")
        f.write("5. Consider using SQL Server Migration Assistant (SSMA) for complex scenarios\n\n")

    print(f"\n✓ Conversion complete!")
    print(f"✓ Tables created: {len(converter.tables_created)}")
    print(f"✓ Conversion notes: {len(converter.conversion_notes)}")
    print(f"\nFiles generated:")
    print(f"  - {output_file}")
    print(f"  - {notes_file}")

if __name__ == '__main__':
    main()
