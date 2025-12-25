import React, { useEffect, useState } from 'react';
import { getApiBaseUrl } from '@/lib/api';

const LeaveApply: React.FC = () => {
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [leaveTypesLoading, setLeaveTypesLoading] = useState(false);
  // Banner state for carry-forward-only allocations
  const [carryOnlyBanner, setCarryOnlyBanner] = useState<{ show: boolean; fromYear?: number | null; }>(() => ({ show: false, fromYear: null }));

  // Prefer localStorage employeeId (set at login), fall back to injected global
  const employeeId = localStorage.getItem('employeeId') || (window as any).__EMPLOYEE_ID__ || null;
  const currentYear = new Date().getFullYear();

  // Compute the year for which we should fetch leave allotments. If user selected a startDate, use its year.
  const selectedYear = (startDate || endDate) ? new Date((startDate || endDate) as string).getFullYear() : currentYear;

  useEffect(() => {
    const fetchAllotments = async () => {
      if (!employeeId) return;
      setLeaveTypesLoading(true);
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/leave-allotments/employee/${employeeId}/${selectedYear}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const types = data.leaveTypes || [];
          setLeaveTypes(types);

          // Determine if allocations come entirely from carry-forward
          const carryForwardApplied = Boolean(data.carryForwardApplied);
          const carryFromYear = typeof data.carryFromYear === 'number' ? data.carryFromYear : (data.carryFromYear ? Number(data.carryFromYear) : null);

          // Fallback heuristic: if no regular allocations exist and some carried amounts exist, treat as carry-only
          const regularCodes = ['ML','CL','EL','SL','PL'];
          const hasAnyRegularAlloc = types.some((t: any) => regularCodes.includes(t.code) && (t.allocated ?? 0) > 0);
          const hasCarried = types.some((t: any) => (t.carried ?? 0) > 0);
          const carryOnlyHeuristic = !hasAnyRegularAlloc && hasCarried;

          setCarryOnlyBanner({ show: carryForwardApplied || carryOnlyHeuristic, fromYear: carryFromYear });

          if (types.length > 0) {
            // Prefer a leave type with remaining > 0, otherwise fall back to the first type
            const firstAvailable = types.find((lt: any) => (lt.remaining ?? 0) > 0) || types[0];
            setSelectedType(firstAvailable.code);
          }
        } else {
          console.error('Failed to fetch leave allotments', res.statusText);
        }
      } catch (e) {
        console.error('Failed to fetch leave allotments', e);
      } finally {
        setLeaveTypesLoading(false);
      }
    };

    const fetchMyLeaves = async () => {
      if (!employeeId) return;
      setLeavesLoading(true);
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/leaves/my`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setLeaves(Array.isArray(data) ? data : []);
        } else {
          console.error('Failed to fetch my leaves', res.statusText);
        }
      } catch (e) {
        console.error('Failed to fetch my leaves', e);
      } finally {
        setLeavesLoading(false);
      }
    };

    fetchAllotments();
    fetchMyLeaves();
  }, [employeeId, selectedYear]);

  const [overlapError, setOverlapError] = useState<string | null>(null);
  const [invalidDates, setInvalidDates] = useState<Array<{date: string; reason: string; holidayName?: string}>>([]);
  const [validatingDates, setValidatingDates] = useState(false);
  // Minimum selectable date (today)
  const todayStr = new Date().toISOString().slice(0,10);

  const computeDays = () => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  // Compute selected leave type and whether requested days exceed remaining balance
  const selectedLeaveObj = leaveTypes.find(lt => lt.code === selectedType);
  const selectedRemaining = selectedLeaveObj ? Number(selectedLeaveObj.remaining || 0) : null;
  const requestedDays = computeDays();
  const insufficientBalance = selectedRemaining !== null && requestedDays > (selectedRemaining || 0);

  // Validate selected range against existing leaves (pending/approved) and Sundays/holidays
  useEffect(() => {
    if (!startDate || !endDate) {
      setOverlapError(null);
      setInvalidDates([]);
      return;
    }
    const s = new Date(startDate);
    const e = new Date(endDate);
    // normalize today's date to midnight
    const today = new Date();
    today.setHours(0,0,0,0);

    if (e < s) {
      setOverlapError('End date must be the same as or after start date');
      setInvalidDates([]);
      return;
    }

    // disallow start dates in the past
    const sMid = new Date(s.getFullYear(), s.getMonth(), s.getDate());
    if (sMid < today) {
      setOverlapError('Start date must be today or a future date');
      setInvalidDates([]);
      return;
    }

    // check against existing leaves (ignore rejected)
    for (const l of leaves || []) {
      if (!l || !l.startDate || !l.endDate) continue;
      if (l.status === 'rejected') continue; // rejected leaves don't block new requests
      const ls = new Date(l.startDate);
      const le = new Date(l.endDate);
      // ranges overlap if start <= existingEnd && end >= existingStart
      if (s <= le && e >= ls) {
        setOverlapError(`Selected dates overlap with existing ${String(l.status).toUpperCase()} leave (${l.startDate} → ${l.endDate})`);
        setInvalidDates([]);
        return;
      }
    }

    setOverlapError(null);

    // server-side validation for Sundays and holidays (debounced)
    let cancelled = false;
    setValidatingDates(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/leaves/validate-dates`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate, endDate }),
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setInvalidDates(Array.isArray(data.invalidDates) ? data.invalidDates : []);
        } else {
          // attempt to parse returned invalidDates on 400 responses
          const data = await res.json().catch(() => ({}));
          if (!cancelled && Array.isArray(data.invalidDates)) setInvalidDates(data.invalidDates);
        }
      } catch (e) {
        console.error('Failed to validate dates', e);
      } finally {
        if (!cancelled) setValidatingDates(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [startDate, endDate, leaves]);

  const handleSubmit = async () => {
    if (!selectedType || !startDate || !endDate) return alert('Please fill all fields');
    const days = computeDays();
    if (days <= 0) return alert('Invalid date range');

    // Client-side balance check - prevents requests that will be rejected by the server
    if (selectedRemaining !== null && days > (selectedRemaining || 0)) {
      return alert(`Insufficient leave balance for ${selectedLeaveObj?.name || selectedType}: ${selectedRemaining} day(s) remaining, you requested ${days} day(s).`);
    }

    setLoading(true);
    try {
      // Prevent applying for past dates on client-side
      const todayStr = new Date().toISOString().slice(0,10);
      if (startDate < todayStr) {
        alert('Start date must be today or a future date');
        setLoading(false);
        return;
      }

      const res = await fetch(`${getApiBaseUrl()}/api/leaves/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, leaveType: selectedType, startDate, endDate, days, remark }),
        credentials: 'include',
      });
      if (res.ok) {
        alert('Leave applied successfully');
        setStartDate(''); setEndDate(''); setRemark('');
        // Refresh my leaves
        try {
          const r2 = await fetch(`${getApiBaseUrl()}/api/leaves/my`, { credentials: 'include' });
          if (r2.ok) {
            const d2 = await r2.json();
            setLeaves(Array.isArray(d2) ? d2 : []);
          }
        } catch (e) {
          console.error('Failed to refresh leaves after apply', e);
        }
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        alert(err.error || 'Failed to apply');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to apply leave');
    } finally { setLoading(false); }
  };

  const handleRefresh = async () => {
    if (!employeeId) return;
    setLeavesLoading(true);
    setLeaveTypesLoading(true);

    try {
      const [leavesRes, allotRes] = await Promise.all([
        fetch(`${getApiBaseUrl()}/api/leaves/my`, { credentials: 'include' }),
        fetch(`${getApiBaseUrl()}/api/leave-allotments/employee/${employeeId}/${year}`, { credentials: 'include' }),
      ]);

      if (leavesRes.ok) {
        const data = await leavesRes.json();
        setLeaves(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to refresh leaves', leavesRes.statusText);
      }

      if (allotRes.ok) {
        const d = await allotRes.json();
        const types = d.leaveTypes || [];
        setLeaveTypes(types);
        if (types && types.length > 0) {
          const codes = types.map((lt: any) => lt.code);
          // preserve selected type when possible, otherwise pick the first available with remaining > 0
          if (!selectedType || !codes.includes(selectedType) || (selectedType && types.find((lt: any) => lt.code === selectedType && (lt.remaining ?? 0) <= 0))) {
            const firstAvailable = types.find((lt: any) => (lt.remaining ?? 0) > 0) || types[0];
            setSelectedType(firstAvailable.code);
          }
        } else {
          setSelectedType('');
        }
      } else {
        console.error('Failed to refresh leave allotments', allotRes.statusText);
      }
    } catch (e) {
      console.error('Failed to refresh leaves or leave types', e);
    } finally {
      setLeavesLoading(false);
      setLeaveTypesLoading(false);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  const formatDateShort = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
    } catch { return iso; }
  };

  const formatDateRange = (startIso?: string, endIso?: string) => {
    if (!startIso || !endIso) return '';
    try {
      const s = new Date(startIso);
      const e = new Date(endIso);
      const sYear = s.getFullYear();
      const eYear = e.getFullYear();
      const sMonth = s.getMonth();
      const eMonth = e.getMonth();
      if (sYear === eYear && sMonth === eMonth) {
        // 14–16 Dec 2025
        return `${s.getDate()}–${e.getDate()} ${s.toLocaleString(undefined, { month: 'short' })} ${sYear}`;
      }
      if (sYear === eYear) {
        // 14 Dec – 16 Jan 2025
        return `${formatDateShort(startIso)} – ${formatDateShort(endIso)} ${sYear}`;
      }
      // different years
      return `${formatDateShort(startIso)} ${sYear} – ${formatDateShort(endIso)} ${eYear}`;
    } catch { return `${startIso} → ${endIso}`; }
  };

  // Date filter + sort state for My Leaves
  const [filterFrom, setFilterFrom] = useState<string | null>(null);
  const [filterTo, setFilterTo] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Debounced input states so typing doesn't immediately trigger filter logic
  const [filterFromInput, setFilterFromInput] = useState<string | null>(filterFrom);
  const [filterToInput, setFilterToInput] = useState<string | null>(filterTo);

  // Keep input fields synced with applied filters (e.g., Reset)
  useEffect(() => { setFilterFromInput(filterFrom); }, [filterFrom]);
  useEffect(() => { setFilterToInput(filterTo); }, [filterTo]);

  // Debounce updates to the applied filter values
  useEffect(() => {
    const t = setTimeout(() => setFilterFrom(filterFromInput), 350);
    return () => clearTimeout(t);
  }, [filterFromInput]);
  useEffect(() => {
    const t = setTimeout(() => setFilterTo(filterToInput), 350);
    return () => clearTimeout(t);
  }, [filterToInput]);

  const applyDateFilterAndSort = (list: any[]) => {
    let out = Array.isArray(list) ? [...list] : [];

    // apply date filter: include leaves that intersect [filterFrom, filterTo]
    if (filterFrom || filterTo) {
      const from = filterFrom ? new Date(filterFrom) : null;
      const to = filterTo ? new Date(filterTo) : null;
      out = out.filter((l: any) => {
        try {
          const ls = new Date(l.startDate);
          const le = new Date(l.endDate);
          if (from && to) {
            return ls <= to && le >= from;
          }
          if (from) {
            return le >= from;
          }
          if (to) {
            return ls <= to;
          }
          return true;
        } catch { return true; }
      });
    }

    // sort by startDate
    out.sort((a: any, b: any) => {
      const ad = new Date(a.startDate).getTime();
      const bd = new Date(b.startDate).getTime();
      return sortOrder === 'newest' ? bd - ad : ad - bd;
    });

    return out;
  };

  const statusBadgeClass = (status: string) => {
    if (status === 'approved') return 'bg-green-100 text-green-800';
    if (status === 'rejected') return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const isConflictWithSelection = (l: any) => {
    if (!startDate || !endDate) return false;
    if (!l || !l.startDate || !l.endDate) return false;
    if (l.status === 'rejected') return false;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const ls = new Date(l.startDate);
    const le = new Date(l.endDate);
    return s <= le && e >= ls;
  };

  return (
    <div className="w-full px-4 py-8 md:max-w-6xl md:mx-auto">
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="h-1 rounded-t-lg bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 mb-4"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-lg shadow-sm">📝</span>
              <span className="text-gray-900">Apply for Leave</span>
            </h2>
            <p className="text-sm text-indigo-600 mt-1">Quickly apply for leave and track your requests below.</p>            <p className="text-sm mt-1"><a href="/employee/leave-history" className="text-indigo-600 hover:underline">View year-by-year leave history & carry-forward details</a></p>          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            { /* Combined refresh state when updating both leave types and leaves */ }
          <button onClick={handleRefresh} disabled={leavesLoading || leaveTypesLoading} className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm w-full md:w-auto justify-center ${leavesLoading || leaveTypesLoading ? 'border-indigo-100 bg-indigo-50 text-gray-400 cursor-not-allowed' : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>
              {(leavesLoading || leaveTypesLoading) ? (
                <svg className="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M20 8a8 8 0 11-16 0 8 8 0 0116 0z" /></svg>
              )}
              <span>{(leavesLoading || leaveTypesLoading) ? 'Loading...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Leave Type</label>
              <div className="relative">
                <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} disabled={leaveTypesLoading} className="w-full border bg-white p-3 rounded-md border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 pr-10">
                  {leaveTypesLoading ? (
                    <option>Loading leave types...</option>
                  ) : leaveTypes.length === 0 ? (
                    <option>No leave types available</option>
                  ) : (
                    leaveTypes.map(lt => (
                      <option key={lt.code} value={lt.code} disabled={lt.remaining <= 0}>{lt.name} ({lt.remaining} remaining)</option>
                    ))
                  )}
                </select>

                {/* Carry-only banner */}
                {carryOnlyBanner.show ? (
                  <div className="mt-2 p-2 rounded-md bg-amber-50 border border-amber-100 text-amber-900 text-sm">
                    <strong>Note:</strong> These allocations come entirely from carry-forward{carryOnlyBanner.fromYear ? ` (carried from ${carryOnlyBanner.fromYear})` : ''}. Regular allocations for the selected year are not present.
                  </div>
                ) : null}

                {selectedLeaveObj && (
                  <>
                    <div className="text-xs text-gray-500 mt-1">Remaining: <span className="font-medium">{selectedRemaining}</span> day(s)</div>
                    {selectedLeaveObj.carried && selectedLeaveObj.carried > 0 ? (
                      <div className="text-xs text-amber-700 mt-1">{selectedLeaveObj.carried} day(s) carried from previous year included in allocation</div>
                    ) : null}
                  </>
                )}
                {leaveTypesLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input className="w-full border p-3 rounded-md border-gray-200 focus:ring-2 focus:ring-indigo-100" type="date" min={todayStr} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input className="w-full border p-3 rounded-md border-gray-200 focus:ring-2 focus:ring-indigo-100" type="date" min={startDate || todayStr} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium mb-1">Reason (optional)</label>
              <textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Short reason for leave (optional)" className="w-full border p-3 rounded-md border-gray-200 focus:ring-2 focus:ring-indigo-100" rows={3} />
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="text-sm text-gray-600">Days: <span className="font-medium">{requestedDays}</span></div>
              <button
                className={`px-4 py-2 rounded-md text-white ${((loading || !!overlapError || invalidDates.length > 0 || validatingDates || insufficientBalance) ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700')}`}
                onClick={handleSubmit}
                disabled={loading || !!overlapError || invalidDates.length > 0 || validatingDates || insufficientBalance}
              >
                {loading ? 'Applying...' : validatingDates ? 'Validating...' : (insufficientBalance ? 'Insufficient Balance' : 'Apply')}
              </button>
            </div>

            {overlapError ? (
              <div className="mt-3 text-sm text-red-600 font-medium">{overlapError}</div>
            ) : null}

            {invalidDates.length > 0 && (
              <div className="mt-3 text-sm text-red-600 font-medium">
                The selected range contains disallowed dates:
                <ul className="list-disc ml-5 mt-1">
                  {invalidDates.map(d => (
                    <li key={d.date}>{d.date} — {d.reason === 'sunday' ? 'Sunday' : (d.holidayName ? `Holiday: ${d.holidayName}` : 'Holiday')}</li>
                  ))}
                </ul>
              </div>
            )}

            {insufficientBalance && (
              <div className="mt-3 text-sm text-red-600 font-medium">
                Insufficient leave balance for <strong>{selectedLeaveObj?.name || selectedType}</strong>: <strong>{selectedRemaining}</strong> day(s) remaining, you requested <strong>{requestedDays}</strong> day(s).
              </div>
            )}

            <div className="mt-4 text-xs text-gray-500">Tip: Ensure end date is same/date after start date. Contact your manager for any urgent updates.</div>
          </div>

          <div className="pr-2 bg-white rounded-md border border-transparent">
            <div className="mb-2">
              <h3 className="text-lg font-semibold">My Leaves</h3>
            </div>

            <div className="md:sticky md:top-6 md:bg-white md:pt-3 md:pb-3 md:z-10">
              <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 flex items-center gap-2">Filter:
                    <span className="inline-flex items-center text-xs bg-indigo-50 text-indigo-700 rounded-full px-2 py-0.5">{applyDateFilterAndSort(leaves).length}</span>
                  </label>

                  <div className="relative">
                    <input type="date" value={filterFromInput || ''} onChange={(e) => setFilterFromInput(e.target.value || null)} className="text-xs border rounded p-1 pr-8" />
                    {filterFromInput ? (
                      <button type="button" aria-label="Clear from filter" onClick={() => { setFilterFromInput(null); setFilterFrom(null); }} className="absolute -top-2 right-0 transform translate-x-1 text-xs w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-100 shadow-sm">✕</button>
                    ) : null}
                  </div>

                  <span className="text-xs text-gray-400 ml-2">–</span>

                  <div className="relative">
                    <input type="date" value={filterToInput || ''} onChange={(e) => setFilterToInput(e.target.value || null)} className="text-xs border rounded p-1 pr-8" />
                    {filterToInput ? (
                      <button type="button" aria-label="Clear to filter" onClick={() => { setFilterToInput(null); setFilterTo(null); }} className="absolute -top-2 right-0 transform translate-x-1 text-xs w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-100 shadow-sm">✕</button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-2 sm:mt-0 sm:ml-auto flex items-center gap-2">
                  <label className="text-xs text-gray-500">Sort:</label>
                  <button type="button" onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')} title={`Sort: ${sortOrder === 'newest' ? 'New' : 'Old'}`} aria-label={`Toggle sort (current: ${sortOrder})`} className="inline-flex items-center gap-2 text-xs border rounded p-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" className="h-4 w-4">
                      <path d="M10 3l-4 4h8L10 3z" className={sortOrder === 'newest' ? 'text-indigo-600' : 'text-gray-400'} fill="currentColor" />
                      <path d="M10 17l4-4H6l4 4z" className={sortOrder === 'oldest' ? 'text-indigo-600' : 'text-gray-400'} fill="currentColor" />
                    </svg>
                    <span className="sr-only">Sort: {sortOrder === 'newest' ? 'New' : 'Old'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Render conflicting leaves outside of the scrollable area so they're always visible; rejected leaves moved into the scrollable list */}
            {(() => {
              const rejected = (leaves || []).filter((l: any) => l && l.status === 'rejected');
              const others = (leaves || []).filter((l: any) => !l || l.status !== 'rejected');
              const conflicts = startDate && endDate ? others.filter((l: any) => isConflictWithSelection(l)) : [];
              const nonConflicts = others.filter((l: any) => !conflicts.includes(l));
              // include rejected inside the scrollable list
              const filteredAndSorted = applyDateFilterAndSort(nonConflicts.concat(rejected));

              return (
                <>
                  {conflicts.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-semibold text-red-700 mb-2">Conflicting Leaves</div>
                      <div className="space-y-2">
                        {conflicts.map((l: any) => {
                          const shortLabel = (l.leaveType || '').toString().trim().slice(0,2).toUpperCase();
                          return (
                            <div key={`conf-${l.id}`} className="p-3 border rounded-md shadow-sm bg-red-50 border-red-100 flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700">{shortLabel}</div>
                                <div>
                                  <div className="text-sm font-semibold">{l.leaveType}</div>
                                  <div className="text-xs text-gray-500">{formatDateRange(l.startDate, l.endDate)}</div>
                                  <div className="text-xs text-gray-500 mt-1">Applied: {formatDate(l.appliedAt)}</div>
                                </div>
                              </div>

                              <div className="w-20 flex flex-col items-end">
                                <div className={`px-3 py-1 rounded-full text-sm ${statusBadgeClass(l.status)}`}>{String(l.status).toUpperCase()}</div>
                                <div className="text-xs text-gray-400 mt-2">{l.days}d</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="md:h-[50vh] md:overflow-y-auto pr-2"><div className="space-y-3 px-0 pt-2">
                    {leavesLoading ? (
                      <div className="p-6 flex items-center justify-center gap-3">
                        <svg className="animate-spin h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                        <div className="text-sm text-gray-600">Loading your leave requests...</div>
                      </div>
                    ) : !employeeId ? (
                      <div className="p-4 text-sm text-gray-500">Please sign in to view your leaves.</div>
                    ) : filteredAndSorted.length === 0 ? (
                      <div className="p-4 border border-dashed rounded-md text-sm text-gray-500">No leave requests found.</div>
                    ) : (
                      <div className="space-y-3">
                        {filteredAndSorted.map((l: any, idx: number) => {
                          const shortLabel = (l.leaveType || '').toString().trim().slice(0,2).toUpperCase();
                          const trimmedLeaveType = (l.leaveType || '').toString().trim();
                          const showLeaveName = trimmedLeaveType.length > 2 && trimmedLeaveType.slice(0,2).toUpperCase() !== shortLabel;
                          return (
                            <div key={l.id}>
                              <div className={`p-3 border rounded-md shadow-sm flex items-start justify-between gap-3 hover:shadow-md transition ${l.status === 'rejected' ? 'bg-red-50 border-red-100' : ''}`}>
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700">{shortLabel}</div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      {showLeaveName ? <div className="text-sm font-semibold leading-5 hidden sm:block">{l.leaveType}</div> : null}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">{formatDateRange(l.startDate, l.endDate)}</div>
                                    {l.remark ? <div className="text-sm text-gray-600 mt-2">{l.remark}</div> : null}
                                    {l.status === 'rejected' && l.rejectionReason ? <div className="text-sm text-red-700 mt-2">Reason: {l.rejectionReason}</div> : null}
                                    <div className="text-xs text-gray-500 mt-2">Applied: {formatDate(l.appliedAt)}</div>
                                  </div>
                                </div>

                                <div className="w-20 flex flex-col items-end">
                                  <div className={`px-3 py-1 rounded-full text-sm ${statusBadgeClass(l.status)}`}>{String(l.status).toUpperCase()}</div>
                                  <div className="text-xs text-gray-400 mt-2">{l.days}d</div>
                                </div>
                              </div>

                              {idx < filteredAndSorted.length - 1 && <hr className="border-t my-3" />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveApply;
