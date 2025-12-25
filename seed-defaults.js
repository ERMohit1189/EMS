// Add Default Departments and Designations
// Run this script: node seed-defaults.js

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import { departments, designations } from './shared/schema.ts';

const { Pool } = pkg;

async function seedDefaults() {
  let pool;
  try {
    console.log('🌱 Seeding Default Departments and Designations...\n');

    // Create database connection
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    const db = drizzle(pool);

    // Default Departments
    const defaultDepartments = [
      'Administration',
      'Human Resources',
      'Finance',
      'Operations',
      'IT & Technology',
      'Sales & Marketing',
      'Customer Support',
      'Engineering',
      'Quality Assurance',
      'Procurement',
      'Legal',
      'Research & Development'
    ];

    // Default Designations
    const defaultDesignations = [
      'Chief Executive Officer (CEO)',
      'Chief Technology Officer (CTO)',
      'Chief Financial Officer (CFO)',
      'General Manager',
      'Senior Manager',
      'Manager',
      'Assistant Manager',
      'Team Lead',
      'Senior Engineer',
      'Engineer',
      'Junior Engineer',
      'Senior Executive',
      'Executive',
      'Senior Officer',
      'Officer',
      'Assistant',
      'Analyst',
      'Consultant',
      'Supervisor',
      'Coordinator',
      'Technician',
      'Trainee',
      'Intern'
    ];

    console.log('📋 Adding Departments...');
    let deptCount = 0;
    for (const deptName of defaultDepartments) {
      try {
        await db.insert(departments).values({ name: deptName });
        console.log(`   ✅ ${deptName}`);
        deptCount++;
      } catch (error) {
        if (error.message.includes('unique')) {
          console.log(`   ⚠️  ${deptName} (already exists)`);
        } else {
          console.log(`   ❌ ${deptName} - Error: ${error.message}`);
        }
      }
    }

    console.log('\n📋 Adding Designations...');
    let desigCount = 0;
    for (const desigName of defaultDesignations) {
      try {
        await db.insert(designations).values({ name: desigName });
        console.log(`   ✅ ${desigName}`);
        desigCount++;
      } catch (error) {
        if (error.message.includes('unique')) {
          console.log(`   ⚠️  ${desigName} (already exists)`);
        } else {
          console.log(`   ❌ ${desigName} - Error: ${error.message}`);
        }
      }
    }

    console.log('\n✅ Seeding Complete!');
    console.log(`   📊 Departments added: ${deptCount}/${defaultDepartments.length}`);
    console.log(`   📊 Designations added: ${desigCount}/${defaultDesignations.length}\n`);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding defaults:', error.message);
    console.error(error);
    if (pool) await pool.end();
    process.exit(1);
  }
}

seedDefaults();
