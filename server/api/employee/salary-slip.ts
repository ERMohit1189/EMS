import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { salaryStructures } from '../../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { employeeId } = req.query;
  if (!employeeId) {
    return res.status(400).json({ error: 'Employee ID required' });
  }
  try {
    // Get latest salary slip for employee
    const salary = await db
      .select()
      .from(salaryStructures)
      .where(eq(salaryStructures.employeeId, employeeId))
      .orderBy(desc(salaryStructures.year), desc(salaryStructures.month))
      .limit(1);
    if (!salary.length) {
      return res.status(404).json({ error: 'No salary slip found' });
    }
    res.json(salary[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
