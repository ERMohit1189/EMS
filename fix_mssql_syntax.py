#!/usr/bin/env python3
"""
Fix remaining PostgreSQL syntax in MSSQL conversion
"""

import re

def fix_mssql_syntax(sql_content):
    """Fix remaining PostgreSQL syntax issues"""

    fixes_applied = []

    # Fix emp_code with sequence - remove the entire default
    old_pattern = r"\[emp_code\] NVARCHAR\(16\) DEFAULT \('EMP' \|\| lpad\(\(nextval\('public\.empcode_seq'::regclass\)\)::NVARCHAR\(MAX\), 5, '0'\)\),"
    new_pattern = r"[emp_code] NVARCHAR(16) NULL,  -- TODO: Implement sequence trigger"
    if re.search(old_pattern, sql_content):
        sql_content = re.sub(old_pattern, new_pattern, sql_content)
        fixes_applied.append("Fixed emp_code sequence default")

    # Fix array syntax like: NVARCHAR(MAX)[] DEFAULT ARRAY[]::NVARCHAR(MAX)[]
    old_array = r"NVARCHAR\(MAX\)\[\] DEFAULT ARRAY\[\]::NVARCHAR\(MAX\)\[\]"
    new_array = r"NVARCHAR(MAX) DEFAULT '[]'"
    if re.search(old_array, sql_content):
        sql_content = re.sub(old_array, new_array, sql_content)
        fixes_applied.append("Fixed array syntax")

    # Fix type casts like '0'::DECIMAL(18,2)
    old_cast = r"'(\d+)'::DECIMAL\((\d+),(\d+)\)"
    new_cast = r"\1"
    if re.search(old_cast, sql_content):
        sql_content = re.sub(old_cast, new_cast, sql_content)
        fixes_applied.append("Fixed DECIMAL type casts")

    # Fix empty string cast like ''::NVARCHAR(MAX)
    old_empty_cast = r"''::NVARCHAR\(MAX\)"
    new_empty_cast = r"''"
    if re.search(old_empty_cast, sql_content):
        sql_content = re.sub(old_empty_cast, new_empty_cast, sql_content)
        fixes_applied.append("Fixed empty string casts")

    # Fix || operator (PostgreSQL concat) to +
    # Be careful to only fix in DEFAULT clauses
    sql_content = re.sub(r"DEFAULT \('EMP' \|\|", r"DEFAULT ('EMP' +", sql_content)

    # Fix remaining :: casts
    sql_content = re.sub(r"::regclass", "", sql_content)
    sql_content = re.sub(r"::NVARCHAR\(MAX\)", "", sql_content)
    sql_content = re.sub(r"::NVARCHAR\([^)]+\)", "", sql_content)

    return sql_content, fixes_applied

def main():
    input_file = r'D:\VendorRegistrationForm\eomsdb_full_MSSQL.sql'
    output_file = r'D:\VendorRegistrationForm\eomsdb_full_MSSQL.sql'

    print("Reading MSSQL script...")
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    print("Applying syntax fixes...")
    fixed_content, fixes = fix_mssql_syntax(content)

    print("Writing corrected script...")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(fixed_content)

    print("\nFixes applied:")
    for fix in fixes:
        print(f"  - {fix}")

    print("\nDone!")

if __name__ == '__main__':
    main()
