// Create Super Admin Employee Account
// Run this script: node create-admin.js

import bcrypt from 'bcrypt';
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import { employees } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

const { Pool } = pkg;

async function createSuperAdmin() {
  let pool;
  try {
    console.log('🔐 Creating Super Admin Employee Account...\n');

    // Create database connection
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    const db = drizzle(pool);

    // Admin credentials
    const adminEmail = 'admin@company.com';
    const adminPassword = 'Admin@123';
    
    // Hash the password
    console.log('⏳ Hashing password...');
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    console.log('✅ Password hashed successfully\n');

    // Check if admin already exists
    console.log('🔍 Checking if admin account exists...');
    const existingAdmin = await db.select()
      .from(employees)
      .where(eq(employees.email, adminEmail))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log('⚠️  Admin account already exists. Updating password and role...\n');
      
      // Update existing admin
      const updated = await db.update(employees)
        .set({
          password: hashedPassword,
          status: 'Active',
          role: 'admin',
          updatedAt: new Date()
        })
        .where(eq(employees.email, adminEmail))
        .returning();

      console.log('✅ Admin account updated successfully!\n');
      console.log('📋 Admin Account Details:');
      console.log('   Email:', updated[0].email);
      console.log('   Name:', updated[0].name);
      console.log('   Role:', updated[0].role);
      console.log('   Status:', updated[0].status);
      console.log('   Password: Admin@123');
    } else {
      console.log('📝 Creating new admin account...\n');
      
      // Create new admin employee
      const newAdmin = await db.insert(employees)
        .values({
          name: 'Super Administrator',
          email: adminEmail,
          password: hashedPassword,
          dob: '1990-01-01',
          fatherName: 'Admin Father',
          mobile: '9999999999',
          alternateNo: '8888888888',
          address: 'Admin Office, Main Branch',
          city: 'Delhi',
          state: 'Delhi',
          country: 'India',
          role: 'admin',
          doj: new Date().toISOString().split('T')[0],
          bloodGroup: 'O+',
          maritalStatus: 'Single',
          nominee: 'Emergency Contact',
          ppeKit: false,
          status: 'Active',
        })
        .returning();

      console.log('✅ Super Admin employee account created successfully!\n');
      console.log('📋 Admin Account Details:');
      console.log('   Email:', newAdmin[0].email);
      console.log('   Name:', newAdmin[0].name);
      console.log('   Role:', newAdmin[0].role);
      console.log('   Status:', newAdmin[0].status);
      console.log('   Mobile:', newAdmin[0].mobile);
      console.log('   Password: Admin@123');
    }

    console.log('\n🎉 Done! You can now login to Employee Dashboard with:');
    console.log('   📧 Email: admin@company.com');
    console.log('   🔑 Password: Admin@123');
    console.log('\n⚠️  IMPORTANT: Change this password after first login!\n');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin account:', error.message);
    console.error(error);
    if (pool) await pool.end();
    process.exit(1);
  }
}

createSuperAdmin();
