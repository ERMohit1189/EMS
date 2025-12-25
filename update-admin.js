import bcrypt from 'bcrypt';
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import { employees } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

const { Pool } = pkg;

async function updateAdminByMobile() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  try {
    const hashed = await bcrypt.hash('Admin@123', 10);
    const [updated] = await db.update(employees)
      .set({
        email: 'admin@company.com',
        password: hashed,
        role: 'admin',
        status: 'Active',
        updatedAt: new Date(),
      })
      .where(eq(employees.mobile, '9999999999'))
      .returning();

    if (!updated) {
      console.log('No employee found with mobile 9999999999.');
    } else {
      console.log('Updated employee:', updated.email, updated.mobile, updated.role);
    }
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error updating admin by mobile:', err?.message || err);
    await pool.end();
    process.exit(1);
  }
}

updateAdminByMobile();
