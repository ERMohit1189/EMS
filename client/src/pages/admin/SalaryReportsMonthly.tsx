import React, { useEffect, useState } from "react";
import { apiCall } from "@/lib/api";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type Summary = {
  month: number;
  year: number;
  recordCount: number;
  totalAmount: number;
  generatedAt: string | null;
};

type DetailRow = {
  id: string;
  employeeId: string;
  employeeCode?: string;
  employeeName: string;
  netSalary: string | number;
  grossSalary?: string | number;
  totalDeductions?: string | number;
  createdAt?: string;
};

const fmt = (n: number) => {
  try {
    return `Rs ${new Intl.NumberFormat('en-IN').format(n)}`;
  } catch (e) {
    return `Rs ${n}`;
  }
};

const monthName = (m: number) => new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' });

export default function SalaryReportsMonthly() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<Record<string, DetailRow[]>>({});
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetchSummaries();
  }, []);

  const fetchSummaries = async () => {
    setLoading(true);
    try {
      const res = await apiCall('/api/reports/salary-generated');
      const json = await res.json();
      // Normalize response to an array
      const list = Array.isArray(json) ? json : (json && Array.isArray((json as any).data) ? (json as any).data : []);
      if (!Array.isArray(list)) {
        console.warn('SalaryReportsMonthly: unexpected summaries response', json);
      }
      setSummaries(list || []);
    } catch (e) {
      console.error('Failed to load summaries', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (year: number, month: number) => {
    const key = `${year}-${month}`;
    if (details[key]) {
      setSelected(key);
      return;
    }
    try {
      const res = await apiCall(`/api/reports/salary-generated/${year}/${month}`);
      const json = await res.json();
      const rows = Array.isArray(json) ? json : (json && (json as any).data ? (json as any).data : []);
      // Normalize employee code property to `employeeCode` to handle different casing from API
      const normalized = (rows || []).map((r: any) => ({
        ...r,
        employeeCode: r.employeeCode || r.employee_code || r.employeecode || null,
      }));
      setDetails((d) => ({ ...d, [key]: normalized }));
      setSelected(key);
    } catch (e) {
      console.error('Failed to fetch details', e);
    }
  };

  const downloadCSV = async (year: number, month: number) => {
    try {
      const res = await apiCall(`/api/reports/salary-generated/${year}/${month}`);
      const json = await res.json();
      const rows: DetailRow[] = Array.isArray(json) ? json : (json && (json as any).data ? (json as any).data : []);
      const headers = ['Employee Code', 'Employee Name', 'Gross Salary', 'Total Deductions', 'Net Salary', 'Created At'];
      const csv = [headers.join(',')]
        .concat((rows || []).map(r => {
          const code = r.employeeCode || r.employee_code || r.employeecode || '';
          return [code, `"${(r.employeeName||'').replace(/"/g,'""')}"`, r.grossSalary || '', r.totalDeductions || '', r.netSalary || '', r.createdAt || ''].join(',');
        }))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `salary_${year}_${month}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('CSV download failed', e);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Monthly Generated Salary Reports</h1>
      <div className="mb-4">
        <Button onClick={fetchSummaries} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Month</TableHead>
            <TableHead>Generated At</TableHead>
            <TableHead>Records</TableHead>
            <TableHead>Total Amount</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summaries.map((s) => (
            <TableRow key={`${s.year}-${s.month}`}>
              <TableCell>{monthName(s.month)} {s.year}</TableCell>
              <TableCell>{s.generatedAt ? new Date(s.generatedAt).toLocaleString() : '-'}</TableCell>
              <TableCell>{s.recordCount}</TableCell>
              <TableCell>{fmt(Number(s.totalAmount || 0))}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => fetchDetails(s.year, s.month)}>View</Button>
                  <Button size="sm" onClick={() => downloadCSV(s.year, s.month)}>Download CSV</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selected && details[selected] && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Details for {selected}</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Code</TableHead>
                <TableHead>Employee Name</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {details[selected].map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.employeeCode || 'N/A'}</TableCell>
                  <TableCell>{r.employeeName}</TableCell>
                  <TableCell>{fmt(Number(r.grossSalary || 0))}</TableCell>
                  <TableCell>{fmt(Number(r.totalDeductions || 0))}</TableCell>
                  <TableCell>{fmt(Number(r.netSalary || 0))}</TableCell>
                  <TableCell>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
