#!/usr/bin/env python3
"""
MSSQL Script Fixer
Fixes common issues in PostgreSQL to MSSQL conversion scripts
"""

import re
import sys

def fix_mssql_script(input_file, output_file):
    """Fix MSSQL script with all critical issues"""

    print(f"Reading {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    original_size = len(content)
    print(f"Original file size: {original_size:,} bytes")

    # Track changes
    changes = []

    # Fix 1: Remove all SET IDENTITY_INSERT statements
    print("\n[1/7] Removing SET IDENTITY_INSERT statements...")
    before = content
    content = re.sub(r'^SET IDENTITY_INSERT.*?;?\s*$', '', content, flags=re.MULTILINE)
    content = re.sub(r'^GO\s*$\n^GO\s*$', 'GO', content, flags=re.MULTILINE)
    removed_identity = before.count('SET IDENTITY_INSERT') - content.count('SET IDENTITY_INSERT')
    changes.append(f"Removed {removed_identity} SET IDENTITY_INSERT statements")
    print(f"  [OK] Removed {removed_identity} statements")

    # Fix 2: Change NVARCHAR(MAX) DEFAULT NEWID() to VARCHAR(36) DEFAULT NEWID() for UUID columns
    print("\n[2/7] Fixing UUID columns (NVARCHAR(MAX) -> VARCHAR(36))...")
    uuid_pattern = r'\[id\]\s+NVARCHAR\(MAX\)\s+DEFAULT\s+NEWID\(\)(\s+NOT\s+NULL)?'
    uuid_matches = len(re.findall(uuid_pattern, content, re.IGNORECASE))
    content = re.sub(
        uuid_pattern,
        r'[id] VARCHAR(36) DEFAULT NEWID() NOT NULL',
        content,
        flags=re.IGNORECASE
    )

    # Also fix NVARCHAR(36) to VARCHAR(36) for id columns (some were already partially fixed)
    uuid_pattern2 = r'\[id\]\s+NVARCHAR\(36\)\s+DEFAULT\s+NEWID\(\)(\s+NOT\s+NULL)?'
    uuid_matches2 = len(re.findall(uuid_pattern2, content, re.IGNORECASE))
    content = re.sub(
        uuid_pattern2,
        r'[id] VARCHAR(36) DEFAULT NEWID() NOT NULL',
        content,
        flags=re.IGNORECASE
    )

    total_uuid_fixes = uuid_matches + uuid_matches2
    changes.append(f"Fixed {total_uuid_fixes} id columns to VARCHAR(36)")
    print(f"  [OK] Fixed {total_uuid_fixes} id columns")

    # Fix 3: Fix other UUID foreign key columns
    print("\n[3/7] Fixing UUID foreign key columns...")
    fk_columns = [
        'employee_id', 'vendor_id', 'po_id', 'site_id', 'team_id',
        'department_id', 'designation_id', 'approved_by', 'applied_by',
        'generated_by', 'locked_by', 'performed_by', 'allotment_id',
        'plan_id', 'zone_id', 'vendor_id', 'reporting_person_1',
        'reporting_person_2', 'reporting_person_3'
    ]

    fk_fixes = 0
    for col in fk_columns:
        # Fix NVARCHAR(MAX) -> VARCHAR(36)
        pattern = rf'\[{col}\]\s+NVARCHAR\(MAX\)(\s+NOT\s+NULL)?'
        matches = len(re.findall(pattern, content, re.IGNORECASE))
        if matches > 0:
            content = re.sub(
                pattern,
                rf'[{col}] VARCHAR(36)\1',
                content,
                flags=re.IGNORECASE
            )
            fk_fixes += matches

        # Fix NVARCHAR(36) -> VARCHAR(36) for already partially fixed columns
        pattern2 = rf'\[{col}\]\s+NVARCHAR\(36\)(\s+NOT\s+NULL)?'
        matches2 = len(re.findall(pattern2, content, re.IGNORECASE))
        if matches2 > 0:
            content = re.sub(
                pattern2,
                rf'[{col}] VARCHAR(36)\1',
                content,
                flags=re.IGNORECASE
            )
            fk_fixes += matches2

    changes.append(f"Fixed {fk_fixes} foreign key UUID columns to VARCHAR(36)")
    print(f"  [OK] Fixed {fk_fixes} foreign key columns")

    # Fix 4: Fix optional columns to allow NULL (remove NOT NULL from specific columns)
    print("\n[4/7] Fixing optional columns to allow NULL...")
    optional_columns = {
        'mobile': r'\[mobile\]\s+NVARCHAR\(MAX\)\s+NOT\s+NULL',
        'city': r'\[city\]\s+NVARCHAR\(MAX\)\s+NOT\s+NULL',
        'pincode': r'\[pincode\]\s+NVARCHAR\(MAX\)\s+DEFAULT\s+\'\'?\s+NOT\s+NULL',
        'description': r'\[description\]\s+NVARCHAR\(MAX\)\s+NOT\s+NULL',
    }

    null_fixes = 0
    for col, pattern in optional_columns.items():
        matches = len(re.findall(pattern, content, re.IGNORECASE))
        if matches > 0:
            if col == 'pincode':
                content = re.sub(pattern, r'[pincode] NVARCHAR(20) NULL', content, flags=re.IGNORECASE)
            elif col == 'mobile':
                content = re.sub(pattern, r'[mobile] NVARCHAR(20) NULL', content, flags=re.IGNORECASE)
            elif col == 'city':
                content = re.sub(pattern, r'[city] NVARCHAR(255) NULL', content, flags=re.IGNORECASE)
            else:
                content = re.sub(pattern, rf'[{col}] NVARCHAR(MAX) NULL', content, flags=re.IGNORECASE)
            null_fixes += matches

    changes.append(f"Made {null_fixes} optional columns nullable")
    print(f"  [OK] Made {null_fixes} columns nullable")

    # Fix 5: Remove problematic indexes on NVARCHAR(MAX) columns
    print("\n[5/7] Removing indexes on NVARCHAR(MAX) columns...")
    problematic_indexes = [
        r'CREATE\s+INDEX\s+\[idx_invoice_po_ids\].*?;',
        r'CREATE\s+INDEX\s+\[idx_approval_status\].*?;',
        r'CREATE\s+INDEX\s+\[idx_employees_email\].*?;',
        r'CREATE\s+INDEX\s+\[idx_employees_status\].*?;',
        r'CREATE\s+INDEX\s+\[idx_invoice_status\].*?;',
        r'CREATE\s+INDEX\s+\[idx_invoice_vendor\].*?;',
        r'CREATE\s+INDEX\s+\[idx_leave_requests_status\].*?;',
        r'CREATE\s+INDEX\s+\[idx_po_status\].*?;',
        r'CREATE\s+INDEX\s+\[idx_po_vendor\].*?;',
        r'CREATE\s+INDEX\s+\[idx_sites_status\].*?;',
        r'CREATE\s+INDEX\s+\[idx_sites_vendor\].*?;',
        r'CREATE\s+INDEX\s+\[idx_vendors_status\].*?;',
    ]

    index_fixes = 0
    for pattern in problematic_indexes:
        matches = len(re.findall(pattern, content, re.IGNORECASE | re.DOTALL))
        if matches > 0:
            content = re.sub(pattern, '-- Index removed: Cannot index NVARCHAR(MAX) column', content, flags=re.IGNORECASE | re.DOTALL)
            index_fixes += matches

    changes.append(f"Removed/commented {index_fixes} problematic indexes")
    print(f"  [OK] Removed {index_fixes} problematic indexes")

    # Fix 6: Fix status and other text columns that should be VARCHAR for indexing
    print("\n[6/7] Fixing indexed text columns (NVARCHAR(MAX) -> NVARCHAR(50))...")
    indexed_text_columns = {
        'status': r'\[status\]\s+NVARCHAR\(MAX\)\s+DEFAULT\s+\'([^\']+)\'\s+NOT\s+NULL',
        'approval_status': r'\[approval_status\]\s+NVARCHAR\(MAX\)\s+DEFAULT\s+\'([^\']+)\'',
        'paid_status': r'\[paid_status\]\s+NVARCHAR\(50\)',  # Already correct
    }

    text_fixes = 0
    # Fix status columns
    status_pattern = r'\[status\]\s+NVARCHAR\(MAX\)\s+DEFAULT\s+\'([^\']+)\'\s+NOT\s+NULL'
    matches = len(re.findall(status_pattern, content, re.IGNORECASE))
    if matches > 0:
        content = re.sub(
            status_pattern,
            r"[status] NVARCHAR(50) DEFAULT '\1' NOT NULL",
            content,
            flags=re.IGNORECASE
        )
        text_fixes += matches

    # Fix approval_status
    approval_pattern = r'\[approval_status\]\s+NVARCHAR\(MAX\)\s+DEFAULT\s+\'([^\']+)\''
    matches = len(re.findall(approval_pattern, content, re.IGNORECASE))
    if matches > 0:
        content = re.sub(
            approval_pattern,
            r"[approval_status] NVARCHAR(50) DEFAULT '\1'",
            content,
            flags=re.IGNORECASE
        )
        text_fixes += matches

    changes.append(f"Fixed {text_fixes} indexed text columns to NVARCHAR(50)")
    print(f"  [OK] Fixed {text_fixes} text columns")

    # Fix 7: Re-add proper indexes for fixed columns
    print("\n[7/7] Re-adding indexes for fixed columns...")
    index_section = content.find('-- ========================================')
    if index_section != -1:
        # Find the index section
        index_start = content.find('CREATE INDEX', index_section)
        if index_start != -1:
            # Add comment about re-added indexes
            new_indexes = """
-- ========================================
-- Re-added indexes for fixed columns
-- ========================================
CREATE INDEX [idx_approval_status] ON [dbo].[daily_allowances] ([approval_status]);
GO

CREATE INDEX [idx_employees_email] ON [dbo].[employees] ([email]);
GO

CREATE INDEX [idx_employees_status] ON [dbo].[employees] ([status]);
GO

CREATE INDEX [idx_invoice_status] ON [dbo].[invoices] ([status]);
GO

CREATE INDEX [idx_invoice_vendor] ON [dbo].[invoices] ([vendor_id]);
GO

CREATE INDEX [idx_leave_requests_status] ON [dbo].[leave_requests] ([status]);
GO

CREATE INDEX [idx_po_status] ON [dbo].[purchase_orders] ([status]);
GO

CREATE INDEX [idx_po_vendor] ON [dbo].[purchase_orders] ([vendor_id]);
GO

CREATE INDEX [idx_sites_status] ON [dbo].[sites] ([status]);
GO

CREATE INDEX [idx_sites_vendor] ON [dbo].[sites] ([vendor_id]);
GO

CREATE INDEX [idx_vendors_status] ON [dbo].[vendors] ([status]);
GO

"""
            # Find end of file or appropriate place to add
            end_marker = content.rfind('GO')
            if end_marker != -1:
                content = content[:end_marker+2] + '\n' + new_indexes + content[end_marker+2:]
                changes.append("Re-added 11 indexes for fixed columns")
                print(f"  [OK] Re-added 11 indexes")

    # Fix email columns to be VARCHAR for indexing
    print("\n[BONUS] Fixing email columns...")
    email_pattern = r'\[email\]\s+NVARCHAR\(MAX\)\s+DEFAULT\s+\'([^\']+)\'\s+NOT\s+NULL'
    matches = len(re.findall(email_pattern, content, re.IGNORECASE))
    if matches > 0:
        content = re.sub(
            email_pattern,
            r"[email] NVARCHAR(255) DEFAULT '\1' NOT NULL",
            content,
            flags=re.IGNORECASE
        )
        print(f"  [OK] Fixed {matches} email columns to NVARCHAR(255)")

    # Fix email without default
    email_pattern2 = r'\[email\]\s+NVARCHAR\(MAX\)\s+NOT\s+NULL'
    matches2 = len(re.findall(email_pattern2, content, re.IGNORECASE))
    if matches2 > 0:
        content = re.sub(
            email_pattern2,
            r"[email] NVARCHAR(255) NOT NULL",
            content,
            flags=re.IGNORECASE
        )
        print(f"  [OK] Fixed {matches2} more email columns")

    # Fix vendor_code and other code columns
    print("\n[BONUS] Fixing code columns...")
    code_fixes = 0
    code_pattern = r'\[vendor_code\]\s+NVARCHAR\(255\)'
    # Already correct, just count
    matches = len(re.findall(code_pattern, content, re.IGNORECASE))
    print(f"  [OK] vendor_code already correct ({matches} instances)")

    # Fix partner_code
    partner_pattern = r'\[partner_code\]\s+NVARCHAR\(MAX\)'
    matches = len(re.findall(partner_pattern, content, re.IGNORECASE))
    if matches > 0:
        content = re.sub(partner_pattern, '[partner_code] NVARCHAR(255)', content, flags=re.IGNORECASE)
        print(f"  [OK] Fixed {matches} partner_code columns")

    # Clean up multiple consecutive GO statements
    content = re.sub(r'(GO\s*\n)+', 'GO\n', content, flags=re.MULTILINE)

    # Write output
    print(f"\nWriting fixed script to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)

    final_size = len(content)
    print(f"Final file size: {final_size:,} bytes")
    print(f"Size change: {final_size - original_size:+,} bytes")

    print("\n" + "="*60)
    print("SUMMARY OF CHANGES:")
    print("="*60)
    for i, change in enumerate(changes, 1):
        print(f"{i}. {change}")

    print("\n" + "="*60)
    print("[SUCCESS] MSSQL script fixed successfully!")
    print("="*60)
    print(f"\nFixed script saved to: {output_file}")
    print("\nNext steps:")
    print("1. Review the fixed script")
    print("2. Test on SQL Server")
    print("3. Report any remaining issues")

if __name__ == '__main__':
    input_file = r'D:\VendorRegistrationForm\eomsdb_full_MSSQL.sql'
    output_file = r'D:\VendorRegistrationForm\eomsdb_full_MSSQL_FIXED.sql'

    try:
        fix_mssql_script(input_file, output_file)
    except Exception as e:
        print(f"\n[ERROR] {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
