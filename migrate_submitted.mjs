import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_YFXE1gOniq0D@ep-muddy-grass-ae69jdp4.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require'
});

async function addSubmittedColumn() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Add submitted column
    const result1 = await client.query(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'attendances' 
              AND column_name = 'submitted'
          ) THEN
              ALTER TABLE attendances 
              ADD COLUMN submitted BOOLEAN DEFAULT false;
              
              RAISE NOTICE 'Column "submitted" added successfully to attendances table';
          ELSE
              RAISE NOTICE 'Column "submitted" already exists in attendances table';
          END IF;
      END $$;
    `);

    // Add submitted_at column
    const result2 = await client.query(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'attendances' 
              AND column_name = 'submitted_at'
          ) THEN
              ALTER TABLE attendances 
              ADD COLUMN submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
              
              RAISE NOTICE 'Column "submitted_at" added successfully to attendances table';
          ELSE
              RAISE NOTICE 'Column "submitted_at" already exists in attendances table';
          END IF;
      END $$;
    `);

    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    await client.end();
  }
}

addSubmittedColumn();
