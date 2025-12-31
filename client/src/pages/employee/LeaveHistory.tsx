import React, { useEffect, useState } from 'react';
import { getApiBaseUrl } from '@/lib/api';
import { authenticatedFetch } from '@/lib/fetchWithLoader';

export default function LeaveHistory() {
  const employeeId = localStorage.getItem('employeeId') || (window as any).__EMPLOYEE_ID__ || null;
  const currentYear = new Date().getFullYear();
  const [yearsToShow, setYearsToShow] = useState(5);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Array<any>>([]);
  const [error, setError] = useState<string | null>(null);
  const [maxYear, setMaxYear] = useState<number | null>(null);

  useEffect(() => {
    const fetchYears = async () => {
      if (!employeeId) return;
      try {
        const res = await authenticatedFetch(`${getApiBaseUrl()}/api/leave-allotments/employee/${employeeId}/years`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.years) && data.years.length > 0) {
            setMaxYear(Math.max(...data.years));
            return;
          }
        }
      } catch (e) {
        // ignore - fallback to currentYear
      }
      setMaxYear(currentYear);
    };
    fetchYears();
  }, [employeeId, currentYear]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!employeeId) {
        setError('Missing employee id');
        return;
      }
      if (!maxYear) return; // wait for maxYear
      setLoading(true);
      setError(null);
      try {
        const years = Array.from({ length: yearsToShow }, (_, i) => maxYear - i);
        const results = await Promise.all(years.map(async (y) => {
          const res = await authenticatedFetch(`${getApiBaseUrl()}/api/leave-allotments/employee/${employeeId}/${y}`);
          if (!res.ok) return { year: y, error: `Failed (${res.status})` };
          const data = await res.json();
          // extract summaries
          const types = data.leaveTypes || [];
          const map: any = { year: y, carryForwardApplied: !!data.carryForwardApplied, carryFromYear: data.carryFromYear || null };
          // Ensure all types (ML,CL,EL,SL,PL,UL,LWP) are present
          const codes = ['ML','CL','EL','SL','PL','UL','LWP'];
          codes.forEach((c) => {
            map[`allocated_${c}`] = 0;
            map[`used_${c}`] = 0;
            map[`remaining_${c}`] = 0;
            map[`carried_${c}`] = 0;
          });
          types.forEach((t: any) => {
            map[`allocated_${t.code}`] = t.allocated ?? 0;
            map[`used_${t.code}`] = t.used ?? 0;
            map[`remaining_${t.code}`] = t.remaining ?? 0;
            map[`carried_${t.code}`] = t.carried ?? 0;
          });
          return map;
        }));

        setHistory(results);
      } catch (e: any) {
        console.error('Failed to fetch leave history', e);
        setError(String(e.message || e));
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [employeeId, yearsToShow, maxYear]);

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white shadow rounded p-4">
        <h2 className="text-lg font-bold mb-2">Leave History & Carry-Forward</h2>
        <p className="text-sm text-muted-foreground mb-4">Shows allocations, carried amounts and remaining balances year by year.</p>

        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm">Years to show (from max allotment year):</label>
          <select value={yearsToShow} onChange={(e) => setYearsToShow(parseInt(e.target.value))} className="border rounded p-1">
            <option value={3}>3</option>
            <option value={5}>5</option>
            <option value={8}>8</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
          </select>
          <div className="text-sm text-gray-600 ml-2">Max year: <strong>{maxYear || '—'}</strong></div>
          <button onClick={() => { setYearsToShow(5); }} className="ml-auto text-sm text-blue-600">Reset</button>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse border">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border px-2 py-1 text-left">Year</th>
                  <th className="border px-2 py-1">ML (A/R)</th>
                  <th className="border px-2 py-1">CL (A/R)</th>
                  <th className="border px-2 py-1">EL (A/R)</th>
                  <th className="border px-2 py-1">SL (A/R)</th>
                  <th className="border px-2 py-1">PL (A/R)</th>
                  <th className="border px-2 py-1">UL (A/R)</th>
                  <th className="border px-2 py-1">LWP (A/R)</th>
                  <th className="border px-2 py-1">Carried EL</th>
                  <th className="border px-2 py-1">Carried PL</th>
                  <th className="border px-2 py-1">Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.year} className="odd:bg-white even:bg-gray-100">
                    <td className="border px-2 py-1 font-medium">{h.year}</td>
                    <td className="border px-2 py-1 text-center">{(h['allocated_ML'] ?? 0)} / {(h['remaining_ML'] ?? 0)}</td>
                    <td className="border px-2 py-1 text-center">{(h['allocated_CL'] ?? 0)} / {(h['remaining_CL'] ?? 0)}</td>
                    <td className="border px-2 py-1 text-center">{(h['allocated_EL'] ?? 0)} / {(h['remaining_EL'] ?? 0)}</td>
                    <td className="border px-2 py-1 text-center">{(h['allocated_SL'] ?? 0)} / {(h['remaining_SL'] ?? 0)}</td>
                    <td className="border px-2 py-1 text-center">{(h['allocated_PL'] ?? 0)} / {(h['remaining_PL'] ?? 0)}</td>
                    <td className="border px-2 py-1 text-center">{(h['allocated_UL'] ?? 0)} / {(h['remaining_UL'] ?? 0)}</td>
                    <td className="border px-2 py-1 text-center">{(h['allocated_LWP'] ?? 0)} / {(h['remaining_LWP'] ?? 0)}</td>
                    <td className="border px-2 py-1 text-center">{h['carried_EL'] ?? 0}</td>
                    <td className="border px-2 py-1 text-center">{h['carried_PL'] ?? 0}</td>
                    <td className="border px-2 py-1 text-sm text-gray-600">{h.carryForwardApplied ? `Carried from ${h.carryFromYear}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}