# PostgreSQL to MSSQL Conversion Notes

## Conversion Date
2025-12-25

## Key Changes Made

### Data Type Conversions
- `character varying` → `NVARCHAR`
- `text` → `NVARCHAR(MAX)`
- `timestamp without time zone` → `DATETIME2`
- `timestamp with time zone` → `DATETIMEOFFSET`
- `boolean` → `BIT`
- `numeric` → `DECIMAL`
- `jsonb` → `NVARCHAR(MAX)`
- `character varying[]` → `NVARCHAR(MAX)` (stored as JSON)

### Function Conversions
- `gen_random_uuid()` → `NEWID()`
- `now()` → `GETDATE()`
- `CURRENT_TIMESTAMP` → `GETDATE()` (kept as-is, compatible)

### Schema Changes
- Removed `public.` schema prefix, using `[dbo]`
- Added brackets `[]` around identifiers
- Removed `OWNER TO postgres` statements

### Index Changes
- Removed `CONCURRENTLY` keyword from CREATE INDEX
- Converted `USING btree` to standard index syntax
- Converted `USING gin` for array indexes

### Trigger Changes
- Converted `BEFORE UPDATE` triggers to `INSTEAD OF UPDATE`
- Converted PostgreSQL function-based triggers to inline T-SQL

### Sequence Changes
- `empcode_seq` sequence will need to be implemented using IDENTITY or computed column
- Alternative: Use SEQUENCE object in SQL Server 2012+

### Comment Conversions
- `COMMENT ON` statements converted to `sp_addextendedproperty`

## Items Requiring Manual Review

- Function update_vendor_password_otps_updated_at converted to trigger logic
- Table app_settings created
- Table attendances created
- Table daily_allowances created
- Table departments created
- Table designations created
- Sequence empcode_seq converted to IDENTITY in table column
- Table employees created
- emp_code sequence default removed - needs manual trigger or default constraint
- Table export_headers created
- Table generate_salary created
- Table holidays created
- Table invoices created
- Table leave_allotment_override_audits created
- Table leave_allotments created
- Table leave_requests created
- Table payment_masters created
- Table purchase_order_lines created
- Table purchase_orders created
- Table salary_structures created
- Table session created
- Table sites created
- Table team_members created
- Table teams created
- Table vendor_password_otps created
- Table vendor_rates created
- Table vendors created
- Table zones created
- Trigger update_vendor_password_otps_updated_at_trigger converted to MSSQL syntax

## Additional Notes

- Array columns have been converted to NVARCHAR(MAX) for JSON storage
- You may want to use proper JSON columns in SQL Server 2016+
- Review all DEFAULT constraints for correctness
- Test all foreign key relationships
- Verify date/time data compatibility
- Check numeric precision and scale values
