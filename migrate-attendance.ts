import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function migrateAttendanceLock() {
  try {
    console.log('Adding locked fields to attendances table...');
    
    // Add locked column
    await db.execute(sql`
      ALTER TABLE attendances 
      ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT false
    `);
    
    // Add locked_at column
    await db.execute(sql`
      ALTER TABLE attendances 
      ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP
    `);
    
    // Add locked_by column
    await db.execute(sql`
      ALTER TABLE attendances 
      ADD COLUMN IF NOT EXISTS locked_by VARCHAR
    `);
    
    console.log('✓ Migration completed successfully!');
    console.log('New fields added: locked, locked_at, locked_by');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateAttendanceLock();
