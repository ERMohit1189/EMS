import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';

interface AllowanceEntry {
  date: string;
  travelAllowance: string;
  foodAllowance: string;
  miscAllowance: string;
  notes: string;
}

export default function Allowances() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<AllowanceEntry>({
    date: new Date().toISOString().split('T')[0],
    travelAllowance: '',
    foodAllowance: '',
    miscAllowance: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [submittedEntries, setSubmittedEntries] = useState<AllowanceEntry[]>([]);
  const [employeeId] = useState(localStorage.getItem('employeeId') || '');

  useEffect(() => {
    fetchAllowances();
  }, []);

  const fetchAllowances = async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      const response = await fetch(`${getApiBaseUrl()}/api/allowances/${employeeId}`);
      if (response.ok) {
        const data = await response.json();
        setSubmittedEntries(data.data || []);
      }
    } catch (error: any) {
      console.error('Error fetching allowances:', error);
    } finally {
      setLoading(false);
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
    (parseFloat(formData.miscAllowance) || 0)
  ).toFixed(2);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Daily Allowances</h2>
        <p className="text-muted-foreground mt-1">Submit your daily allowance claims</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit Allowance Claim</CardTitle>
          <CardDescription>Fill in your daily allowance details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                data-testid="input-allowance-date"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Travel Allowance (Rs)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.travelAllowance}
                  onChange={(e) => setFormData({ ...formData, travelAllowance: e.target.value })}
                  data-testid="input-travel-allowance"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Food Allowance (Rs)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.foodAllowance}
                  onChange={(e) => setFormData({ ...formData, foodAllowance: e.target.value })}
                  data-testid="input-food-allowance"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Miscellaneous (Rs)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.miscAllowance}
                  onChange={(e) => setFormData({ ...formData, miscAllowance: e.target.value })}
                  data-testid="input-misc-allowance"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Notes</label>
              <Input
                placeholder="Add any notes (optional)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                data-testid="input-allowance-notes"
                className="mt-1"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">Total Amount: <span className="font-bold text-lg">Rs {totalAmount}</span></p>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormData({
                  date: new Date().toISOString().split('T')[0],
                  travelAllowance: '',
                  foodAllowance: '',
                  miscAllowance: '',
                  notes: '',
                })}
                data-testid="button-reset-allowance"
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-submit-allowance"
              >
                {loading ? 'Submitting...' : 'Submit Allowance'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submitted Allowances</CardTitle>
          <CardDescription>Your allowance submission history</CardDescription>
        </CardHeader>
        <CardContent>
          {submittedEntries.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No allowances submitted yet</p>
          ) : (
            <div className="space-y-3">
              {submittedEntries.map((entry, index) => {
                let allowanceData = { travelAllowance: 0, foodAllowance: 0, miscAllowance: 0, notes: '' };
                try {
                  allowanceData = JSON.parse(entry.allowanceData || '{}');
                } catch {
                  // Handle parsing error
                }
                const total = (allowanceData.travelAllowance || 0) + (allowanceData.foodAllowance || 0) + (allowanceData.miscAllowance || 0);

                return (
                  <div key={index} className="border rounded-lg p-4 bg-gradient-to-r from-slate-50 to-slate-100" data-testid={`allowance-entry-${index}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-slate-900">{entry.date}</p>
                        {allowanceData.notes && <p className="text-sm text-slate-600 mt-1">{allowanceData.notes}</p>}
                      </div>
                      <p className="font-bold text-lg text-green-600" data-testid={`allowance-total-${index}`}>Rs {total.toFixed(2)}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Travel</p>
                        <p className="font-semibold text-slate-900">Rs {(allowanceData.travelAllowance || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Food</p>
                        <p className="font-semibold text-slate-900">Rs {(allowanceData.foodAllowance || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Misc</p>
                        <p className="font-semibold text-slate-900">Rs {(allowanceData.miscAllowance || 0).toFixed(2)}</p>
                      </div>
                    </div>
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
