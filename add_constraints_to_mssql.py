#!/usr/bin/env python3
"""
Extract and convert PostgreSQL constraints to MSSQL
"""

import re

def extract_and_convert_constraints(pg_sql_file, mssql_sql_file, output_file):
    """Extract constraints from PostgreSQL and convert to MSSQL format"""

    print("Reading PostgreSQL file...")
    with open(pg_sql_file, 'r', encoding='utf-8') as f:
        pg_content = f.read()

    print("Reading existing MSSQL file...")
    with open(mssql_sql_file, 'r', encoding='utf-8') as f:
        mssql_content = f.read()

    # Find all ALTER TABLE...ADD CONSTRAINT statements
    constraint_pattern = r'ALTER TABLE ONLY public\.(\w+)\s+ADD CONSTRAINT (\w+) (PRIMARY KEY|UNIQUE|FOREIGN KEY|CHECK)\s*\(([^)]+)\)([^;]*);'

    constraints = []
    for match in re.finditer(constraint_pattern, pg_content, re.MULTILINE | re.DOTALL):
        table_name = match.group(1)
        constraint_name = match.group(2)
        constraint_type = match.group(3)
        columns = match.group(4)
        additional = match.group(5) if match.group(5) else ''

        # Convert to MSSQL
        mssql_constraint = f"-- Constraint: {constraint_name}\n"
        mssql_constraint += f"IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = '{constraint_name}')\n"
        mssql_constraint += f"BEGIN\n"
        mssql_constraint += f"    ALTER TABLE [dbo].[{table_name}]\n"

        if constraint_type == 'PRIMARY KEY':
            mssql_constraint += f"    ADD CONSTRAINT [{constraint_name}] PRIMARY KEY ([{columns.strip()}]);\n"
        elif constraint_type == 'UNIQUE':
            col_list = ', '.join([f'[{c.strip()}]' for c in columns.split(',')])
            mssql_constraint += f"    ADD CONSTRAINT [{constraint_name}] UNIQUE ({col_list});\n"
        elif constraint_type == 'FOREIGN KEY':
            # Extract REFERENCES part
            ref_match = re.search(r'REFERENCES\s+public\.(\w+)\s*\(([^)]+)\)([^;]*)', additional)
            if ref_match:
                ref_table = ref_match.group(1)
                ref_column = ref_match.group(2).strip()
                cascade = ref_match.group(3).strip()

                mssql_constraint += f"    ADD CONSTRAINT [{constraint_name}] FOREIGN KEY ([{columns.strip()}])\n"
                mssql_constraint += f"        REFERENCES [dbo].[{ref_table}]([{ref_column}])"

                if cascade:
                    mssql_constraint += f" {cascade};\n"
                else:
                    mssql_constraint += ";\n"
        elif constraint_type == 'CHECK':
            mssql_constraint += f"    ADD CONSTRAINT [{constraint_name}] CHECK ({columns.strip()});\n"

        mssql_constraint += "END\n"
        mssql_constraint += "GO\n\n"

        constraints.append(mssql_constraint)

    print(f"Found {len(constraints)} constraints")

    # Create constraints file
    constraints_sql = "-- =============================================\n"
    constraints_sql += "-- Add Constraints to MSSQL Database\n"
    constraints_sql += "-- Generated from PostgreSQL dump\n"
    constraints_sql += "-- =============================================\n\n"
    constraints_sql += "SET NOCOUNT ON;\n"
    constraints_sql += "GO\n\n"
    constraints_sql += "-- =============================================\n"
    constraints_sql += "-- PRIMARY KEY Constraints\n"
    constraints_sql += "-- =============================================\n\n"

    # Separate constraints by type
    pk_constraints = [c for c in constraints if 'PRIMARY KEY' in c]
    unique_constraints = [c for c in constraints if 'UNIQUE' in c and 'PRIMARY KEY' not in c]
    fk_constraints = [c for c in constraints if 'FOREIGN KEY' in c]
    check_constraints = [c for c in constraints if 'CHECK' in c]

    constraints_sql += ''.join(pk_constraints)

    constraints_sql += "\n-- =============================================\n"
    constraints_sql += "-- UNIQUE Constraints\n"
    constraints_sql += "-- =============================================\n\n"
    constraints_sql += ''.join(unique_constraints)

    constraints_sql += "\n-- =============================================\n"
    constraints_sql += "-- FOREIGN KEY Constraints\n"
    constraints_sql += "-- =============================================\n\n"
    constraints_sql += ''.join(fk_constraints)

    if check_constraints:
        constraints_sql += "\n-- =============================================\n"
        constraints_sql += "-- CHECK Constraints\n"
        constraints_sql += "-- =============================================\n\n"
        constraints_sql += ''.join(check_constraints)

    print(f"Writing constraints to: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(constraints_sql)

    # Also append to main MSSQL file
    print("Appending constraints to main MSSQL script...")
    with open(mssql_sql_file, 'a', encoding='utf-8') as f:
        f.write("\n\n")
        f.write("-- =============================================\n")
        f.write("-- CONSTRAINTS\n")
        f.write("-- =============================================\n\n")
        f.write(constraints_sql)

    print("Done!")
    print(f"  - Primary keys: {len(pk_constraints)}")
    print(f"  - Unique constraints: {len(unique_constraints)}")
    print(f"  - Foreign keys: {len(fk_constraints)}")
    print(f"  - Check constraints: {len(check_constraints)}")

if __name__ == '__main__':
    pg_file = r'D:\VendorRegistrationForm\eomsdb_full.sql'
    mssql_file = r'D:\VendorRegistrationForm\eomsdb_full_MSSQL.sql'
    output_file = r'D:\VendorRegistrationForm\eomsdb_CONSTRAINTS.sql'

    extract_and_convert_constraints(pg_file, mssql_file, output_file)
