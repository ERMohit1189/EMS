import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';
import { SkeletonLoader } from '@/components/SkeletonLoader';

interface AllowanceData {
  travelAllowance: number;
  foodAllowance: number;
  accommodationAllowance: number;
  mobileAllowance: number;
  internetAllowance: number;
  utilitiesAllowance: number;
  parkingAllowance: number;
  miscAllowance: number;
  notes: string;
}

interface AllowanceEntry {
  id: string;
  employeeId?: string;
  employeeName?: string;
  date: string;
  teamId?: string;
  teamName?: string;
  allowanceData: string;
  approvalStatus: 'pending' | 'processing' | 'approved' | 'rejected';
  paidStatus: 'unpaid' | 'partial' | 'full';
  approvalCount?: number;
  approvedBy?: string;
  approvedAt?: string;
}

interface Team {
  id: string;
  name: string;
}

interface TeamMember {
  employeeId: string;
  name: string;
}

export default function Allowances() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<{
    date: string;
    teamId: string;
    travelAllowance: string;
    foodAllowance: string;
    accommodationAllowance: string;
    mobileAllowance: string;
    internetAllowance: string;
    utilitiesAllowance: string;
    parkingAllowance: string;
    miscAllowance: string;
    notes: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    teamId: '',
    travelAllowance: '',
    foodAllowance: '',
    accommodationAllowance: '',
    mobileAllowance: '',
    internetAllowance: '',
    utilitiesAllowance: '',
    parkingAllowance: '',
    miscAllowance: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [submittedEntries, setSubmittedEntries] = useState<AllowanceEntry[]>([]);
  const [employeeId] = useState(localStorage.getItem('employeeId') || '');
  const [caps, setCaps] = useState<any>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  
  // Month/Year filter - default to current month
  const now = new Date();
  const defaultMonth = String(now.getMonth() + 1).padStart(2, '0');
  const defaultYear = String(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(defaultYear);

  const validateAllowances = (data: typeof formData, capsData: any): boolean => {
    const travel = parseFloat(data.travelAllowance) || 0;
    const food = parseFloat(data.foodAllowance) || 0;
    const accom = parseFloat(data.accommodationAllowance) || 0;
    const mobile = parseFloat(data.mobileAllowance) || 0;
    const internet = parseFloat(data.internetAllowance) || 0;
    const utilities = parseFloat(data.utilitiesAllowance) || 0;
    const parking = parseFloat(data.parkingAllowance) || 0;
    const misc = parseFloat(data.miscAllowance) || 0;

    if (capsData.travelAllowance && travel > parseFloat(capsData.travelAllowance)) return false;
    if (capsData.foodAllowance && food > parseFloat(capsData.foodAllowance)) return false;
    if (capsData.accommodationAllowance && accom > parseFloat(capsData.accommodationAllowance)) return false;
    if (capsData.mobileAllowance && mobile > parseFloat(capsData.mobileAllowance)) return false;
    if (capsData.internetAllowance && internet > parseFloat(capsData.internetAllowance)) return false;
    if (capsData.utilitiesAllowance && utilities > parseFloat(capsData.utilitiesAllowance)) return false;
    if (capsData.parkingAllowance && parking > parseFloat(capsData.parkingAllowance)) return false;
    if (capsData.miscAllowance && misc > parseFloat(capsData.miscAllowance)) return false;
    return true;
  };

  const fetchTeams = async () => {
    if (!employeeId) {
      console.log('Fetching teams skipped - no employeeId');
      return [];
    }
    try {
      const url = `${getApiBaseUrl()}/api/teams/employee/${employeeId}`;
      console.log('Fetching teams from:', url);
      const response = await fetch(url);
      console.log('Teams response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Teams fetched:', data);
        return data || [];
      } else {
        const error = await response.text();
        console.error('Teams API error:', response.status, error);
        return [];
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      return [];
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    try {
      const url = `${getApiBaseUrl()}/api/teams/${teamId}/members`;
      console.log('Fetching team members from:', url);
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('Team members fetched:', data);
        setTeamMembers(data || []);
        setSelectedMemberIds(new Set());
      } else {
        console.error('Team members API error:', response.status);
        setTeamMembers([]);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
      setTeamMembers([]);
    }
  };

  const fetchAllowancesParallel = async (skipLoading = false, month?: string, year?: string) => {
    if (!employeeId) return;
    try {
      if (!skipLoading) setLoading(true);
      const m = month || selectedMonth;
      const y = year || selectedYear;
      console.log(`Fetching allowances for ${employeeId}, month: ${m}, year: ${y}`);
      
      // Parallel fetch: allowances + teams at the same time
      const [allowancesRes, teamsData] = await Promise.all([
        fetch(`${getApiBaseUrl()}/api/allowances/${employeeId}?month=${m}&year=${y}`),
        fetchTeams()
      ]);
      
      if (allowancesRes.ok) {
        const data = await allowancesRes.json();
        console.log(`Received ${data.data?.length || 0} allowances`);
        console.log('Allowances data:', data.data);
        setSubmittedEntries(data.data || []);
      } else {
        console.error('API error:', allowancesRes.status);
      }
      
      setTeams(teamsData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      if (!skipLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllowancesParallel(false, defaultMonth, defaultYear);
    // Load allowance caps from settings
    const allowanceCaps = localStorage.getItem('allowanceCaps');
    if (allowanceCaps) {
      setCaps(JSON.parse(allowanceCaps));
    }

    // Listen for storage changes (when caps are updated in Settings)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'allowanceCaps' && e.newValue) {
        setCaps(JSON.parse(e.newValue));
        console.log('Allowance caps updated from storage:', JSON.parse(e.newValue));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [employeeId]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Check if caps are set and form has values
      const hasValues = formData.travelAllowance || formData.foodAllowance || formData.accommodationAllowance || 
                        formData.mobileAllowance || formData.internetAllowance || formData.utilitiesAllowance || 
                        formData.parkingAllowance || formData.miscAllowance;
      
      // If caps are set and form has values, validate
      if (Object.keys(caps).length > 0 && hasValues) {
        if (!validateAllowances(formData, caps)) {
          e.preventDefault();
          e.returnValue = 'You have allowances exceeding the maximum limits. Please fix them before leaving.';
          return e.returnValue;
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, caps]);

  const fetchAllowances = async (skipLoading = false, month?: string, year?: string) => {
    await fetchAllowancesParallel(skipLoading, month, year);
  };

  const handleMonthYearChange = (month: string, year: string) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    fetchAllowances(true, month, year);
  };

  const goToPreviousMonth = () => {
    let month = parseInt(selectedMonth);
    let year = parseInt(selectedYear);
    
    month--;
    if (month === 0) {
      month = 12;
      year--;
    }
    
    const newMonth = String(month).padStart(2, '0');
    const newYear = String(year);
    handleMonthYearChange(newMonth, newYear);
  };

  const goToNextMonth = () => {
    let month = parseInt(selectedMonth);
    let year = parseInt(selectedYear);
    
    month++;
    if (month === 13) {
      month = 1;
      year++;
    }
    
    const newMonth = String(month).padStart(2, '0');
    const newYear = String(year);
    handleMonthYearChange(newMonth, newYear);
  };

  const getMonthName = (monthNum: string) => {
    return new Date(2024, parseInt(monthNum) - 1, 1).toLocaleString('default', { month: 'short' });
  };

  const formatMonthYear = () => {
    const monthName = getMonthName(selectedMonth);
    const yearShort = selectedYear.slice(-2);
    return `${monthName} ${yearShort}`;
  };

  const handleTeamSelect = (teamId: string) => {
    setFormData({ ...formData, teamId });
    if (teamId) {
      fetchTeamMembers(teamId);
    } else {
      setTeamMembers([]);
      setSelectedMemberIds(new Set());
    }
  };

  const handleMemberToggle = (memberId: string) => {
    const newSelected = new Set(selectedMemberIds);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMemberIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedMemberIds.size === teamMembers.length) {
      setSelectedMemberIds(new Set());
    } else {
      setSelectedMemberIds(new Set(teamMembers.map(m => m.employeeId)));
    }
  };

  const handleDelete = async (allowanceId: string) => {
    try {
      setDeleting(true);
      const response = await fetch(`${getApiBaseUrl()}/api/allowances/${allowanceId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete');
      }
      
      toast({ title: "Success", description: "Allowance deleted successfully" });
      await fetchAllowances(true);
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({ title: "Error", description: error.message || "Failed to delete allowance", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date) {
      toast({
        title: "Error",
        description: "Please select a date",
        variant: "destructive",
      });
      return;
    }

    if (!formData.teamId) {
      toast({
        title: "Error",
        description: "Please select a team",
        variant: "destructive",
      });
      return;
    }

    // Validate against caps
    const travel = parseFloat(formData.travelAllowance) || 0;
    const food = parseFloat(formData.foodAllowance) || 0;
    const accom = parseFloat(formData.accommodationAllowance) || 0;
    const mobile = parseFloat(formData.mobileAllowance) || 0;
    const internet = parseFloat(formData.internetAllowance) || 0;
    const utilities = parseFloat(formData.utilitiesAllowance) || 0;
    const parking = parseFloat(formData.parkingAllowance) || 0;
    const misc = parseFloat(formData.miscAllowance) || 0;

    if (caps.travelAllowance && travel > parseFloat(caps.travelAllowance)) {
      toast({ title: "Error", description: `Travel allowance exceeds maximum of Rs ${caps.travelAllowance}`, variant: "destructive" });
      return;
    }
    if (caps.foodAllowance && food > parseFloat(caps.foodAllowance)) {
      toast({ title: "Error", description: `Food allowance exceeds maximum of Rs ${caps.foodAllowance}`, variant: "destructive" });
      return;
    }
    if (caps.accommodationAllowance && accom > parseFloat(caps.accommodationAllowance)) {
      toast({ title: "Error", description: `Accommodation exceeds maximum of Rs ${caps.accommodationAllowance}`, variant: "destructive" });
      return;
    }
    if (caps.mobileAllowance && mobile > parseFloat(caps.mobileAllowance)) {
      toast({ title: "Error", description: `Mobile exceeds maximum of Rs ${caps.mobileAllowance}`, variant: "destructive" });
      return;
    }
    if (caps.internetAllowance && internet > parseFloat(caps.internetAllowance)) {
      toast({ title: "Error", description: `Internet exceeds maximum of Rs ${caps.internetAllowance}`, variant: "destructive" });
      return;
    }
    if (caps.utilitiesAllowance && utilities > parseFloat(caps.utilitiesAllowance)) {
      toast({ title: "Error", description: `Utilities exceed maximum of Rs ${caps.utilitiesAllowance}`, variant: "destructive" });
      return;
    }
    if (caps.parkingAllowance && parking > parseFloat(caps.parkingAllowance)) {
      toast({ title: "Error", description: `Parking exceeds maximum of Rs ${caps.parkingAllowance}`, variant: "destructive" });
      return;
    }
    if (caps.miscAllowance && misc > parseFloat(caps.miscAllowance)) {
      toast({ title: "Error", description: `Miscellaneous exceeds maximum of Rs ${caps.miscAllowance}`, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const allowanceData = {
        travelAllowance: parseFloat(formData.travelAllowance) || 0,
        foodAllowance: parseFloat(formData.foodAllowance) || 0,
        accommodationAllowance: parseFloat(formData.accommodationAllowance) || 0,
        mobileAllowance: parseFloat(formData.mobileAllowance) || 0,
        internetAllowance: parseFloat(formData.internetAllowance) || 0,
        utilitiesAllowance: parseFloat(formData.utilitiesAllowance) || 0,
        parkingAllowance: parseFloat(formData.parkingAllowance) || 0,
        miscAllowance: parseFloat(formData.miscAllowance) || 0,
        notes: formData.notes,
      };

      // If no employees selected, apply to current employee only
      const employeeIds = selectedMemberIds.size > 0 ? Array.from(selectedMemberIds) : [employeeId];

      // Submit allowances for selected members or current employee
      const payload = {
        date: formData.date,
        teamId: formData.teamId,
        employeeIds: employeeIds,
        selectedEmployeeIds: employeeIds,
        allowanceData: JSON.stringify(allowanceData),
      };
      
      console.log('Frontend sending bulk allowance payload:', payload);
      
      const response = await fetch(`${getApiBaseUrl()}/api/allowances/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit allowances');
      }

      toast({
        title: "Success",
        description: `Allowances submitted for ${employeeIds.length} employee(s)`,
      });

      setFormData({
        date: new Date().toISOString().split('T')[0],
        teamId: '',
        travelAllowance: '',
        foodAllowance: '',
        accommodationAllowance: '',
        mobileAllowance: '',
        internetAllowance: '',
        utilitiesAllowance: '',
        parkingAllowance: '',
        miscAllowance: '',
        notes: '',
      });
      setTeamMembers([]);
      setSelectedMemberIds(new Set());

      const submittedDate = new Date(payload.date);
      const submittedMonth = String(submittedDate.getMonth() + 1).padStart(2, '0');
      const submittedYear = String(submittedDate.getFullYear());

      fetchAllowances(true, submittedMonth, submittedYear);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to submit allowances',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = (
    (parseFloat(formData.travelAllowance) || 0) +
    (parseFloat(formData.foodAllowance) || 0) +
    (parseFloat(formData.accommodationAllowance) || 0) +
    (parseFloat(formData.mobileAllowance) || 0) +
    (parseFloat(formData.internetAllowance) || 0) +
    (parseFloat(formData.utilitiesAllowance) || 0) +
    (parseFloat(formData.parkingAllowance) || 0) +
    (parseFloat(formData.miscAllowance) || 0)
  ).toFixed(2);

  if (loading) {
    return <SkeletonLoader type="form" />;
  }

  return (
    <div className="space-y-3">
      <div className="pb-1">
        <h2 className="text-2xl font-bold">Daily Allowances</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Submit daily allowance claims for team members</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-lg">Submit Allowances</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-medium">Date</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                data-testid="input-allowance-date"
                className="mt-0.5 h-8 text-xs"
              />
            </div>

            {teams.length > 0 && (
              <div>
                <label className="text-xs font-medium">Select Team</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {teams.map((team) => (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => handleTeamSelect(formData.teamId === team.id ? '' : team.id)}
                      data-testid={`team-badge-${team.id}`}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        formData.teamId === team.id
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      }`}
                    >
                      {team.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {formData.teamId && teamMembers.length > 0 && (
              <div>
                <label className="text-xs font-medium">Team Members (Optional - {selectedMemberIds.size}/{teamMembers.length})</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {teamMembers.map((member) => (
                    <button
                      key={member.employeeId}
                      type="button"
                      onClick={() => handleMemberToggle(member.employeeId)}
                      data-testid={`member-badge-${member.employeeId}`}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        selectedMemberIds.has(member.employeeId)
                          ? 'bg-green-600 text-white shadow-md'
                          : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      }`}
                    >
                      {member.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="text-xs font-medium">Travel</label>
                <div className="relative mt-0.5">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={caps.travelAllowance || undefined}
                    placeholder="0"
                    value={formData.travelAllowance}
                    onChange={(e) => setFormData({ ...formData, travelAllowance: e.target.value })}
                    data-testid="input-travel-allowance"
                    className="h-8 text-xs p-1 pr-16 bg-white"
                    autoFocus
                  />
                  {caps.travelAllowance && <span className="absolute right-0 top-0 bottom-0 text-xs text-blue-600 font-semibold pointer-events-none bg-blue-100 px-1.5 rounded flex items-center justify-center">Max: {caps.travelAllowance}</span>}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Food</label>
                <div className="relative mt-0.5">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={caps.foodAllowance || undefined}
                    placeholder="0"
                    value={formData.foodAllowance}
                    onChange={(e) => setFormData({ ...formData, foodAllowance: e.target.value })}
                    data-testid="input-food-allowance"
                    className="h-8 text-xs p-1 pr-16 bg-white"
                  />
                  {caps.foodAllowance && <span className="absolute right-0 top-0 bottom-0 text-xs text-blue-600 font-semibold pointer-events-none bg-blue-100 px-1.5 rounded flex items-center justify-center">Max: {caps.foodAllowance}</span>}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Accommodation</label>
                <div className="relative mt-0.5">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={caps.accommodationAllowance || undefined}
                    placeholder="0"
                    value={formData.accommodationAllowance}
                    onChange={(e) => setFormData({ ...formData, accommodationAllowance: e.target.value })}
                    data-testid="input-accommodation-allowance"
                    className="h-8 text-xs p-1 pr-16 bg-white"
                  />
                  {caps.accommodationAllowance && <span className="absolute right-0 top-0 bottom-0 text-xs text-blue-600 font-semibold pointer-events-none bg-blue-100 px-1.5 rounded flex items-center justify-center">Max: {caps.accommodationAllowance}</span>}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Mobile</label>
                <div className="relative mt-0.5">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={caps.mobileAllowance || undefined}
                    placeholder="0"
                    value={formData.mobileAllowance}
                    onChange={(e) => setFormData({ ...formData, mobileAllowance: e.target.value })}
                    data-testid="input-mobile-allowance"
                    className="h-8 text-xs p-1 pr-16 bg-white"
                  />
                  {caps.mobileAllowance && <span className="absolute right-0 top-0 bottom-0 text-xs text-blue-600 font-semibold pointer-events-none bg-blue-100 px-1.5 rounded flex items-center justify-center">Max: {caps.mobileAllowance}</span>}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Internet</label>
                <div className="relative mt-0.5">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={caps.internetAllowance || undefined}
                    placeholder="0"
                    value={formData.internetAllowance}
                    onChange={(e) => setFormData({ ...formData, internetAllowance: e.target.value })}
                    data-testid="input-internet-allowance"
                    className="h-8 text-xs p-1 pr-16 bg-white"
                  />
                  {caps.internetAllowance && <span className="absolute right-0 top-0 bottom-0 text-xs text-blue-600 font-semibold pointer-events-none bg-blue-100 px-1.5 rounded flex items-center justify-center">Max: {caps.internetAllowance}</span>}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Utilities</label>
                <div className="relative mt-0.5">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={caps.utilitiesAllowance || undefined}
                    placeholder="0"
                    value={formData.utilitiesAllowance}
                    onChange={(e) => setFormData({ ...formData, utilitiesAllowance: e.target.value })}
                    data-testid="input-utilities-allowance"
                    className="h-8 text-xs p-1 pr-16 bg-white"
                  />
                  {caps.utilitiesAllowance && <span className="absolute right-0 top-0 bottom-0 text-xs text-blue-600 font-semibold pointer-events-none bg-blue-100 px-1.5 rounded flex items-center justify-center">Max: {caps.utilitiesAllowance}</span>}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Parking</label>
                <div className="relative mt-0.5">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={caps.parkingAllowance || undefined}
                    placeholder="0"
                    value={formData.parkingAllowance}
                    onChange={(e) => setFormData({ ...formData, parkingAllowance: e.target.value })}
                    data-testid="input-parking-allowance"
                    className="h-8 text-xs p-1 pr-16 bg-white"
                  />
                  {caps.parkingAllowance && <span className="absolute right-0 top-0 bottom-0 text-xs text-blue-600 font-semibold pointer-events-none bg-blue-100 px-1.5 rounded flex items-center justify-center">Max: {caps.parkingAllowance}</span>}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Miscellaneous</label>
                <div className="relative mt-0.5">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={caps.miscAllowance || undefined}
                    placeholder="0"
                    value={formData.miscAllowance}
                    onChange={(e) => setFormData({ ...formData, miscAllowance: e.target.value })}
                    data-testid="input-misc-allowance"
                    className="h-8 text-xs p-1 pr-16 bg-white"
                  />
                  {caps.miscAllowance && <span className="absolute right-0 top-0 bottom-0 text-xs text-blue-600 font-semibold pointer-events-none bg-blue-100 px-1.5 rounded flex items-center justify-center">Max: {caps.miscAllowance}</span>}
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium">Notes</label>
              <Input
                placeholder="Add any notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                data-testid="input-notes"
                className="h-8 text-xs mt-0.5 p-1"
              />
            </div>

            <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
              <span className="text-xs font-semibold">Total: Rs {totalAmount}</span>
              <Button
                type="submit"
                disabled={loading}
                data-testid="button-submit-allowance"
                className="h-8 text-xs bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Submitted Entries Section */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Submitted Claims</CardTitle>
            <CardDescription className="text-xs">{formatMonthYear()}</CardDescription>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
              data-testid="button-prev-month"
            >
              ←
            </button>
            <button
              type="button"
              onClick={goToNextMonth}
              className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
              data-testid="button-next-month"
            >
              →
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          {submittedEntries.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">No allowances submitted for {formatMonthYear()}</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {submittedEntries.map((entry, index) => {
                const allowanceData = typeof entry.allowanceData === 'string' 
                  ? JSON.parse(entry.allowanceData) 
                  : entry.allowanceData;
                
                const entryTotal = (
                  (allowanceData.travelAllowance || 0) +
                  (allowanceData.foodAllowance || 0) +
                  (allowanceData.accommodationAllowance || 0) +
                  (allowanceData.mobileAllowance || 0) +
                  (allowanceData.internetAllowance || 0) +
                  (allowanceData.utilitiesAllowance || 0) +
                  (allowanceData.parkingAllowance || 0) +
                  (allowanceData.miscAllowance || 0)
                ).toFixed(2);

                return (
                  <div
                    key={entry.id}
                    className="border rounded p-3 bg-white hover:bg-gray-50"
                    data-testid={`allowance-entry-${entry.id}`}
                  >
                    {/* Header Row: Date | Team | Employee | Total */}
                    <div className="grid grid-cols-4 gap-2 mb-2 pb-2 border-b">
                      <div>
                        <p className="text-xs text-gray-500">Date</p>
                        <p className="text-xs font-semibold text-gray-900" data-testid={`text-date-${entry.id}`}>
                          {new Date(entry.date).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Team</p>
                        <p className="text-xs font-semibold text-blue-600" data-testid={`text-team-${entry.id}`}>
                          {entry.teamName || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Employee</p>
                        <p className="text-xs font-semibold text-gray-900" data-testid={`text-employee-${entry.id}`}>
                          {entry.employeeName || entry.employeeId || '-'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Total</p>
                        <p className="text-xs font-bold text-green-600" data-testid={`text-total-${entry.id}`}>
                          Rs {entryTotal}
                        </p>
                      </div>
                    </div>

                    {/* Submitted For Row - Show all selected employees if bulk submission */}
                    {entry.selectedEmployeeIds && (() => {
                      try {
                        const selectedIds = JSON.parse(entry.selectedEmployeeIds);
                        if (selectedIds && selectedIds.length > 0) {
                          return (
                            <div className="mb-2 pb-2 border-b">
                              <p className="text-xs text-gray-500 mb-1">Submitted for:</p>
                              <div className="flex flex-wrap gap-1">
                                {selectedIds.map((id, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium"
                                    data-testid={`text-submitted-employee-${entry.id}-${idx}`}
                                  >
                                    {id}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        }
                      } catch (e) {
                        return null;
                      }
                      return null;
                    })()}

                    {/* Allowance Details: 4 columns per row */}
                    <div className="grid grid-cols-4 gap-2 mb-2 text-xs">
                      <div>
                        <p className="text-gray-500">Travel</p>
                        <p className="font-semibold text-gray-900">Rs {allowanceData.travelAllowance || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Food</p>
                        <p className="font-semibold text-gray-900">Rs {allowanceData.foodAllowance || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Accom</p>
                        <p className="font-semibold text-gray-900">Rs {allowanceData.accommodationAllowance || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Mobile</p>
                        <p className="font-semibold text-gray-900">Rs {allowanceData.mobileAllowance || 0}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-2 text-xs">
                      <div>
                        <p className="text-gray-500">Internet</p>
                        <p className="font-semibold text-gray-900">Rs {allowanceData.internetAllowance || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Utilities</p>
                        <p className="font-semibold text-gray-900">Rs {allowanceData.utilitiesAllowance || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Parking</p>
                        <p className="font-semibold text-gray-900">Rs {allowanceData.parkingAllowance || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Misc</p>
                        <p className="font-semibold text-gray-900">Rs {allowanceData.miscAllowance || 0}</p>
                      </div>
                    </div>

                    {/* Status Row: Approval & Paid Status | Delete Button */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex gap-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-white text-xs font-semibold ${
                          entry.approvalStatus === 'approved' ? 'bg-green-600' :
                          entry.approvalStatus === 'rejected' ? 'bg-red-600' :
                          entry.approvalStatus === 'processing' ? 'bg-yellow-600' :
                          'bg-gray-600'
                        }`} data-testid={`status-approval-${entry.id}`}>
                          {entry.approvalStatus.charAt(0).toUpperCase() + entry.approvalStatus.slice(1)}
                        </span>
                        <span className={`inline-block px-2 py-0.5 rounded text-white text-xs font-semibold ${
                          entry.paidStatus === 'full' ? 'bg-green-600' :
                          entry.paidStatus === 'partial' ? 'bg-yellow-600' :
                          'bg-gray-600'
                        }`} data-testid={`status-paid-${entry.id}`}>
                          {entry.paidStatus.charAt(0).toUpperCase() + entry.paidStatus.slice(1)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        disabled={deleting}
                        className="text-xs text-red-600 hover:text-red-700 font-semibold bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded"
                        data-testid={`button-delete-allowance-${entry.id}`}
                      >
                        Delete
                      </button>
                    </div>

                    {allowanceData.notes && (
                      <p className="text-xs text-gray-600 mt-2 italic border-t pt-2">Note: {allowanceData.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
