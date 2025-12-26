#!/usr/bin/env python3
"""
PostgreSQL to MSSQL Conversion Script
Converts PostgreSQL dump to Microsoft SQL Server compatible format
"""

import re
import sys

def convert_pg_to_mssql(pg_sql):
    """
    Convert PostgreSQL SQL to MSSQL T-SQL
    """
    mssql = []
    conversion_notes = []

    # Add MSSQL header
    mssql.append("-- =============================================")
    mssql.append("-- Microsoft SQL Server Database Script")
    mssql.append("-- Converted from PostgreSQL dump")
    mssql.append("-- Conversion Date: " + "2025-12-25")
    mssql.append("-- =============================================")
    mssql.append("")
    mssql.append("-- Set MSSQL options")
    mssql.append("SET NOCOUNT ON;")
    mssql.append("SET ANSI_NULLS ON;")
    mssql.append("SET QUOTED_IDENTIFIER ON;")
    mssql.append("GO")
    mssql.append("")

    lines = pg_sql.split('\n')
    i = 0
    in_function = False
    in_table = False
    in_copy = False
    in_alter_table = False
    in_index = False
    table_name = ""
    columns = []
    copy_columns = []
    copy_data = []
    function_buffer = []

    while i < len(lines):
        line = lines[i].rstrip()
        original_line = line

        # Skip PostgreSQL-specific SET commands
        if (line.startswith('SET statement_timeout') or
            line.startswith('SET lock_timeout') or
            line.startswith('SET idle_in_transaction_session_timeout') or
            line.startswith('SET client_encoding') or
            line.startswith('SET standard_conforming_strings') or
            line.startswith('SELECT pg_catalog.set_config') or
            line.startswith('SET check_function_bodies') or
            line.startswith('SET xmloption') or
            line.startswith('SET client_min_messages') or
            line.startswith('SET row_security') or
            line.startswith('SET default_tablespace') or
            line.startswith('SET default_table_access_method') or
            line.startswith('ALTER TABLE') and 'OWNER TO postgres' in line or
            line.startswith('ALTER FUNCTION') and 'OWNER TO postgres' in line or
            line.startswith('ALTER SEQUENCE') and 'OWNER TO postgres' in line):
            i += 1
            continue

        # Skip comments about owners
        if 'Owner: postgres' in line:
            i += 1
            continue

        # Handle COMMENT ON statements
        if line.startswith('COMMENT ON'):
            # Convert to MSSQL extended properties
            comment_match = re.search(r"COMMENT ON (\w+) (\S+)\.(\S+)\.(\S+) IS '(.+)';", line)
            if comment_match:
                obj_type = comment_match.group(1)
                schema = comment_match.group(2)
                table = comment_match.group(3)
                column = comment_match.group(4)
                comment = comment_match.group(5)

                if obj_type == 'COLUMN':
                    mssql.append(f"EXEC sp_addextendedproperty ")
                    mssql.append(f"    @name = N'MS_Description',")
                    mssql.append(f"    @value = N'{comment}',")
                    mssql.append(f"    @level0type = N'SCHEMA', @level0name = N'dbo',")
                    mssql.append(f"    @level1type = N'TABLE', @level1name = N'{table}',")
                    mssql.append(f"    @level2type = N'COLUMN', @level2name = N'{column}';")
                    mssql.append("GO")
                    mssql.append("")

            table_comment_match = re.search(r"COMMENT ON TABLE (\S+)\.(\S+) IS '(.+)';", line)
            if table_comment_match:
                schema = table_comment_match.group(1)
                table = table_comment_match.group(2)
                comment = table_comment_match.group(3)

                mssql.append(f"EXEC sp_addextendedproperty ")
                mssql.append(f"    @name = N'MS_Description',")
                mssql.append(f"    @value = N'{comment}',")
                mssql.append(f"    @level0type = N'SCHEMA', @level0name = N'dbo',")
                mssql.append(f"    @level1type = N'TABLE', @level1name = N'{table}';")
                mssql.append("GO")
                mssql.append("")

            i += 1
            continue

        # Handle CREATE FUNCTION - Convert to CREATE PROCEDURE for triggers
        if 'CREATE FUNCTION' in line and 'RETURNS trigger' in line:
            in_function = True
            function_buffer = []
            function_name = re.search(r'CREATE FUNCTION (\S+)\(\)', line)
            if function_name:
                func_name = function_name.group(1).replace('public.', '')
                conversion_notes.append(f"Function {func_name} converted to trigger logic")
            i += 1
            continue

        if in_function:
            if '$$;' in line:
                in_function = False
                # We'll handle trigger creation inline with CREATE TRIGGER
            i += 1
            continue

        # Handle CREATE SEQUENCE
        if 'CREATE SEQUENCE' in line:
            seq_name = re.search(r'CREATE SEQUENCE (\S+)', line)
            if seq_name:
                seq_name_clean = seq_name.group(1).replace('public.', '')
                mssql.append(f"-- Sequence {seq_name_clean} will be replaced with IDENTITY columns")
                mssql.append(f"-- CREATE SEQUENCE {seq_name_clean}")
                conversion_notes.append(f"Sequence {seq_name_clean} converted to IDENTITY in table column")
            # Skip the sequence definition
            while i < len(lines) and ';' not in lines[i]:
                i += 1
            i += 1
            continue

        # Handle CREATE TABLE
        if line.startswith('CREATE TABLE'):
            in_table = True
            table_match = re.search(r'CREATE TABLE (\S+) \(', line)
            if table_match:
                table_name = table_match.group(1).replace('public.', '')
                mssql.append(f"-- Table: {table_name}")
                mssql.append(f"CREATE TABLE [dbo].[{table_name}] (")
                columns = []
                conversion_notes.append(f"Table {table_name} created")
            i += 1
            continue

        if in_table:
            if line.strip() == ');':
                # End of table definition
                mssql.append("    " + ",\n    ".join(columns))
                mssql.append(");")
                mssql.append("GO")
                mssql.append("")
                in_table = False
                i += 1
                continue

            # Parse column definition
            col_line = line.strip()
            if col_line and not col_line.startswith('--'):
                # Remove trailing comma
                if col_line.endswith(','):
                    col_line = col_line[:-1]

                # Convert data types
                # gen_random_uuid() -> NEWID()
                col_line = re.sub(r'DEFAULT gen_random_uuid\(\)', 'DEFAULT NEWID()', col_line)
                col_line = re.sub(r'DEFAULT \(gen_random_uuid\(\)\)::text', 'DEFAULT NEWID()', col_line)

                # character varying -> NVARCHAR
                col_line = re.sub(r'character varying\((\d+)\)', r'NVARCHAR(\1)', col_line)
                col_line = re.sub(r'character varying', 'NVARCHAR(MAX)', col_line)

                # text -> NVARCHAR(MAX)
                col_line = re.sub(r'\btext\b', 'NVARCHAR(MAX)', col_line)

                # timestamp without time zone -> DATETIME2
                col_line = re.sub(r'timestamp without time zone', 'DATETIME2', col_line)

                # timestamp with time zone -> DATETIMEOFFSET
                col_line = re.sub(r'timestamp with time zone', 'DATETIMEOFFSET', col_line)

                # now() -> GETDATE()
                col_line = re.sub(r'DEFAULT now\(\)', 'DEFAULT GETDATE()', col_line)

                # CURRENT_TIMESTAMP is same
                # DEFAULT CURRENT_TIMESTAMP stays the same

                # numeric -> DECIMAL
                col_line = re.sub(r'\bnumeric\((\d+),(\d+)\)', r'DECIMAL(\1,\2)', col_line)
                col_line = re.sub(r'\bnumeric\b', 'DECIMAL(18,2)', col_line)

                # boolean -> BIT
                col_line = re.sub(r'\bboolean\b', 'BIT', col_line)

                # Arrays: character varying[] -> NVARCHAR(MAX) (will store as JSON)
                col_line = re.sub(r'character varying\[\]', 'NVARCHAR(MAX)', col_line)
                col_line = re.sub(r"DEFAULT ARRAY\[\]::character varying\[\]", "DEFAULT '[]'", col_line)

                # jsonb -> NVARCHAR(MAX)
                col_line = re.sub(r'\bjsonb\b', 'NVARCHAR(MAX)', col_line)

                # json -> NVARCHAR(MAX)
                col_line = re.sub(r'\bjson\b', 'NVARCHAR(MAX)', col_line)

                # Handle sequence-based defaults for emp_code
                if 'nextval' in col_line:
                    # This is emp_code with sequence
                    # We'll handle this differently - use computed column or remove default
                    col_line = re.sub(r"DEFAULT \('EMP'::text \|\| lpad\(\(nextval\('public\.empcode_seq'::regclass\)\)::text, 5, '0'::text\)\)", '', col_line)
                    conversion_notes.append("emp_code sequence default removed - needs manual trigger or default constraint")

                # Handle type casts
                col_line = re.sub(r"'(\w+)'::character varying", r"'\1'", col_line)
                col_line = re.sub(r"'(\d+)'::numeric", r"'\1'", col_line)
                col_line = re.sub(r"::text", "", col_line)

                columns.append(col_line)

            i += 1
            continue

        # Handle COPY data (PostgreSQL bulk insert)
        if line.startswith('COPY '):
            in_copy = True
            copy_match = re.search(r'COPY (\S+) \(([^)]+)\) FROM stdin;', line)
            if copy_match:
                table_name = copy_match.group(1).replace('public.', '')
                copy_columns = [col.strip() for col in copy_match.group(2).split(',')]
                copy_data = []
                mssql.append(f"-- Data for table: {table_name}")
                mssql.append(f"SET IDENTITY_INSERT [dbo].[{table_name}] ON;")
                mssql.append("GO")
            i += 1
            continue

        if in_copy:
            if line == '\\.':
                # End of COPY data
                in_copy = False

                # Write INSERT statements
                for data_line in copy_data:
                    if data_line.strip():
                        values = parse_copy_line(data_line)
                        if values:
                            cols_str = ', '.join([f'[{col}]' for col in copy_columns])
                            vals_str = ', '.join(values)
                            mssql.append(f"INSERT INTO [dbo].[{table_name}] ({cols_str})")
                            mssql.append(f"VALUES ({vals_str});")

                mssql.append("GO")
                mssql.append(f"SET IDENTITY_INSERT [dbo].[{table_name}] OFF;")
                mssql.append("GO")
                mssql.append("")
                copy_data = []
                i += 1
                continue
            else:
                copy_data.append(line)
                i += 1
                continue

        # Handle ALTER TABLE ADD CONSTRAINT
        if line.startswith('ALTER TABLE') and 'ADD CONSTRAINT' in line:
            # Convert table and constraint names
            line = re.sub(r'ALTER TABLE ONLY public\.(\w+)', r'ALTER TABLE [dbo].[\1]', line)
            line = re.sub(r'public\.(\w+)', r'[dbo].[\1]', line)

            # Handle PRIMARY KEY
            if 'PRIMARY KEY' in line:
                line = re.sub(r'ADD CONSTRAINT (\w+) PRIMARY KEY \(([^)]+)\)',
                             lambda m: f'ADD CONSTRAINT [{m.group(1)}] PRIMARY KEY ([{m.group(2)}])', line)

            # Handle UNIQUE
            if 'UNIQUE' in line:
                line = re.sub(r'ADD CONSTRAINT (\w+) UNIQUE \(([^)]+)\)',
                             lambda m: f'ADD CONSTRAINT [{m.group(1)}] UNIQUE ([{m.group(2)}])', line)

            mssql.append(line)
            mssql.append("GO")
            mssql.append("")
            i += 1
            continue

        # Handle FOREIGN KEY constraints
        if 'FOREIGN KEY' in line:
            line = re.sub(r'public\.(\w+)', r'[dbo].[\1]', line)
            line = re.sub(r'REFERENCES (\w+)\((\w+)\)', r'REFERENCES [dbo].[\1]([\2])', line)
            mssql.append(line)
            if not line.strip().endswith(';'):
                i += 1
                continue
            mssql.append("GO")
            mssql.append("")
            i += 1
            continue

        # Handle CREATE INDEX
        if line.startswith('CREATE'):
            if 'INDEX' in line:
                # Remove CONCURRENTLY
                line = re.sub(r'CREATE INDEX CONCURRENTLY', 'CREATE INDEX', line)
                line = re.sub(r'CREATE UNIQUE INDEX CONCURRENTLY', 'CREATE UNIQUE INDEX', line)

                # Convert schema and table names
                line = re.sub(r'ON public\.(\w+)', r'ON [dbo].[\1]', line)

                # Convert index method (USING btree -> just column list)
                line = re.sub(r'USING btree \(([^)]+)\)', r'(\1)', line)
                line = re.sub(r'USING gin \(([^)]+)\)', r'(\1)', line)

                # Add brackets to column names
                line = re.sub(r'\((\w+)\)', r'([\1])', line)
                line = re.sub(r'\((\w+), (\w+)\)', r'([\1], [\2])', line)
                line = re.sub(r'\((\w+), (\w+), (\w+)\)', r'([\1], [\2], [\3])', line)

                mssql.append(line)
                mssql.append("GO")
                mssql.append("")
                i += 1
                continue

        # Handle CREATE TRIGGER
        if line.startswith('CREATE TRIGGER'):
            # Convert trigger to MSSQL syntax
            trigger_match = re.search(r'CREATE TRIGGER (\S+) (BEFORE|AFTER) (\w+) ON public\.(\w+)', line)
            if trigger_match:
                trigger_name = trigger_match.group(1)
                timing = trigger_match.group(2)
                event = trigger_match.group(3)
                table = trigger_match.group(4)

                mssql.append(f"-- Trigger: {trigger_name}")
                mssql.append(f"CREATE TRIGGER [{trigger_name}]")
                mssql.append(f"ON [dbo].[{table}]")

                # MSSQL uses AFTER or INSTEAD OF
                if timing == 'BEFORE':
                    mssql.append(f"INSTEAD OF {event}")
                else:
                    mssql.append(f"AFTER {event}")

                mssql.append("AS")
                mssql.append("BEGIN")
                mssql.append("    SET NOCOUNT ON;")

                # For update_updated_at triggers
                if 'updated_at' in trigger_name:
                    mssql.append("    UPDATE t")
                    mssql.append(f"    SET t.updated_at = GETDATE()")
                    mssql.append(f"    FROM [dbo].[{table}] t")
                    mssql.append("    INNER JOIN inserted i ON t.id = i.id;")

                mssql.append("END;")
                mssql.append("GO")
                mssql.append("")
                conversion_notes.append(f"Trigger {trigger_name} converted to MSSQL syntax")

            # Skip to end of trigger definition
            while i < len(lines) and 'EXECUTE FUNCTION' not in lines[i]:
                i += 1
            i += 1
            continue

        # Handle other lines (keep comments, blank lines)
        if line.startswith('--') or line.strip() == '':
            mssql.append(line)

        i += 1

    return '\n'.join(mssql), conversion_notes

def parse_copy_line(line):
    """
    Parse PostgreSQL COPY data line into SQL INSERT values
    """
    # Split by tabs
    parts = line.split('\t')
    values = []

    for part in parts:
        part = part.strip()

        # Handle NULL
        if part == '\\N':
            values.append('NULL')
        # Handle booleans
        elif part == 't':
            values.append('1')
        elif part == 'f':
            values.append('0')
        # Handle numbers (integers and decimals)
        elif re.match(r'^-?\d+(\.\d+)?$', part):
            values.append(part)
        # Handle arrays (convert to JSON string)
        elif part.startswith('{') and part.endswith('}'):
            # Convert PostgreSQL array to JSON array
            array_content = part[1:-1]  # Remove braces
            if array_content:
                # Simple conversion - may need enhancement for complex arrays
                json_array = '["' + '","'.join(array_content.split(',')) + '"]'
                values.append(f"N'{json_array}'")
            else:
                values.append("N'[]'")
        # Handle dates (YYYY-MM-DD)
        elif re.match(r'^\d{4}-\d{2}-\d{2}$', part):
            values.append(f"'{part}'")
        # Handle empty strings
        elif part == '':
            values.append("NULL")
        # Handle regular strings
        else:
            # Escape single quotes
            part = part.replace("'", "''")
            values.append(f"N'{part}'")

    return values

# Main execution
if __name__ == '__main__':
    input_file = r'D:\VendorRegistrationForm\eomsdb_full.sql'
    output_file = r'D:\VendorRegistrationForm\eomsdb_full_MSSQL.sql'
    notes_file = r'D:\VendorRegistrationForm\CONVERSION_NOTES.md'

    print(f"Reading PostgreSQL dump from: {input_file}")

    with open(input_file, 'r', encoding='utf-8') as f:
        pg_sql = f.read()

    print("Converting to MSSQL format...")
    mssql_sql, notes = convert_pg_to_mssql(pg_sql)

    print(f"Writing MSSQL script to: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(mssql_sql)

    print(f"Writing conversion notes to: {notes_file}")
    with open(notes_file, 'w', encoding='utf-8') as f:
        f.write("# PostgreSQL to MSSQL Conversion Notes\n\n")
        f.write("## Conversion Date\n")
        f.write("2025-12-25\n\n")
        f.write("## Key Changes Made\n\n")
        f.write("### Data Type Conversions\n")
        f.write("- `character varying` → `NVARCHAR`\n")
        f.write("- `text` → `NVARCHAR(MAX)`\n")
        f.write("- `timestamp without time zone` → `DATETIME2`\n")
        f.write("- `timestamp with time zone` → `DATETIMEOFFSET`\n")
        f.write("- `boolean` → `BIT`\n")
        f.write("- `numeric` → `DECIMAL`\n")
        f.write("- `jsonb` → `NVARCHAR(MAX)`\n")
        f.write("- `character varying[]` → `NVARCHAR(MAX)` (stored as JSON)\n\n")
        f.write("### Function Conversions\n")
        f.write("- `gen_random_uuid()` → `NEWID()`\n")
        f.write("- `now()` → `GETDATE()`\n")
        f.write("- `CURRENT_TIMESTAMP` → `GETDATE()` (kept as-is, compatible)\n\n")
        f.write("### Schema Changes\n")
        f.write("- Removed `public.` schema prefix, using `[dbo]`\n")
        f.write("- Added brackets `[]` around identifiers\n")
        f.write("- Removed `OWNER TO postgres` statements\n\n")
        f.write("### Index Changes\n")
        f.write("- Removed `CONCURRENTLY` keyword from CREATE INDEX\n")
        f.write("- Converted `USING btree` to standard index syntax\n")
        f.write("- Converted `USING gin` for array indexes\n\n")
        f.write("### Trigger Changes\n")
        f.write("- Converted `BEFORE UPDATE` triggers to `INSTEAD OF UPDATE`\n")
        f.write("- Converted PostgreSQL function-based triggers to inline T-SQL\n\n")
        f.write("### Sequence Changes\n")
        f.write("- `empcode_seq` sequence will need to be implemented using IDENTITY or computed column\n")
        f.write("- Alternative: Use SEQUENCE object in SQL Server 2012+\n\n")
        f.write("### Comment Conversions\n")
        f.write("- `COMMENT ON` statements converted to `sp_addextendedproperty`\n\n")
        f.write("## Items Requiring Manual Review\n\n")
        for note in notes:
            f.write(f"- {note}\n")
        f.write("\n## Additional Notes\n\n")
        f.write("- Array columns have been converted to NVARCHAR(MAX) for JSON storage\n")
        f.write("- You may want to use proper JSON columns in SQL Server 2016+\n")
        f.write("- Review all DEFAULT constraints for correctness\n")
        f.write("- Test all foreign key relationships\n")
        f.write("- Verify date/time data compatibility\n")
        f.write("- Check numeric precision and scale values\n")

    print("\nConversion complete!")
    print(f"Total conversion notes: {len(notes)}")
