import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';
import { authenticatedFetch } from '@/lib/fetchWithLoader';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Employee {
  id: string;
  name: string;
  email: string;
  emp_code?: string;
  departmentId: string;
  designationId: string;
}

interface LeaveAllotment {
  id?: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  year: number;
  medicalLeave: number;
  casualLeave: number;
  earnedLeave: number;
  sickLeave: number;
  personalLeave: number;
  unpaidLeave: number;
  leaveWithoutPay: number;
  carryForwardEarned?: boolean;
  carryForwardPersonal?: boolean;
  usedMedicalLeave?: number;
  usedCasualLeave?: number;
  usedEarnedLeave?: number;
  usedSickLeave?: number;
  usedPersonalLeave?: number;
  usedUnpaidLeave?: number;
  usedLeaveWithoutPay?: number;
}

export default function LeaveAllotment() {
  // Role-based access control
  const employeeRole = localStorage.getItem('employeeRole')?.toLowerCase() || '';
  const isAllowed = employeeRole === 'admin' || employeeRole === 'superadmin';
  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="max-w-md w-full bg-white shadow rounded p-8">
          <h2 className="text-xl font-bold mb-2">Not Authorized</h2>
          <p className="mb-4">You do not have permission to view this page.</p>
          <Button variant="outline" onClick={() => window.location.href = '/'}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allotments, setAllotments] = useState<LeaveAllotment[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [mode, setMode] = useState<'individual' | 'bulk'>('individual');
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<LeaveAllotment | null>(null);
  const [editForceOverride, setEditForceOverride] = useState(false);
  const [editForceReason, setEditForceReason] = useState('');
  const [editNextYearAllotmentExists, setEditNextYearAllotmentExists] = useState(false);
  
  // Individual form state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [formData, setFormData] = useState<Omit<LeaveAllotment, 'id' | 'employeeId' | 'employeeName'>>({
    year: new Date().getFullYear(),
    medicalLeave: 12,
    casualLeave: 12,
    earnedLeave: 15,
    sickLeave: 7,
    personalLeave: 5,
    unpaidLeave: 0,
    leaveWithoutPay: 0,
    carryForwardEarned: false,
    carryForwardPersonal: false,
  });

  const [nextYearAllotmentExists, setNextYearAllotmentExists] = useState(false);
  const [checkingNextYear, setCheckingNextYear] = useState(false);
  const [forceOverride, setForceOverride] = useState(false);
  const [forceReason, setForceReason] = useState('');

  // Bulk form state
  const [bulkData, setBulkData] = useState({
    medicalLeave: 12,
    casualLeave: 12,
    earnedLeave: 15,
    sickLeave: 7,
    personalLeave: 5,
    unpaidLeave: 0,
    leaveWithoutPay: 0,
    carryForwardEarned: false,
    carryForwardPersonal: false,
  });

  const [bulkForceOverride, setBulkForceOverride] = useState(false);
  const [bulkForceReason, setBulkForceReason] = useState('');

  useEffect(() => {
    fetchEmployees();
    fetchAllotments();
  }, [selectedYear]);

  // Keep the individual form year in sync with the header year selector
  useEffect(() => {
    setFormData((prev) => ({ ...prev, year: selectedYear }));
  }, [selectedYear]);

  // Check if selected employee has an allotment for next year (lock current year if so)
  useEffect(() => {
    let cancelled = false;
    const checkNext = async () => {
      if (!selectedEmployeeId || !formData.year) {
        setNextYearAllotmentExists(false);
        return;
      }
      setCheckingNextYear(true);
      try {
        const nextYear = Number(formData.year) + 1;
        const res = await authenticatedFetch(`${getApiBaseUrl()}/api/leave-allotments/employee/${selectedEmployeeId}/${nextYear}/exists`);
        if (!cancelled) {
          if (res.ok) {
            const d = await res.json();
            setNextYearAllotmentExists(!!d.exists);
          } else {
            setNextYearAllotmentExists(false);
          }
        }
      } catch (e) {
        console.error('Failed to check next year allotment', e);
        if (!cancelled) setNextYearAllotmentExists(false);
      } finally {
        if (!cancelled) setCheckingNextYear(false);
      }
    };

    checkNext();
    return () => { cancelled = true; };
  }, [selectedEmployeeId, formData.year]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch(`${getApiBaseUrl()}/api/employees?pageSize=1000`);
      if (response.ok) {
        const result = await response.json();
        const employeeData = result.data || [];
        setEmployees(employeeData.filter((emp: Employee) => emp.id));
      } else {
        console.error('Failed to fetch employees:', response.status);
        toast({
          title: 'Error',
          description: 'Failed to load employees',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: 'Error',
        description: 'Failed to load employees',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllotments = async () => {
    try {
      const response = await authenticatedFetch(`${getApiBaseUrl()}/api/leave-allotments/allotments?year=${selectedYear}`);
      if (response.ok) {
        const data = await response.json();
        setAllotments(data);
      }
    } catch (error) {
      console.error('Error fetching leave allotments:', error);
    }
  };

  const handleIndividualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployeeId) {
      toast({
        title: 'Error',
        description: 'Please select an employee',
        variant: 'destructive',
      });
      return;
    }

    if (nextYearAllotmentExists) {
      toast({
        title: 'Locked',
        description: 'Cannot allot leave for this year because a next-year allotment exists. Delete or modify the next-year allotment first.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (forceOverride && !forceReason) {
        toast({ title: 'Reason required', description: 'Please provide a reason for the override', variant: 'destructive' });
        return;
      }
      setLoading(true);
      const payload: any = {
        employeeId: selectedEmployeeId,
        ...formData,
      };
      if (forceOverride) {
        payload.forceOverride = true;
        payload.forceReason = forceReason || 'Forced by admin';
      }
      console.log('[LeaveAllotment] Submitting individual allotment payload:', payload);
      const response = await authenticatedFetch(`${getApiBaseUrl()}/api/leave-allotments/allotments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Leave allotted successfully',
        });
        fetchAllotments();
        setSelectedEmployeeId('');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to allot leave');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async () => {
    try {
      if (bulkForceOverride && !bulkForceReason) {
        toast({ title: 'Reason required', description: 'Please provide a reason for the bulk override', variant: 'destructive' });
        return;
      }
      setLoading(true);
      const payload: any = { year: selectedYear, ...bulkData };
      if (bulkForceOverride) {
        payload.forceOverride = true;
        payload.forceReason = bulkForceReason || 'Forced by admin';
      }
      console.log('[LeaveAllotment] Submitting bulk allotment payload:', payload);
      const response = await authenticatedFetch(`${getApiBaseUrl()}/api/leave-allotments/allotments/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: 'Success',
          description: `Leave allotted to ${result.count} employees`,
        });
        fetchAllotments();
        setShowBulkDialog(false);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to allot leaves');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (allotment: LeaveAllotment) => {
    setEditingId(allotment.id!);
    setEditData({ ...allotment });
    // Reset override state for a fresh edit
    setEditForceOverride(false);
    setEditForceReason('');
    setEditNextYearAllotmentExists(false);

    // Check if next-year allotment exists for this employee so we can show the override UI
    try {
      if (allotment.employeeId && typeof allotment.year !== 'undefined') {
        const res = await authenticatedFetch(`${getApiBaseUrl()}/api/leave-allotments/employee/${allotment.employeeId}/${allotment.year + 1}/exists`);
        if (res.ok) {
          const d = await res.json();
          const exists = !!d.exists;
          setEditNextYearAllotmentExists(exists);
          if (exists) {
            // Inform the user via toast (avoid inline messages that disrupt the grid layout)
            toast({
              title: 'Locked',
              description: 'A next-year allotment exists for this employee. Enable Force override to edit; this action will be recorded in the audit log.',
              variant: 'destructive',
            });
          }
        } else {
          setEditNextYearAllotmentExists(false);
        }
      }
    } catch (e) {
      console.warn('Failed to check next-year existence on edit:', e);
      setEditNextYearAllotmentExists(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData(null);
    setEditNextYearAllotmentExists(false);
    setEditForceOverride(false);
    setEditForceReason('');
  };

  const handleSaveEdit = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!editData || !editingId) return;

    // If next-year allotment exists for this employee, prevent saving edits to this year
    if (typeof editData.employeeId !== 'undefined' && editData.employeeId) {
      try {
        const res = await authenticatedFetch(`${getApiBaseUrl()}/api/leave-allotments/employee/${editData.employeeId}/${editData.year + 1}/exists`);
        if (res.ok) {
          const d = await res.json();
          if (d.exists && !editForceOverride) {
            toast({ title: 'Locked', description: 'Cannot modify this allotment because a next-year allotment exists. Delete the next-year allotment first or use Force override.', variant: 'destructive' });
            return;
          }
          if (d.exists && editForceOverride && !editForceReason) {
            toast({ title: 'Reason required', description: 'Please provide a reason for override', variant: 'destructive' });
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to check next-year existence before save:', e);
      }
    }

    try {
      setLoading(true);
      const payload: any = {
        employeeId: editData.employeeId,
        year: editData.year,
        medicalLeave: editData.medicalLeave,
        casualLeave: editData.casualLeave,
        earnedLeave: editData.earnedLeave,
        sickLeave: editData.sickLeave,
        personalLeave: editData.personalLeave,
        unpaidLeave: editData.unpaidLeave,
        leaveWithoutPay: editData.leaveWithoutPay,
        carryForwardEarned: !!editData.carryForwardEarned,
        carryForwardPersonal: !!editData.carryForwardPersonal,
      };

      if (editForceOverride) {
        payload.forceOverride = true;
        payload.forceReason = editForceReason || 'Forced by admin';
      }

      const response = await authenticatedFetch(`${getApiBaseUrl()}/api/leave-allotments/allotments/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Leave allotment updated successfully',
        });
        fetchAllotments();
        setEditingId(null);
        setEditData(null);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update leave allotment');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, used: number, employeeId?: string, year?: number) => {
    // Client-side friendly checks before attempting delete
    if (used > 0) {
      toast({
        title: 'Cannot delete',
        description: `This allotment cannot be deleted because ${used} day(s) of leave have already been consumed. Adjust leave records before deleting.`,
        variant: 'destructive',
      });
      return;
    }

    // Check for next-year allotment existence when we have employee/year info
    if (employeeId && typeof year !== 'undefined') {
      try {
        const checkRes = await authenticatedFetch(`${getApiBaseUrl()}/api/leave-allotments/employee/${employeeId}/${year + 1}/exists`);
        if (checkRes.ok) {
          const d = await checkRes.json();
          if (d.exists) {
            toast({
              title: 'Cannot delete',
              description: 'A next-year allotment exists for this employee. Delete or modify the next-year allotment before deleting this one.',
              variant: 'destructive',
            });
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to check next-year existence before delete:', e);
        // Continue to confirmation — server will still block if next-year exists
      }
    }

    if (!confirm('Are you sure you want to delete this leave allotment?')) return;

    try {
      setLoading(true);
      const response = await authenticatedFetch(`${getApiBaseUrl()}/api/leave-allotments/allotments/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Leave allotment deleted successfully',
        });
        fetchAllotments();
      } else {
        // Parse server error message if available and show it to the user
        let errMsg = `Delete failed (${response.status})`;
        try {
          const body = await response.json();
          errMsg = body.error || body.message || errMsg;
        } catch (e) {
          // ignore JSON parse error
        }
        toast({
          title: 'Error',
          description: errMsg,
          variant: 'destructive',
        });
        console.error('[LeaveAllotment] Delete failed', response.status, errMsg);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete leave allotment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && allotments.length === 0) {
    return <SkeletonLoader />;
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Leave Allotment</span>
            <div className="flex gap-2">
              <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={mode === 'individual' ? 'default' : 'outline'}
              onClick={() => setMode('individual')}
            >
              Individual Allotment
            </Button>
            <Button
              variant={mode === 'bulk' ? 'default' : 'outline'}
              onClick={() => setMode('bulk')}
            >
              Bulk Allotment
            </Button>
          </div>

          {/* Individual Allotment Form */}
          {mode === 'individual' && (
            <form onSubmit={handleIndividualSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="col-span-full">
                  <Label>Select Employee *</Label>
                  <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.emp_code ? `${emp.emp_code} — ${emp.name}` : emp.name} ({emp.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {checkingNextYear ? (
                    <div className="text-xs text-gray-500 mt-1">Checking next-year allotment...</div>
                  ) : nextYearAllotmentExists ? (
                    <div className="mt-1">
                      <div className="text-sm text-red-600">A next-year allotment exists. Creating or editing this year is locked.</div>
                      <div className="mt-2 flex items-center gap-3">
                        <input type="checkbox" checked={forceOverride} onChange={(e) => setForceOverride(e.target.checked)} id="force-override" className="h-4 w-4" />
                        <label htmlFor="force-override" className="text-sm">Force override (admin action)</label>
                      </div>
                      {forceOverride ? (
                        <div className="mt-2">
                          <label className="text-xs text-gray-600">Reason for override (required)</label>
                          <input type="text" value={forceReason} onChange={(e) => setForceReason(e.target.value)} className="w-full mt-1 border p-1 rounded" placeholder="Enter reason for audit log" />
                        </div>
                      ) : null}
                      <div className="text-xs text-gray-500 mt-1">Force override will allow creating/updating despite next-year allotments and will be recorded in the audit log.</div>
                    </div>
                  ) : null}
                </div>

                <div>
                  <Label>Year *</Label>
                  <Input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    min={2020}
                    max={2100}
                    required
                  />
                </div>

                <div>
                  <Label>Medical Leave (ML)</Label>
                  <Input
                    type="number"
                    value={formData.medicalLeave}
                    onChange={(e) => setFormData({ ...formData, medicalLeave: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>

                <div>
                  <Label>Casual Leave (CL)</Label>
                  <Input
                    type="number"
                    value={formData.casualLeave}
                    onChange={(e) => setFormData({ ...formData, casualLeave: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>

                <div>
                  <Label>Earned Leave (EL)</Label>
                  <Input
                    type="number"
                    value={formData.earnedLeave}
                    onChange={(e) => setFormData({ ...formData, earnedLeave: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>

                <div>
                  <Label>Sick Leave (SL)</Label>
                  <Input
                    type="number"
                    value={formData.sickLeave}
                    onChange={(e) => setFormData({ ...formData, sickLeave: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>

                <div>
                  <Label>Personal Leave (PL)</Label>
                  <Input
                    type="number"
                    value={formData.personalLeave}
                    onChange={(e) => setFormData({ ...formData, personalLeave: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>

                <div>
                  <Label>Unpaid Leave (UL)</Label>
                  <Input
                    type="number"
                    value={formData.unpaidLeave}
                    onChange={(e) => setFormData({ ...formData, unpaidLeave: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>

                <div>
                  <Label>Leave Without Pay (LWP)</Label>
                  <Input
                    type="number"
                    value={formData.leaveWithoutPay}
                    onChange={(e) => setFormData({ ...formData, leaveWithoutPay: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>
              </div>
                <div>
                  <Label>Carry Forward Option</Label>
                  <select
                    value={formData.carryForwardEarned && formData.carryForwardPersonal ? 'BOTH' : formData.carryForwardEarned ? 'EL' : formData.carryForwardPersonal ? 'PL' : 'NONE'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        carryForwardEarned: val === 'EL' || val === 'BOTH',
                        carryForwardPersonal: val === 'PL' || val === 'BOTH',
                      });
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="NONE">None</option>
                    <option value="EL">Earned Leave (EL)</option>
                    <option value="PL">Personal Leave (PL)</option>
                    <option value="BOTH">Both (EL & PL)</option>
                  </select>
                </div>
              <Button type="submit" disabled={loading || nextYearAllotmentExists}>
                {loading ? 'Allotting...' : (nextYearAllotmentExists ? 'Locked (next-year exists)' : 'Allot Leave')}
              </Button>
            </form>
          )}

          {/* Bulk Allotment */}
          {mode === 'bulk' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Bulk allotment will assign the same leave balance to all active employees for the selected year.
              </p>
              <Button onClick={() => setShowBulkDialog(true)} disabled={loading}>
                Open Bulk Allotment Form
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allotments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Allotments for {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-center">ML</TableHead>
                  <TableHead className="text-center">CL</TableHead>
                  <TableHead className="text-center">EL</TableHead>
                  <TableHead className="text-center">SL</TableHead>
                  <TableHead className="text-center">PL</TableHead>
                  <TableHead className="text-center">UL</TableHead>
                  <TableHead className="text-center">LWP</TableHead>
                  <TableHead className="text-center">Carry Forward</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Used</TableHead>
                  <TableHead className="text-center">Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allotments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center text-muted-foreground">
                      No leave allotments found for {selectedYear}
                    </TableCell>
                  </TableRow>
                ) : (
                  allotments.map((allotment) => {
                    const total =
                      allotment.medicalLeave +
                      allotment.casualLeave +
                      allotment.earnedLeave +
                      allotment.sickLeave +
                      allotment.personalLeave +
                      allotment.unpaidLeave +
                      allotment.leaveWithoutPay;
                    
                    const used =
                      (allotment.usedMedicalLeave || 0) +
                      (allotment.usedCasualLeave || 0) +
                      (allotment.usedEarnedLeave || 0) +
                      (allotment.usedSickLeave || 0) +
                      (allotment.usedPersonalLeave || 0) +
                      (allotment.usedUnpaidLeave || 0) +
                      (allotment.usedLeaveWithoutPay || 0);
                    
                    const balance = total - used;
                    const isEditing = editingId === allotment.id;

                    return (
                      <TableRow key={allotment.id}>
                        <TableCell className="font-semibold text-blue-600">{allotment.employeeCode || 'N/A'}</TableCell>
                        <TableCell className="font-medium">{allotment.employeeName}</TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editData?.medicalLeave}
                              onChange={(e) => setEditData({ ...editData!, medicalLeave: parseInt(e.target.value) || 0 })}
                              className="w-16 h-8 text-center"
                              min={0}
                            />
                          ) : (
                            allotment.medicalLeave
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editData?.casualLeave}
                              onChange={(e) => setEditData({ ...editData!, casualLeave: parseInt(e.target.value) || 0 })}
                              className="w-16 h-8 text-center"
                              min={0}
                            />
                          ) : (
                            allotment.casualLeave
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editData?.earnedLeave}
                              onChange={(e) => setEditData({ ...editData!, earnedLeave: parseInt(e.target.value) || 0 })}
                              className="w-16 h-8 text-center"
                              min={0}
                            />
                          ) : (
                            allotment.earnedLeave
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editData?.sickLeave}
                              onChange={(e) => setEditData({ ...editData!, sickLeave: parseInt(e.target.value) || 0 })}
                              className="w-16 h-8 text-center"
                              min={0}
                            />
                          ) : (
                            allotment.sickLeave
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editData?.personalLeave}
                              onChange={(e) => setEditData({ ...editData!, personalLeave: parseInt(e.target.value) || 0 })}
                              className="w-16 h-8 text-center"
                              min={0}
                            />
                          ) : (
                            allotment.personalLeave
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editData?.unpaidLeave}
                              onChange={(e) => setEditData({ ...editData!, unpaidLeave: parseInt(e.target.value) || 0 })}
                              className="w-16 h-8 text-center"
                              min={0}
                            />
                          ) : (
                            allotment.unpaidLeave
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editData?.leaveWithoutPay}
                              onChange={(e) => setEditData({ ...editData!, leaveWithoutPay: parseInt(e.target.value) || 0 })}
                              className="w-16 h-8 text-center"
                              min={0}
                            />
                          ) : (
                            allotment.leaveWithoutPay
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          {isEditing ? (
                            <select
                              value={editData?.carryForwardEarned && editData?.carryForwardPersonal ? 'BOTH' : editData?.carryForwardEarned ? 'EL' : editData?.carryForwardPersonal ? 'PL' : 'NONE'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditData({
                                  ...editData!,
                                  carryForwardEarned: val === 'EL' || val === 'BOTH',
                                  carryForwardPersonal: val === 'PL' || val === 'BOTH',
                                });
                              }}
                              className="block w-28 mx-auto border border-gray-200 rounded px-1 py-0.5"
                            >
                              <option value="NONE">None</option>
                              <option value="EL">EL</option>
                              <option value="PL">PL</option>
                              <option value="BOTH">Both</option>
                            </select>
                          ) : (
                            (allotment.carryForwardEarned && allotment.carryForwardPersonal) ? 'Both' : (allotment.carryForwardEarned ? 'EL' : (allotment.carryForwardPersonal ? 'PL' : 'None'))
                          )}
                        </TableCell>

                        <TableCell className="text-center font-semibold">{total}</TableCell>
                        <TableCell className="text-center text-red-600">{used}</TableCell>
                        <TableCell className="text-center text-green-600 font-semibold">{balance}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {isEditing ? (
                              <>
                                {editNextYearAllotmentExists ? (
                                  <div className="flex items-center gap-3 mr-2" title="A next-year allotment exists; enable Force override to edit. This will be recorded in the audit log.">
                                    <label className="inline-flex items-center gap-2">
                                      <input type="checkbox" checked={editForceOverride} onChange={(e) => setEditForceOverride(e.target.checked)} className="h-4 w-4" />
                                      <span className="text-sm">Force override</span>
                                    </label>
                                    {editForceOverride ? (
                                      <input type="text" value={editForceReason} onChange={(e) => setEditForceReason(e.target.value)} placeholder="Reason for override" className="border p-1 rounded text-sm ml-2" />
                                    ) : null}
                                  </div>
                                ) : null}
                                <Button
                                  type="button"
                                  variant="default"
                                  size="sm"
                                  onClick={handleSaveEdit}
                                  disabled={loading || (editNextYearAllotmentExists && !editForceOverride)}
                                  title={editNextYearAllotmentExists && !editForceOverride ? 'Next-year allotment exists; enable Force override to save' : undefined}
                                >
                                  Save
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => { setEditForceOverride(false); setEditForceReason(''); setEditNextYearAllotmentExists(false); handleCancelEdit(); }}
                                  disabled={loading}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(allotment)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDelete(allotment.id!, used, allotment.employeeId, allotment.year)}
                                  disabled={loading}
                                  title={used > 0 ? 'Click to see why deletion is blocked' : undefined}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Allotment Dialog */}
      <AlertDialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk Leave Allotment for {selectedYear}</AlertDialogTitle>
            <AlertDialogDescription>
              Set leave balances for all active employees. Existing allotments will be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid grid-cols-2 gap-4 my-4">
            <div>
              <Label>Medical Leave (ML)</Label>
              <Input
                type="number"
                value={bulkData.medicalLeave}
                onChange={(e) => setBulkData({ ...bulkData, medicalLeave: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>

            <div>
              <Label>Casual Leave (CL)</Label>
              <Input
                type="number"
                value={bulkData.casualLeave}
                onChange={(e) => setBulkData({ ...bulkData, casualLeave: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>

            <div>
              <Label>Earned Leave (EL)</Label>
              <Input
                type="number"
                value={bulkData.earnedLeave}
                onChange={(e) => setBulkData({ ...bulkData, earnedLeave: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>

            <div>
              <Label>Sick Leave (SL)</Label>
              <Input
                type="number"
                value={bulkData.sickLeave}
                onChange={(e) => setBulkData({ ...bulkData, sickLeave: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>

            <div>
              <Label>Personal Leave (PL)</Label>
              <Input
                type="number"
                value={bulkData.personalLeave}
                onChange={(e) => setBulkData({ ...bulkData, personalLeave: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>

            <div>
              <Label>Unpaid Leave (UL)</Label>
              <Input
                type="number"
                value={bulkData.unpaidLeave}
                onChange={(e) => setBulkData({ ...bulkData, unpaidLeave: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>

            <div>
              <Label>Leave Without Pay (LWP)</Label>
              <Input
                type="number"
                value={bulkData.leaveWithoutPay}
                onChange={(e) => setBulkData({ ...bulkData, leaveWithoutPay: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>

            <div className="col-span-full">
              <Label>Carry Forward Option</Label>
              <select
                value={bulkData.carryForwardEarned && bulkData.carryForwardPersonal ? 'BOTH' : bulkData.carryForwardEarned ? 'EL' : bulkData.carryForwardPersonal ? 'PL' : 'NONE'}
                onChange={(e) => {
                  const val = e.target.value;
                  setBulkData({
                    ...bulkData,
                    carryForwardEarned: val === 'EL' || val === 'BOTH',
                    carryForwardPersonal: val === 'PL' || val === 'BOTH',
                  });
                }}
                className="mt-1 block w-full border border-gray-300 rounded px-2 py-1"
              >
                <option value="NONE">None</option>
                <option value="EL">Earned Leave (EL)</option>
                <option value="PL">Personal Leave (PL)</option>
                <option value="BOTH">Both (EL & PL)</option>
              </select>

              <div className="mt-3">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={bulkForceOverride} onChange={(e) => setBulkForceOverride(e.target.checked)} className="h-4 w-4" />
                  <span className="text-sm">Force override for bulk (record audit)</span>
                </label>
                {bulkForceOverride ? (
                  <div className="mt-2">
                    <label className="text-xs text-gray-600">Reason (required)</label>
                    <input type="text" value={bulkForceReason} onChange={(e) => setBulkForceReason(e.target.value)} className="w-full mt-1 border p-1 rounded" placeholder="Reason for audit log" />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkSubmit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Processing...' : 'Allot to All Employees'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
