import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';

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
      return;
    }
    try {
      const url = `${getApiBaseUrl()}/api/teams/employee/${employeeId}`;
      console.log('Fetching teams from:', url);
      const response = await fetch(url);
      console.log('Teams response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Teams fetched:', data);
        setTeams(data || []);
      } else {
        const error = await response.text();
        console.error('Teams API error:', response.status, error);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  useEffect(() => {
    fetchAllowances(true, defaultMonth, defaultYear);
    fetchTeams();
    // Load allowance caps from settings
    const allowanceCaps = localStorage.getItem('allowanceCaps');
    if (allowanceCaps) {
      setCaps(JSON.parse(allowanceCaps));
    }
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
    if (!employeeId) return;
    try {
      if (!skipLoading) setLoading(true);
      const m = month || selectedMonth;
      const y = year || selectedYear;
      console.log(`Fetching allowances for ${employeeId}, month: ${m}, year: ${y}`);
      const response = await fetch(`${getApiBaseUrl()}/api/allowances/${employeeId}?month=${m}&year=${y}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`Received ${data.data?.length || 0} allowances`);
        console.log('Allowances data:', data.data);
        setSubmittedEntries(data.data || []);
      } else {
        console.error('API error:', response.status);
      }
    } catch (error: any) {
      console.error('Error fetching allowances:', error);
    } finally {
      if (!skipLoading) setLoading(false);
    }
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
      const payload = {
        employeeId,
        teamId: formData.teamId,
        date: formData.date,
        allowanceData: JSON.stringify({
          travelAllowance: parseFloat(formData.travelAllowance) || 0,
          foodAllowance: parseFloat(formData.foodAllowance) || 0,
          accommodationAllowance: parseFloat(formData.accommodationAllowance) || 0,
          mobileAllowance: parseFloat(formData.mobileAllowance) || 0,
          internetAllowance: parseFloat(formData.internetAllowance) || 0,
          utilitiesAllowance: parseFloat(formData.utilitiesAllowance) || 0,
          parkingAllowance: parseFloat(formData.parkingAllowance) || 0,
          miscAllowance: parseFloat(formData.miscAllowance) || 0,
          notes: formData.notes,
        }),
      };
      
      console.log('Frontend sending allowance payload:', payload);
      
      const response = await fetch(`${getApiBaseUrl()}/api/allowances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit allowance');
      }

      toast({
        title: "Success",
        description: "Allowance submitted successfully",
      });

      const submittedDate = new Date(payload.date);
      const submittedMonth = String(submittedDate.getMonth() + 1).padStart(2, '0');
      const submittedYear = String(submittedDate.getFullYear());

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

      fetchAllowances(true, submittedMonth, submittedYear);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to submit allowance',
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

  return (
    <div className="space-y-3">
      <div className="pb-1">
        <h2 className="text-2xl font-bold">Daily Allowances</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Submit your daily allowance claims</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-lg">Submit Claim</CardTitle>
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
                      onClick={() => setFormData({ ...formData, teamId: formData.teamId === team.id ? '' : team.id })}
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
                <label className="text-xs font-medium">Misc</label>
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
                placeholder="Add notes (optional)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                data-testid="input-allowance-notes"
                className="mt-0.5 h-8 text-xs p-1"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1.5">
              <p className="text-xs text-blue-900">Total: <span className="font-bold">Rs {totalAmount}</span></p>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormData({
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
                })}
                data-testid="button-reset-allowance"
                className="h-8 text-xs"
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={loading}
                size="sm"
                className="bg-green-600 hover:bg-green-700 h-8 text-xs"
                data-testid="button-submit-allowance"
              >
                {loading ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Submitted Entries Display */}
      <div className="pb-1">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Submitted Claims</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{formatMonthYear()}</p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={goToPreviousMonth}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              data-testid="button-prev-month"
            >
              ← Prev
            </button>
            <button
              onClick={goToNextMonth}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              data-testid="button-next-month"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {submittedEntries.length === 0 ? (
        <Card className="shadow-sm border-dashed">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">No claims submitted for {formatMonthYear()}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {submittedEntries.map((entry) => {
            let allowanceObj: AllowanceData = {
              travelAllowance: 0,
              foodAllowance: 0,
              accommodationAllowance: 0,
              mobileAllowance: 0,
              internetAllowance: 0,
              utilitiesAllowance: 0,
              parkingAllowance: 0,
              miscAllowance: 0,
              notes: '',
            };
            
            try {
              allowanceObj = JSON.parse(entry.allowanceData);
            } catch (e) {
              console.error('Failed to parse allowance data:', e);
            }

            const total = (
              (allowanceObj.travelAllowance || 0) +
              (allowanceObj.foodAllowance || 0) +
              (allowanceObj.accommodationAllowance || 0) +
              (allowanceObj.mobileAllowance || 0) +
              (allowanceObj.internetAllowance || 0) +
              (allowanceObj.utilitiesAllowance || 0) +
              (allowanceObj.parkingAllowance || 0) +
              (allowanceObj.miscAllowance || 0)
            ).toFixed(2);

            const statusColor = entry.approvalStatus === 'approved' 
              ? 'bg-green-100 text-green-800' 
              : entry.approvalStatus === 'rejected'
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800';

            const paidColor = entry.paidStatus === 'full'
              ? 'bg-green-100 text-green-800'
              : entry.paidStatus === 'partial'
              ? 'bg-orange-100 text-orange-800'
              : 'bg-gray-100 text-gray-800';

            return (
              <Card key={entry.id} className="shadow-sm">
                <CardContent className="p-3">
                  <div className="grid grid-cols-3 md:grid-cols-3 gap-2 mb-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-sm font-semibold" data-testid={`text-date-${entry.id}`}>{new Date(entry.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Team</p>
                      <p className="text-sm font-semibold" data-testid={`text-team-${entry.id}`}>{entry.teamName ? entry.teamName : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-sm font-semibold text-green-600" data-testid={`text-total-${entry.id}`}>Rs {total}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2 text-xs">
                    {allowanceObj.travelAllowance > 0 && <div><span className="text-muted-foreground">Travel:</span> <span className="font-semibold">Rs {allowanceObj.travelAllowance}</span></div>}
                    {allowanceObj.foodAllowance > 0 && <div><span className="text-muted-foreground">Food:</span> <span className="font-semibold">Rs {allowanceObj.foodAllowance}</span></div>}
                    {allowanceObj.accommodationAllowance > 0 && <div><span className="text-muted-foreground">Accom:</span> <span className="font-semibold">Rs {allowanceObj.accommodationAllowance}</span></div>}
                    {allowanceObj.mobileAllowance > 0 && <div><span className="text-muted-foreground">Mobile:</span> <span className="font-semibold">Rs {allowanceObj.mobileAllowance}</span></div>}
                    {allowanceObj.internetAllowance > 0 && <div><span className="text-muted-foreground">Internet:</span> <span className="font-semibold">Rs {allowanceObj.internetAllowance}</span></div>}
                    {allowanceObj.utilitiesAllowance > 0 && <div><span className="text-muted-foreground">Utilities:</span> <span className="font-semibold">Rs {allowanceObj.utilitiesAllowance}</span></div>}
                    {allowanceObj.parkingAllowance > 0 && <div><span className="text-muted-foreground">Parking:</span> <span className="font-semibold">Rs {allowanceObj.parkingAllowance}</span></div>}
                    {allowanceObj.miscAllowance > 0 && <div><span className="text-muted-foreground">Misc:</span> <span className="font-semibold">Rs {allowanceObj.miscAllowance}</span></div>}
                  </div>

                  {allowanceObj.notes && (
                    <div className="mb-2 text-xs">
                      <p className="text-muted-foreground">Notes:</p>
                      <p className="text-sm">{allowanceObj.notes}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 items-center justify-between pt-2 border-t">
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColor}`} data-testid={`badge-status-${entry.id}`}>
                        {entry.approvalStatus.charAt(0).toUpperCase() + entry.approvalStatus.slice(1)}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${paidColor}`} data-testid={`badge-paid-${entry.id}`}>
                        {entry.paidStatus.charAt(0).toUpperCase() + entry.paidStatus.slice(1)}
                      </span>
                    </div>
                    {entry.approvalStatus === 'pending' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(entry.id)}
                        disabled={deleting}
                        className="h-7 text-xs"
                        data-testid={`button-delete-${entry.id}`}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
