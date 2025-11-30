import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';
import { SkeletonLoader } from '@/components/SkeletonLoader';

interface AllowanceForApproval {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  teamId: string;
  teamName: string;
  date: string;
  allowanceData: string;
  submittedAt: string;
  approvalStatus: string;
  approvalCount?: number;
  approvedBy?: string;
}

export default function AllowanceApproval() {
  const { toast } = useToast();
  const [allowances, setAllowances] = useState<AllowanceForApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingAllowances();
  }, []);

  const fetchPendingAllowances = async () => {
    setLoading(true);
    try {
      const employeeId = localStorage.getItem('employeeId');
      const isReportingPerson = localStorage.getItem('isReportingPerson') === 'true';
      
      console.log('[AllowanceApproval] fetchPendingAllowances - employeeId:', employeeId);
      console.log('[AllowanceApproval] fetchPendingAllowances - isReportingPerson:', isReportingPerson);
      
      // If user is a reporting person, pass their employeeId to filter by their teams
      const url = isReportingPerson && employeeId
        ? `${getApiBaseUrl()}/api/allowances/pending?employeeId=${employeeId}`
        : `${getApiBaseUrl()}/api/allowances/pending`;
      
      console.log('[AllowanceApproval] fetchPendingAllowances - URL:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      console.log('[AllowanceApproval] fetchPendingAllowances - Response:', data);
      
      if (response.ok) {
        setAllowances(data.data || []);
        console.log('[AllowanceApproval] fetchPendingAllowances - Set allowances:', data.data);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch pending allowances",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch allowances",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (allowanceId: string) => {
    setApproving(allowanceId);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/allowances/${allowanceId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve');
      }

      const result = await response.json();
      const updatedAllowance = result.data;

      if (updatedAllowance.approvalStatus === 'approved') {
        // If fully approved (2+ approvals), remove from list
        setAllowances(allowances.filter(a => a.id !== allowanceId));
        toast({
          title: "Success",
          description: "Allowance fully approved (2 approvals complete)",
        });
      } else if (updatedAllowance.approvalStatus === 'processing') {
        // If processing (1 approval), update the allowance in the list
        setAllowances(allowances.map(a => 
          a.id === allowanceId 
            ? { ...a, ...updatedAllowance }
            : a
        ));
        toast({
          title: "Success",
          description: `Allowance approved (1 of 2 approvals). Current approval count: ${updatedAllowance.approvalCount}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to approve allowance',
        variant: "destructive",
      });
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (allowanceId: string) => {
    setRejecting(allowanceId);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/allowances/${allowanceId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject');
      }

      toast({
        title: "Success",
        description: "Allowance rejected successfully",
      });

      setAllowances(allowances.filter(a => a.id !== allowanceId));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to reject allowance',
        variant: "destructive",
      });
    } finally {
      setRejecting(null);
    }
  };

  if (loading) {
    return <SkeletonLoader type="list" count={5} />;
  }

  return (
    <div className="space-y-3">
      <div className="pb-1">
        <h2 className="text-2xl font-bold">Allowance Approvals</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Review and approve employee allowance claims</p>
      </div>

      {allowances.length === 0 && (
        <Card className="shadow-sm border-dashed">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">No pending allowances for approval</p>
          </CardContent>
        </Card>
      )}

      {allowances.length > 0 && (
        <div className="space-y-2">
          {allowances.map((allowance) => {
            const statusBadgeColor = 
              allowance.approvalStatus === 'processing' ? 'bg-blue-100 text-blue-800' :
              allowance.approvalStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              allowance.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800';

            let allowanceObj: any = {
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
              allowanceObj = JSON.parse(allowance.allowanceData);
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

            return (
              <Card key={allowance.id} className="shadow-sm">
                <CardContent className="p-3">
                  <div className="mb-2 pb-2 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Employee</p>
                        <p className="text-sm font-semibold" data-testid={`text-employee-${allowance.id}`}>{allowance.employeeName}</p>
                        <p className="text-xs text-gray-500">{allowance.employeeEmail}</p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded font-semibold whitespace-nowrap ${statusBadgeColor}`}>
                        {allowance.approvalStatus.charAt(0).toUpperCase() + allowance.approvalStatus.slice(1)} 
                        {allowance.approvalCount ? ` (${allowance.approvalCount}/2)` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-sm font-semibold" data-testid={`text-date-${allowance.id}`}>{new Date(allowance.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Team</p>
                      <p className="text-sm font-semibold" data-testid={`text-team-${allowance.id}`}>{allowance.teamName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-sm font-semibold text-green-600" data-testid={`text-total-${allowance.id}`}>Rs {total}</p>
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

                  <div className="flex gap-2 justify-end pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(allowance.id)}
                      disabled={rejecting === allowance.id || approving === allowance.id}
                      className="h-8 text-xs"
                      data-testid={`button-reject-${allowance.id}`}
                    >
                      {rejecting === allowance.id ? 'Rejecting...' : 'Reject'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(allowance.id)}
                      disabled={approving === allowance.id || rejecting === allowance.id}
                      className="bg-green-600 hover:bg-green-700 h-8 text-xs"
                      data-testid={`button-approve-${allowance.id}`}
                    >
                      {approving === allowance.id ? 'Approving...' : 'Approve'}
                    </Button>
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
