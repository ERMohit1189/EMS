# Holiday Master - Database Migration Guide

## Migration Required

Since we've added a new `holidays` table to the schema, you need to run database migrations.

## Steps to Apply Migration

### Option 1: Using Drizzle Kit (Recommended)

1. **Generate Migration**
```powershell
npm run db:push
# or
npx drizzle-kit push:pg
```

This will:
- Detect the new `holidays` table in the schema
- Create the table in the database
- Add the indexes (idx_holiday_date, idx_holiday_state)

### Option 2: Manual SQL

If you prefer manual migration, run this SQL:

```sql
-- Create holidays table
CREATE TABLE IF NOT EXISTS holidays (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  state VARCHAR(100),
  type VARCHAR(50) DEFAULT 'public',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_holiday_date ON holidays(date);
CREATE INDEX IF NOT EXISTS idx_holiday_state ON holidays(state);

-- Add comments for documentation
COMMENT ON TABLE holidays IS 'Stores holiday information for attendance calculation';
COMMENT ON COLUMN holidays.state IS 'State-specific holidays, NULL for national holidays';
COMMENT ON COLUMN holidays.type IS 'Holiday type: public, optional, or restricted';
```

## Verification

After migration, verify the table exists:

```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'holidays'
);

-- Check table structure
\d holidays

-- Check indexes
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'holidays';
```

## Test Data (Optional)

To test the feature, you can add some sample holidays:

```sql
INSERT INTO holidays (name, date, state, type, description, is_active) VALUES
('Republic Day', '2024-01-26', NULL, 'public', 'Celebrates the adoption of the Constitution of India', true),
('Independence Day', '2024-08-15', NULL, 'public', 'Commemorates India''s independence from British rule', true),
('Gandhi Jayanti', '2024-10-02', NULL, 'public', 'Birth anniversary of Mahatma Gandhi', true),
('Maharashtra Day', '2024-05-01', 'Maharashtra', 'public', 'Formation day of Maharashtra state', true),
('Karnataka Rajyotsava', '2024-11-01', 'Karnataka', 'public', 'Formation day of Karnataka state', true),
('Diwali', '2024-10-31', NULL, 'public', 'Festival of lights', true),
('Christmas', '2024-12-25', NULL, 'public', 'Christian festival celebrating the birth of Jesus Christ', true);
```

## Rollback (If Needed)

If you need to rollback:

```sql
DROP TABLE IF EXISTS holidays CASCADE;
```

**Warning**: This will permanently delete all holiday data.

## Next Steps

1. ✅ Run the migration
2. ✅ Restart the server
3. ✅ Navigate to `/admin/holiday-master`
4. ✅ Test the AI holiday generation
5. ✅ Add holidays for your organization

## Database Schema Details

### Table: `holidays`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR | PRIMARY KEY, DEFAULT uuid | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Holiday name |
| date | DATE | NOT NULL, INDEXED | Holiday date |
| state | VARCHAR(100) | NULLABLE, INDEXED | State (NULL = All India) |
| type | VARCHAR(50) | DEFAULT 'public' | public/optional/restricted |
| description | TEXT | NULLABLE | Additional details |
| is_active | BOOLEAN | DEFAULT true | Active status |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

### Indexes
- **idx_holiday_date**: Fast date-based queries
- **idx_holiday_state**: Fast state-based filtering

## Troubleshooting

### Error: "Table already exists"
- The table might have been created already
- Run: `SELECT * FROM holidays LIMIT 1;` to verify
- If structure is different, drop and recreate

### Error: "Permission denied"
- Ensure your database user has CREATE TABLE permissions
- Contact your DBA if needed

### Error: "UUID extension not available"
- Install the UUID extension: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
- Or use `gen_random_uuid()` which is built-in to PostgreSQL 13+

## Support

If you encounter any issues:
1. Check server logs
2. Verify database connection
3. Ensure schema.ts is properly synced
4. Review drizzle.config.ts settings

---

**Status**: Ready for Migration
**Created**: 2024
