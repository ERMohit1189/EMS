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
  allowanceData: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
}

export default function Allowances() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<{
    date: string;
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

  useEffect(() => {
    fetchAllowances(true, defaultMonth, defaultYear);
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
    return new Date(2024, parseInt(monthNum) - 1, 1).toLocaleString('default', { month: 'long' });
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
      const response = await fetch(`${getApiBaseUrl()}/api/allowances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
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
        }),
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

      setFormData({
        date: new Date().toISOString().split('T')[0],
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

      fetchAllowances();
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

      <Card className="shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-lg">History</CardTitle>
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goToPreviousMonth}
              data-testid="button-previous-month"
              className="h-8 px-2"
            >
              ← Previous
            </Button>
            <div className="text-center min-w-[140px]">
              <p className="font-semibold text-sm" data-testid="display-month-year">
                {getMonthName(selectedMonth)} {selectedYear}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goToNextMonth}
              data-testid="button-next-month"
              className="h-8 px-2"
            >
              Next →
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          {submittedEntries.length === 0 ? (
            <p className="text-muted-foreground text-center py-2 text-xs">No allowances submitted yet</p>
          ) : (
            <div className="space-y-2">
              {submittedEntries.map((entry, index) => {
                let allowanceData = { travelAllowance: 0, foodAllowance: 0, accommodationAllowance: 0, mobileAllowance: 0, internetAllowance: 0, utilitiesAllowance: 0, parkingAllowance: 0, miscAllowance: 0, notes: '' };
                try {
                  allowanceData = JSON.parse(entry.allowanceData || '{}');
                } catch {
                  // Handle parsing error
                }
                const total = (allowanceData.travelAllowance || 0) + (allowanceData.foodAllowance || 0) + (allowanceData.accommodationAllowance || 0) + (allowanceData.mobileAllowance || 0) + (allowanceData.internetAllowance || 0) + (allowanceData.utilitiesAllowance || 0) + (allowanceData.parkingAllowance || 0) + (allowanceData.miscAllowance || 0);

                const isApproved = entry.approvalStatus === 'approved';
                const statusColor = isApproved ? 'bg-green-100 text-green-800' : entry.approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';

                return (
                  <div key={index} className="border rounded p-2 bg-slate-50 text-xs" data-testid={`allowance-entry-${index}`}>
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-slate-900">{entry.date}</p>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusColor}`} data-testid={`status-${index}`}>
                            {entry.approvalStatus === 'approved' ? 'Approved' : entry.approvalStatus === 'rejected' ? 'Rejected' : 'Pending'}
                          </span>
                        </div>
                        {allowanceData.notes && <p className="text-slate-600">{allowanceData.notes}</p>}
                      </div>
                      <p className="font-bold text-green-600" data-testid={`allowance-total-${index}`}>Rs {total.toFixed(2)}</p>
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-xs mb-2">
                      <div><p className="text-slate-600">Travel: Rs {(allowanceData.travelAllowance || 0).toFixed(2)}</p></div>
                      <div><p className="text-slate-600">Food: Rs {(allowanceData.foodAllowance || 0).toFixed(2)}</p></div>
                      <div><p className="text-slate-600">Accom: Rs {(allowanceData.accommodationAllowance || 0).toFixed(2)}</p></div>
                      <div><p className="text-slate-600">Mobile: Rs {(allowanceData.mobileAllowance || 0).toFixed(2)}</p></div>
                      <div><p className="text-slate-600">Internet: Rs {(allowanceData.internetAllowance || 0).toFixed(2)}</p></div>
                      <div><p className="text-slate-600">Utilities: Rs {(allowanceData.utilitiesAllowance || 0).toFixed(2)}</p></div>
                      <div><p className="text-slate-600">Parking: Rs {(allowanceData.parkingAllowance || 0).toFixed(2)}</p></div>
                      <div><p className="text-slate-600">Misc: Rs {(allowanceData.miscAllowance || 0).toFixed(2)}</p></div>
                    </div>
                    {!isApproved && (
                      <div className="flex gap-1 justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={deleting}
                          className="h-6 text-xs"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(entry.id);
                          }}
                          data-testid={`button-delete-allowance-${index}`}
                        >
                          {deleting ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
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
