import React, { useEffect, useState } from 'react';
import { getApiBaseUrl } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const LeaveApprovals: React.FC = () => {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApprover, setIsApprover] = useState<boolean | null>(null);
  const [reportingTeams, setReportingTeams] = useState<any[] | null>(null);
  const [reportingTeamsError, setReportingTeamsError] = useState<string | null>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Cache of leave balances per employeeId: { [employeeId]: { [leaveCode]: { remaining, allocated, used } } }
  const [leaveBalances, setLeaveBalances] = useState<Record<string, Record<string, { remaining: number; allocated?: number; used?: number }>>>({});
  const [balancesLoading, setBalancesLoading] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState<string>('');
  const [editEnd, setEditEnd] = useState<string>('');
  const [editRemark, setEditRemark] = useState<string>(''); // this holds approver's remark (approverRemark)
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [fetchingDetails, setFetchingDetails] = useState<Set<string>>(new Set());
  // IDs currently performing approve/reject actions (tracked separately so only the specific action shows loader)
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [rejectingIds, setRejectingIds] = useState<Set<string>>(new Set());
  const [unauthorizedRejectIds, setUnauthorizedRejectIds] = useState<Set<string>>(new Set());
  const setApproving = (id: string, loading: boolean) => setApprovingIds(prev => { const s = new Set(prev); if (loading) s.add(id); else s.delete(id); return s; });
  const setRejecting = (id: string, loading: boolean) => setRejectingIds(prev => { const s = new Set(prev); if (loading) s.add(id); else s.delete(id); return s; });
  const markUnauthorizedReject = (id: string) => setUnauthorizedRejectIds(prev => { const s = new Set(prev); s.add(id); return s; });
  const clearUnauthorizedReject = (id: string) => setUnauthorizedRejectIds(prev => { const s = new Set(prev); s.delete(id); return s; });

  const { toast } = useToast();

  const formatDateTime = (val?: string | number | Date) => {
    if (!val) return '';
    const d = new Date(val);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const formatDateShort = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const day = d.getDate();
      const month = d.toLocaleString(undefined, { month: 'short' }); // e.g., 'Dec'
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return iso;
    }
  };

  const fetchPending = async (teamId?: string, employeeId?: string) => {
    setLoading(true);
    setError(null);
    try {
      let url = `${getApiBaseUrl()}/api/leaves/pending`;
      const params: string[] = [];
      if (teamId) params.push(`teamId=${encodeURIComponent(teamId)}`);
      if (employeeId) params.push(`employeeId=${encodeURIComponent(employeeId)}`);
      if (params.length > 0) url = `${url}?${params.join('&')}`;
      const res = await fetch(url, { credentials: 'include' });
      if (res.status === 401 || res.status === 403) {
        setError('Not authorized to view approvals');
        setPending([]);
        setIsApprover(false);
        return;
      }
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        console.debug('[LeaveApprovals] fetched pending:', data);

        // Ensure employee / applied-by details are present; if not, fetch them individually
        const list = Array.isArray(data) ? data : [];
        const missingEmployeeIds = new Set<string>();
        const missingAppliedByIds = new Set<string>();
        list.forEach((r: any) => {
          if ((!r.employeeName || r.employeeName === null) && r.employeeId) missingEmployeeIds.add(r.employeeId);
          if ((!r.appliedByName || r.appliedByName === null) && r.appliedBy) missingAppliedByIds.add(r.appliedBy);
        });
        const mergedIds = new Set<string>();
        missingEmployeeIds.forEach((id) => mergedIds.add(id));
        missingAppliedByIds.forEach((id) => mergedIds.add(id));
        const idsToFetch = Array.from(mergedIds);
        if (idsToFetch.length > 0) {
          await Promise.all(idsToFetch.map(async (id) => {
            try {
              const er = await fetch(`${getApiBaseUrl()}/api/employees/${encodeURIComponent(id)}`, { credentials: 'include' });
              if (er.ok) {
                const emp = await er.json();
                list.forEach((r: any) => {
                  if ((!r.employeeName || r.employeeName === null) && r.employeeId === id) {
                    r.employeeName = emp.name || null;
                    r.employeeDepartment = emp.department || null;
                    r.employeeDesignation = emp.designation || null;
                  }
                  if ((!r.appliedByName || r.appliedByName === null) && r.appliedBy === id) {
                    r.appliedByName = emp.name || null;
                    r.appliedByEmail = emp.email || null;
                  }
                });
              }
            } catch (e) {
              console.error('[LeaveApprovals] failed to fetch employee', id, e);
            }
          }));
        }

        setPending(list);

        // Fetch leave balances for employees in the pending list (if not already cached)
        try {
          const empIds = Array.from(new Set(list.map((r: any) => r.employeeId).filter(Boolean)));
          fetchLeaveBalancesForIds(empIds);
        } catch (e) {
          // ignore
        }

        setIsApprover(true);
      } else if (res.ok) {
        // ok but non-json means unexpected response (e.g., login HTML)
        console.warn('[LeaveApprovals] Unexpected non-JSON response', res.status, contentType);
        setPending([]);
      } else {
        // other non-ok
        const body = await res.text().catch(() => null);
        console.warn('[LeaveApprovals] fetch returned non-ok status', res.status, body);
        setError('Failed to fetch approvals');
      }
    } catch (e) {
      console.error('Failed to fetch pending leaves', e);
      setError('Failed to fetch approvals');
    } finally { setLoading(false); }
  };

  // Helper to fetch leave allotments for a list of employee ids and cache remaining days by leave code
  const fetchLeaveBalancesForIds = async (ids: string[]) => {
    const year = new Date().getFullYear();
    const toFetch = ids.filter(id => id && !leaveBalances[id]);
    if (toFetch.length === 0) return;
    // mark loading
    toFetch.forEach(id => setBalancesLoading(prev => { const s = new Set(prev); s.add(id); return s; }));

    await Promise.all(toFetch.map(async (id) => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/leave-allotments/employee/${encodeURIComponent(id)}/${year}`, { credentials: 'include' });
        if (res.ok) {
          const d = await res.json();
          const map: Record<string, { remaining: number; allocated?: number; used?: number }> = {};
          (d.leaveTypes || []).forEach((lt: any) => {
            if (lt && lt.code) {
              map[lt.code] = {
                remaining: (typeof lt.remaining === 'number' ? lt.remaining : (lt.remaining ? Number(lt.remaining) : 0)),
                allocated: typeof lt.allocated === 'number' ? lt.allocated : (typeof lt.total === 'number' ? lt.total : undefined),
                used: typeof lt.used === 'number' ? lt.used : undefined,
              };
            }
          });
          setLeaveBalances(prev => ({ ...prev, [id]: map }));
        } else {
          // ignore failures per-employee
        }
      } catch (e) {
        console.error('[LeaveApprovals] failed to load leave balances for', id, e);
      } finally {
        setBalancesLoading(prev => { const s = new Set(prev); s.delete(id); return s; });
      }
    }));
  };

  // Fetch a single leave code's balance for an employee and update cache for that code only
  const fetchLeaveBalanceFor = async (employeeId: string, code: string) => {
    if (!employeeId || !code) return;
    const year = new Date().getFullYear();
    setBalancesLoading(prev => { const s = new Set(prev); s.add(employeeId); return s; });
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/leave-allotments/employee/${encodeURIComponent(employeeId)}/${year}`, { credentials: 'include' });
      if (!res.ok) return;
      const d = await res.json();
      const found = (d.leaveTypes || []).find((lt: any) => lt && lt.code === code);
      if (!found) return;
      const obj = { remaining: (typeof found.remaining === 'number' ? found.remaining : (found.remaining ? Number(found.remaining) : 0)), allocated: typeof found.allocated === 'number' ? found.allocated : (typeof found.total === 'number' ? found.total : undefined), used: typeof found.used === 'number' ? found.used : undefined };
      setLeaveBalances(prev => ({ ...prev, [employeeId]: { ...(prev[employeeId] || {}), [code]: obj } }));
    } catch (e) {
      console.error('[LeaveApprovals] failed to fetch single leave balance', employeeId, code, e);
    } finally {
      setBalancesLoading(prev => { const s = new Set(prev); s.delete(employeeId); return s; });
    }
  };

  useEffect(() => {
    fetchPending();

    // Also fetch session info to determine approver status and load reporting teams
    (async () => {
      try {
        const s = await fetch(`${getApiBaseUrl()}/api/session`, { credentials: 'include' });
        if (s.ok) {
          const data = await s.json();
          const approverFlag = Boolean(data?.isReportingPerson) || data?.employeeRole === 'admin';
          setIsApprover(approverFlag);
          const superAdminFlag = data?.employeeRole === 'superadmin';
          setIsSuperAdmin(superAdminFlag);
          // default selectedTeam to 'all' for superadmin to match MonthlyAttendance
          if (superAdminFlag && !selectedTeam) setSelectedTeam('all');

          if (approverFlag) {
            // fetch teams and members this approver covers
            try {
              if (data?.employeeRole === 'superadmin') {
                // superadmin gets full team list
                const t = await fetch(`${getApiBaseUrl()}/api/teams`, { credentials: 'include' });
                if (t.ok) {
                  const all = await t.json();
                  setTeams(Array.isArray(all) ? all : []);
                } else {
                  setTeams([]);
                }
                // also load all employees for convenience
                const e = await fetch(`${getApiBaseUrl()}/api/employees`, { credentials: 'include' });
                if (e.ok) {
                  const allEmp = await e.json();
                  setEmployees(Array.isArray(allEmp) ? allEmp : []);
                }
              } else {
                // Use the same endpoint as MonthlyAttendance for reporting teams
                const t = await fetch(`${getApiBaseUrl()}/api/teams/my-reporting-teams`, { credentials: 'include' });
                if (t.ok) {
                  const myTeams = await t.json();
                  // teams from this endpoint are full team objects
                  setTeams(Array.isArray(myTeams) ? myTeams.map((tt: any) => ({ id: tt.id, name: tt.name })) : []);
                  setReportingTeams(null);
                  setReportingTeamsError(null);
                } else {
                  setReportingTeams(null);
                  setTeams([]);
                  setReportingTeamsError(`Failed to fetch reporting teams: ${t.status}`);
                }
              }
            } catch (e) {
              console.error('[LeaveApprovals] failed to fetch reporting teams', e);
              setReportingTeams(null);
              setTeams([]);
              setReportingTeamsError('Failed to load reporting teams');
            }
          }
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    // whenever team changes, load employees for that team (for approvers use reportingTeams members if available)
    const loadTeamMembers = async () => {
      if (!selectedTeam) return;
      setLoadingEmployees(true);
      try {
        if (isSuperAdmin) {
          if (selectedTeam === 'all') {
            const res = await fetch(`${getApiBaseUrl()}/api/employees`, { credentials: 'include' });
            if (res.ok) setEmployees(await res.json());
            else setEmployees([]);
          } else {
            const res = await fetch(`${getApiBaseUrl()}/api/teams/${selectedTeam}/members`, { credentials: 'include' });
            if (res.ok) setEmployees(await res.json());
            else setEmployees([]);
          }
        } else {
          // For non-superadmins, fetch members from the teams API (matches MonthlyAttendance)
          try {
            const res = await fetch(`${getApiBaseUrl()}/api/teams/${selectedTeam}/members`, { credentials: 'include' });
            if (res.ok) {
              const data = await res.json();
              const list = Array.isArray(data) ? data : [];
              setEmployees(list);
              // Auto-select first employee if none selected or if previous selection is not in new list
              const firstId = list.length > 0 ? (list[0].employeeId || list[0].id) : '';
              const exists = list.some((e: any) => (e.employeeId || e.id) === selectedEmployee);
              if (firstId && (!selectedEmployee || !exists)) {
                setSelectedEmployee(firstId);
              }
            } else {
              setEmployees([]);
              setSelectedEmployee('');
            }
          } catch (e) {
            console.error('[LeaveApprovals] failed to fetch team members', e);
            setEmployees([]);
          }
        }
      } catch (e) {
        console.error('[LeaveApprovals] failed to load team members', e);
        setEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    };
    loadTeamMembers();
  }, [selectedTeam, isSuperAdmin]);

  useEffect(() => {
    // re-fetch pending list when filters change
    if (isApprover) {
      const teamFilter = isSuperAdmin && selectedTeam === 'all' ? undefined : (selectedTeam || undefined);
      fetchPending(teamFilter, selectedEmployee || undefined);
    }
  }, [selectedTeam, selectedEmployee, isApprover]);

  const handleApprove = async (id: string) => {
    const p = pending.find(x => x.id === id);
    if (p) {
      const rem = p.employeeId && leaveBalances[p.employeeId] ? leaveBalances[p.employeeId][p.leaveType] : undefined;
      const remaining = rem?.remaining;
      if (typeof remaining !== 'undefined' && remaining < p.days) {
        alert('Insufficient leave balance. Cannot approve.');
        return;
      }
    }

    if (!confirm('Approve this leave?')) return;
    setApproving(id, true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/leaves/${id}/approve`, { method: 'POST', credentials: 'include' });
      if (res.ok) {
        toast({ title: 'Approved', description: 'Leave approved successfully' });
        setPending(p => p.filter(x => x.id !== id));
        // Refresh only this employee's this leave type balance to stay in sync
        try {
          if (p && p.employeeId && p.leaveType) fetchLeaveBalanceFor(p.employeeId, p.leaveType);
        } catch (e) {
          // ignore
        }
      } else {
        const body = await res.text().catch(() => null);
        let err;
        try { err = body ? JSON.parse(body) : { error: body || 'Failed' }; } catch(e) { err = { error: body || 'Failed' }; }
        console.warn('[LeaveApprovals] Approve failed', res.status, err);
        toast({ title: 'Error', description: err.error || 'Failed to approve', variant: 'destructive' });
      }
    } catch (e) { console.error(e); alert('Failed to approve'); } finally { setApproving(id, false); }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Reason for rejection (optional)');
    if (reason === null) return;
    setRejecting(id, true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/leaves/${id}/reject`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
      if (res.ok) {
        toast({ title: 'Rejected', description: 'Leave rejected' });
        setPending(p => p.filter(x => x.id !== id));
        // If we previously marked this id as unauthorized, clear it since the action succeeded
        clearUnauthorizedReject(id);
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        if (res.status === 403) {
          // Mark locally so UI disables the button and shows a clearer message
          markUnauthorizedReject(id);
          toast({ title: 'Not authorized', description: err.error || 'You are not authorized to reject this employee', variant: 'destructive' });
        } else {
          toast({ title: 'Error', description: err.error || 'Failed to reject', variant: 'destructive' });
        }
      }
    } catch (e) { console.error(e); alert('Failed to reject'); } finally { setRejecting(id, false); }
  };

  const fetchEmployeeDetails = async (id?: string) => {
    if (!id) return;
    // mark loading
    setFetchingDetails(prev => { const s = new Set(prev); s.add(id); return s; });
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/employees/${encodeURIComponent(id)}`, { credentials: 'include' });
      if (res.ok) {
        const emp = await res.json();
        setPending(prev => prev.map(r => r.employeeId === id ? ({ ...r, employeeName: r.employeeName || emp.name || id, employeeDepartment: emp.department || r.employeeDepartment, employeeDesignation: emp.designation || r.employeeDesignation }) : r));
        toast({ title: 'Updated', description: `Employee ${emp.name || id} details updated.` });
      } else {
        toast({ title: 'Not found', description: `Employee ${id} not found`, variant: 'destructive' });
      }
    } catch (e) {
      console.error('[LeaveApprovals] fetchEmployeeDetails failed', id, e);
      toast({ title: 'Error', description: 'Failed to fetch employee details', variant: 'destructive' });
    } finally {
      setFetchingDetails(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold">Pending Leave Approvals</h2>
      {/* Team / Employee Filters (for approvers and admins) */}
      {(isApprover || isSuperAdmin) && (
        <div className="mt-3 mb-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Team:</Label>
            <Select value={selectedTeam} onValueChange={(v) => setSelectedTeam(v)}>
              <SelectTrigger className="h-8 text-sm w-56">
                <SelectValue placeholder={isSuperAdmin ? 'All Teams' : 'Select Team'} />
              </SelectTrigger>
              <SelectContent>
                {isSuperAdmin && <SelectItem value="all">All Teams</SelectItem>}
                {Array.isArray(teams) && teams.length === 0 && !isSuperAdmin && (
                  <SelectItem value="no-reporting-teams" disabled>No reporting teams</SelectItem>
                )}
                {Array.isArray(teams) && teams.map((team) => (
                  <SelectItem key={team.id || team.teamId} value={team.id || team.teamId}>{team.name || team.teamName}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Label className="text-sm">Employee:</Label>
            <Select value={selectedEmployee} onValueChange={(v) => setSelectedEmployee(v)} disabled={loadingEmployees}>
              <SelectTrigger className="h-8 text-sm w-56">
                <SelectValue placeholder={loadingEmployees ? '⏳ Loading...' : 'Select Employee'} />
              </SelectTrigger>
              <SelectContent>
                {loadingEmployees ? (
                  <div className="p-2 text-center text-xs text-gray-500">⏳ Loading...</div>
                ) : (
                  Array.isArray(employees) && employees.map((employee) => (
                    <SelectItem key={employee.employeeId || employee.id} value={employee.employeeId || employee.id}>{employee.name || employee.employeeName || employee.employeeId || employee.id}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      {loading && <p>Loading…</p>}
      {!loading && error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && isApprover === false && <p className="text-sm text-muted">You are not an approver for any team.</p>}
      {!loading && !error && reportingTeamsError && (
        <div className="mb-3 text-sm text-red-600">Error loading reporting teams: {reportingTeamsError}</div>
      )}

      {!loading && !error && reportingTeams && reportingTeams.length > 0 && (
        <div className="mb-3">
          <h3 className="font-semibold">Your Teams</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
            {reportingTeams.map((t) => (
              <div key={t.teamId} className="p-2 border rounded">
                <div className="font-semibold text-sm">{t.teamName || t.teamId}</div>
                <div className="text-xs text-muted mt-1">Members:</div>
                <ul className="text-sm mt-1 list-disc list-inside">
                  {t.members.map((m: any) => (
                    <li key={m.tmId}>{m.employeeName || m.employeeId}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
      {!loading && !error && pending.length === 0 && isApprover !== false && <p>No pending leaves</p>}
      <div className="space-y-3 mt-3">
        {pending.map(p => {
          const isHighlighted = p.id === 'd2c909ab-8d98-49c1-81ef-4819ed845720';
          // Local fallback: use logged-in user's profile (from localStorage) if API didn't provide department/designation
          const currentId = (typeof window !== 'undefined') ? localStorage.getItem('employeeId') : null;
          const dept = p.employeeDepartment || (currentId && p.employeeId === currentId ? (localStorage.getItem('employeeDepartment') || null) : null);
          const desig = p.employeeDesignation || (currentId && p.employeeId === currentId ? (localStorage.getItem('employeeDesignation') || null) : null);

          // remaining balance object for leave type (if fetched)
          const remObj = p.employeeId && leaveBalances[p.employeeId] ? leaveBalances[p.employeeId][p.leaveType] : undefined;
          const remainingForThis = remObj?.remaining;
          const allocatedForThis = remObj?.allocated;
          const usedForThis = remObj?.used;
          return (
            <Card
              key={p.id}
              className={
                `w-full shadow-sm hover:shadow-lg transition-shadow border-2 ${isHighlighted ? 'border-amber-500 bg-yellow-50' : 'border-slate-200 bg-white'}`
              }
              style={isHighlighted ? { boxShadow: '0 0 0 4px #f59e42' } : {}}
            >
              <CardHeader className="flex items-start justify-between gap-3 py-2">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${isHighlighted ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-700'}`}>{(p.employeeName || p.employeeId || '').split(' ').map((s: string)=>s[0]).slice(0,2).join('')}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-base font-semibold text-primary leading-tight">{p.employeeName || p.employeeId || 'Unknown'}</div>
                      {p.remark ? (
                        <div className="text-sm italic text-gray-600 mt-1 truncate max-w-[36ch]" title={p.remark}>Applicant: {p.remark}</div>
                      ) : null}
                      {p.approverRemark ? (
                        <div className="text-sm italic text-indigo-700 mt-1 truncate max-w-[36ch]" title={p.approverRemark}>Approver: {p.approverRemark}</div>
                      ) : null}

                      {/* Small badges: leave type (abbrev) and duration */}
                      {p.leaveType && (
                        <span
                          className="inline-block text-xs font-medium px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200"
                          title={p.leaveType}
                          aria-label={`Leave type ${p.leaveType}`}
                        >
                          {((typeof p.leaveType === 'string') ? (p.leaveType.length <= 3 ? p.leaveType : p.leaveType.split(' ').map((s: string)=>s[0]).slice(0,2).join('').toUpperCase()) : p.leaveType)}
                        </span>
                      )}
                      {typeof p.days !== 'undefined' && (
                        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-white">{p.days}d</span>
                      )}

                        {/* Remaining balance for this leave type (if available) */}
                        {p.employeeId && remObj ? (
                          <span className="inline-block text-xs font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 ml-2">{remObj.remaining} left</span>
                        ) : (
                          balancesLoading.has(p.employeeId) ? (
                            <span className="inline-flex items-center text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 ml-2">⏳</span>
                          ) : null
                        )}

                        {/* Progress indicator (if allocated provided) */}
                        {remObj && typeof remObj.allocated === 'number' && remObj.allocated > 0 && (
                          (() => {
                            const allocated = remObj.allocated as number;
                            const used = typeof remObj.used === 'number' ? remObj.used : (allocated - remObj.remaining);
                            const req = Number(p.days || 0);
                            const usedPct = Math.round((used / allocated) * 100);
                            const markerPct = Math.round(((used + req) / allocated) * 100);
                            const showOverflow = used + req > allocated;
                            return (
                              <div className="mt-2 flex items-center gap-3">
                                <div className="w-40 max-w-[160px]">
                                  <div className="h-2 bg-gray-100 rounded-full relative overflow-hidden">
                                    <div style={{ width: `${Math.min(100, usedPct)}%` }} className="h-2 bg-indigo-500" />
                                    <div style={{ left: `${Math.min(100, markerPct)}%` }} className={`absolute top-0 -translate-x-1 w-0.5 h-2 ${showOverflow ? 'bg-red-600' : 'bg-yellow-600'}`} />
                                  </div>
                                </div>
                                <div className="text-xs text-gray-600">Req: <span className="font-semibold">{req}</span> • Rem: <span className="font-semibold">{remObj.remaining}</span></div>
                              </div>
                            );
                          })()
                        )}
                    </div>
                    {(!dept && !desig) ? (
                      <div className="mt-2 text-sm text-gray-500">Not specified
                        {p.employeeId && (
                          <button
                            className="ml-3 text-sm text-blue-600 underline"
                            onClick={() => fetchEmployeeDetails(p.employeeId)}
                            disabled={fetchingDetails.has(p.employeeId)}
                          >
                            {fetchingDetails.has(p.employeeId) ? 'Loading...' : 'Fetch details'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-2">
                        {dept && (
                          <span className="inline-flex items-center text-sm px-1 py-0.5 rounded bg-blue-50 text-blue-800 font-medium border border-blue-100" title={dept}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <rect x="2" y="7" width="20" height="14" rx="2" />
                              <path d="M16 3H8v4h8V3z" />
                            </svg>
                            <span className="truncate">{dept}</span>
                          </span>
                        )}
                        {desig && (
                          <span className="inline-flex items-center text-sm px-1 py-0.5 rounded bg-green-50 text-green-800 font-medium border border-green-100" title={desig}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M12 2l3 6H9l3-6z" />
                              <path d="M6 22v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
                            </svg>
                            <span className="truncate">{desig}</span>
                          </span>
                        )}
                      </div>
                    )}
                    <div className="text-sm text-gray-600 mt-2">
                      {p.appliedAt ? (
                        <span className="text-gray-500">
                          <span className="font-medium text-gray-700">Applied At</span>
                          <span className="mx-1 text-gray-300">•</span>
                          <span className="text-gray-400">{formatDateTime(p.appliedAt)}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
              </div>

            </CardHeader>
            <CardContent className="py-1 min-h-[88px] transition-[height] duration-150 overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                <div className="flex-1 pr-2 md:pr-4">
                  <div className="text-sm font-medium text-gray-800"><span className="font-semibold text-primary">{formatDateShort(p.startDate)}</span> <span className="mx-1 text-gray-400">→</span> <span className="font-semibold text-primary">{formatDateShort(p.endDate)}</span></div>
                  {p.remark && <div className="text-sm text-gray-700 mt-1"><span className="font-semibold text-gray-600">Remark:</span> {p.remark}</div>}
                  <div className="text-sm text-gray-700 mt-1">Email: {p.appliedByEmail ? <a className="text-blue-600 underline" href={`mailto:${p.appliedByEmail}`}>{p.appliedByEmail}</a> : <span className="text-gray-500">—</span>}</div>
                </div>

                <div className="flex flex-col items-end gap-2 md:w-1/2 w-full">
                  {editingId === p.id ? (
                    <div className="w-full">
                      <div className="flex items-center gap-2">
                        <input type="date" min={new Date().toISOString().slice(0,10)} className="input h-8 text-sm" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
                        <input type="date" min={editStart || new Date().toISOString().slice(0,10)} className="input h-8 text-sm" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
                      </div>
                      <input type="text" className="input mt-2" placeholder="Approver remark (optional)" value={editRemark} onChange={(e) => setEditRemark(e.target.value)} />
                      {editError && <div className="text-sm text-red-600 mt-2">{editError}</div>}
                      <div className="flex gap-2 mt-2">
                        <button className="btn bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded shadow-sm flex items-center" disabled={editSaving} onClick={async () => {
                          setEditError(null);
                          if (!editStart || !editEnd) { setEditError('Both start and end dates are required'); return; }
                          if (new Date(editStart) > new Date(editEnd)) { setEditError('Start date must be before or equal to end date'); return; }
                          // Prevent editing to past dates
                          const today = new Date(); today.setHours(0,0,0,0);
                          const s = new Date(editStart); s.setHours(0,0,0,0);
                          if (s < today) { setEditError('Start date must be today or a future date'); return; }
                          try {
                            // Validate dates against Sundays/holidays before patching
                            try {
                              const vres = await fetch(`${getApiBaseUrl()}/api/leaves/validate-dates`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ startDate: editStart, endDate: editEnd }) });
                              if (vres.ok) {
                                const vd = await vres.json();
                                if (!vd.valid && Array.isArray(vd.invalidDates) && vd.invalidDates.length > 0) {
                                  setEditError(`Selected range contains disallowed dates: ${vd.invalidDates.map((d:any)=>d.date+ ' ('+ (d.reason==='sunday'?'Sunday': (d.holidayName ? `Holiday: ${d.holidayName}` : 'Holiday')) +')').join(', ')}`);
                                  return;
                                }
                              } else {
                                const vd = await vres.json().catch(() => ({}));
                                if (Array.isArray(vd.invalidDates) && vd.invalidDates.length > 0) {
                                  setEditError(`Selected range contains disallowed dates: ${vd.invalidDates.map((d:any)=>d.date+ ' ('+ (d.reason==='sunday'?'Sunday': (d.holidayName ? `Holiday: ${d.holidayName}` : 'Holiday')) +')').join(', ')}`);
                                  return;
                                }
                              }
                            } catch (valErr) {
                              console.error('[LeaveApprovals] Date validation failed', valErr);
                              // allow to continue if validation failed unexpectedly
                            }

                            setEditSaving(true);
                            const res = await fetch(`${getApiBaseUrl()}/api/leaves/${p.id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ startDate: editStart, endDate: editEnd, approverRemark: editRemark }) });
                            if (res.ok) {
                              const updatedJson = await res.json();
                              // Merge server response with local object to preserve display-only fields like appliedByEmail/name
                              const merged = { ...p, ...updatedJson };
                              merged.employeeName = merged.employeeName || p.employeeName || p.employeeId;
                              merged.employeeDepartment = merged.employeeDepartment || p.employeeDepartment;
                              merged.employeeDesignation = merged.employeeDesignation || p.employeeDesignation;
                              merged.appliedByName = merged.appliedByName || p.appliedByName;
                              merged.appliedByEmail = merged.appliedByEmail || p.appliedByEmail;
                              // preserve applicant remark and merge approver remark separately
                              merged.remark = p.remark || merged.remark;
                              merged.approverRemark = merged.approverRemark || p.approverRemark;
                              setPending(prev => prev.map(x => x.id === p.id ? merged : x));
                              setEditingId(null);
                              toast({ title: 'Saved', description: 'Leave dates updated' });
                            } else {
                              const body = await res.json().catch(() => ({ error: 'Failed' }));
                              setEditError(body.error || 'Failed to save');
                            }
                          } catch (e) {
                            console.error(e);
                            setEditError('Failed to save');
                          } finally { setEditSaving(false); }
                        }}>{editSaving ? (<><svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg><span>Saving...</span></>) : 'Save'}</button>
                        <button className="btn btn-ghost" disabled={editSaving} onClick={() => { setEditingId(null); setEditError(null); }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      {isApprover && (
                        <button
                          className="btn btn-sm mb-1 px-3 rounded shadow-sm border border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 flex items-center"
                          title="Edit leave dates"
                          aria-label={`Edit leave ${p.id}`}
                          onClick={() => { setEditingId(p.id); setEditStart(p.startDate); setEditEnd(p.endDate); setEditRemark(p.approverRemark || ''); setEditError(null); }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                          <span>Edit</span>
                        </button>
                      )}
                      <div className="flex gap-2 items-center">
                        { (typeof remainingForThis !== 'undefined' && remainingForThis < p.days) && (
                          <div className="text-xs text-red-700 font-semibold mr-2">Insufficient balance</div>
                        )}

                        <button disabled={(typeof remainingForThis !== 'undefined' && remainingForThis < p.days) || approvingIds.has(p.id) || rejectingIds.has(p.id)} className={`${(typeof remainingForThis !== 'undefined' && remainingForThis < p.days) ? 'btn btn-sm px-4 py-1 rounded shadow-sm border bg-gray-200 text-gray-600 cursor-not-allowed' : 'btn btn-sm bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded shadow-sm'} flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-400`} title={typeof remainingForThis !== 'undefined' && remainingForThis < p.days ? 'Insufficient leave balance' : 'Approve leave'} aria-label={`Approve leave ${p.id}`} onClick={() => handleApprove(p.id)}>
                          {approvingIds.has(p.id) ? (
                            <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                          <span>{approvingIds.has(p.id) ? 'Approving...' : 'Approve'}</span>
                        </button>

                        <button disabled={unauthorizedRejectIds.has(p.id) || approvingIds.has(p.id) || rejectingIds.has(p.id)} className={`${(unauthorizedRejectIds.has(p.id) || approvingIds.has(p.id) || rejectingIds.has(p.id)) ? 'btn btn-sm px-4 py-1 rounded shadow-sm border bg-gray-200 text-gray-600 cursor-not-allowed' : 'btn btn-sm bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded shadow-sm'} flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-400`} title={unauthorizedRejectIds.has(p.id) ? 'Not authorized to reject this employee' : 'Reject leave'} aria-label={`Reject leave ${p.id}`} onClick={() => handleReject(p.id)}>
                          {rejectingIds.has(p.id) ? (
                            <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          )}
                          <span>{rejectingIds.has(p.id) ? 'Rejecting...' : (unauthorizedRejectIds.has(p.id) ? 'Not authorized' : 'Reject')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      </div>
      <div className="mt-4">
        <button className="btn bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded shadow" onClick={() => fetchPending(isSuperAdmin && selectedTeam === 'all' ? undefined : (selectedTeam || undefined), selectedEmployee || undefined)}>Refresh</button>
      </div>
    </div>
  );
};

export default LeaveApprovals;
