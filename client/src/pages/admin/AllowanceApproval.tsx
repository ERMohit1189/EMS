import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { AllowanceApprovalModal } from '@/components/AllowanceApprovalModal';

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
    // Role-based access control
    const employeeRole = localStorage.getItem('employeeRole')?.toLowerCase() || '';
    const isSuperAdmin = employeeRole === 'superadmin';
    const isAdmin = employeeRole === 'admin';
    const isUser = employeeRole === 'user';
    const isReportingPerson = localStorage.getItem('isReportingPerson') === 'true';

    // Allow superadmin/admin OR a regular 'user' who is a reporting person
    const isAllowed = isSuperAdmin || isAdmin || (isUser && isReportingPerson);

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
  const [allowances, setAllowances] = useState<AllowanceForApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [currentRequiredApprovals, setCurrentRequiredApprovals] = useState<number>(1);
  const [maxValues, setMaxValues] = useState({
    travelMax: undefined,
    foodMax: undefined,
    accommodationMax: undefined,
    mobileMax: undefined,
    internetMax: undefined,
    utilitiesMax: undefined,
    parkingMax: undefined,
    miscMax: undefined,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAllowance, setSelectedAllowance] = useState<AllowanceForApproval | null>(null);

  useEffect(() => {
    fetchAppSettings();
    fetchPendingAllowances();
  }, []);

  const fetchAppSettings = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/app-settings`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentRequiredApprovals(data.approvalsRequiredForAllowance || 1);

        // Extract max values from app settings
        setMaxValues({
          travelMax: data.travelMax,
          foodMax: data.foodMax,
          accommodationMax: data.accommodationMax,
          mobileMax: data.mobileMax,
          internetMax: data.internetMax,
          utilitiesMax: data.utilitiesMax,
          parkingMax: data.parkingMax,
          miscMax: data.miscMax,
        });
      }
    } catch (error) {
      console.error('Error fetching app settings:', error);
    }
  };

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

      const response = await fetch(url, {
        credentials: 'include'
      });
      const data = await response.json();
      console.log('[AllowanceApproval] fetchPendingAllowances - Response:', data);
      
      if (response.ok) {
        // Filter out approved records (where approvalCount >= requiredApprovals)
        const filteredAllowances = (data.data || []).filter((allowance: AllowanceForApproval) => {
          const approvalCount = allowance.approvalCount || 0;
          return approvalCount < currentRequiredApprovals;
        });
        setAllowances(filteredAllowances);
        console.log('[AllowanceApproval] fetchPendingAllowances - Set allowances:', filteredAllowances);
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

  const openApprovalModal = (allowance: AllowanceForApproval) => {
    setSelectedAllowance(allowance);
    setModalOpen(true);
  };

  const handleModalSubmit = async (editedData: any, remark: string) => {
    if (!selectedAllowance) return;

    setApproving(selectedAllowance.id);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/allowances/${selectedAllowance.id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          editedData,
          remark,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve');
      }

      const result = await response.json();
      const updatedAllowance = result.data;

      // Close modal and remove from grid
      setModalOpen(false);
      setSelectedAllowance(null);
      setAllowances(allowances.filter(a => a.id !== selectedAllowance.id));

      // Check if this was final approval
      if (updatedAllowance.approvalCount >= currentRequiredApprovals || updatedAllowance.approvalStatus === 'approved') {
        toast({
          title: "Success",
          description: `Allowance fully approved and locked (${updatedAllowance.approvalCount}/${currentRequiredApprovals})`,
        });
      } else {
        toast({
          title: "Success",
          description: `Allowance approved (${updatedAllowance.approvalCount}/${currentRequiredApprovals})`,
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

  const handleApprove = async (allowanceId: string) => {
    // This is now a quick approve without modal
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

      // Always remove from grid when approval is given - record becomes finalized
      setAllowances(allowances.filter(a => a.id !== allowanceId));
      
      // Check if this was final approval
      if (updatedAllowance.approvalCount >= currentRequiredApprovals || updatedAllowance.approvalStatus === 'approved') {
        toast({
          title: "Success",
          description: `Allowance fully approved and locked (${updatedAllowance.approvalCount}/${currentRequiredApprovals})`,
        });
      } else {
        toast({
          title: "Success",
          description: `Allowance approved (${updatedAllowance.approvalCount}/${currentRequiredApprovals})`,
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
        body: JSON.stringify({ rejectionReason: 'Rejected by approver' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject');
      }

      // Remove rejected allowance from list
      setAllowances(allowances.filter(a => a.id !== allowanceId));
      
      toast({
        title: "Success",
        description: "Allowance rejected",
      });
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
            const approvalCount = allowance.approvalCount || 0;
            const savedStatus = allowance.approvalStatus;
            // Use locked requiredApprovals if set, otherwise use current setting
            const requiredApprovals = (allowance as any).requiredApprovals || currentRequiredApprovals;
            
            console.log(`[AllowanceApproval] Allowance ${allowance.id}:`, {
              savedStatus,
              approvalCount,
              lockedRequired: (allowance as any).requiredApprovals,
              currentRequired: currentRequiredApprovals,
              usingRequired: requiredApprovals
            });
            
            // For finalized records (saved approved/rejected status), show the saved database value
            // For non-finalized records (pending/processing), compute dynamically
            let displayStatus: string;
            if (savedStatus && (savedStatus === 'approved' || savedStatus === 'rejected')) {
              // Finalized - use saved database status
              displayStatus = savedStatus;
              console.log(`[AllowanceApproval] Using saved status: ${displayStatus}`);
            } else {
              // Non-finalized - compute based on current approval count
              if (approvalCount >= requiredApprovals && requiredApprovals > 0) {
                displayStatus = 'approved';
                console.log(`[AllowanceApproval] Computing status as approved (${approvalCount}/${requiredApprovals})`);
              } else if (approvalCount > 0) {
                displayStatus = 'processing';
                console.log(`[AllowanceApproval] Computing status as processing (${approvalCount}/${requiredApprovals})`);
              } else {
                displayStatus = 'pending';
                console.log(`[AllowanceApproval] Computing status as pending (${approvalCount}/${requiredApprovals})`);
              }
            }
            
            const statusBadgeColor = 
              displayStatus === 'processing' ? 'bg-blue-100 text-blue-800' :
              displayStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              displayStatus === 'approved' ? 'bg-green-100 text-green-800' :
              displayStatus === 'rejected' ? 'bg-red-100 text-red-800' :
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
                        {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)} 
                        {approvalCount ? ` (${approvalCount}/${requiredApprovals})` : ''}
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
                      variant="outline"
                      size="sm"
                      onClick={() => openApprovalModal(allowance)}
                      disabled={approving === allowance.id || rejecting === allowance.id}
                      className="h-8 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700"
                      data-testid={`button-review-${allowance.id}`}
                    >
                      Review & Edit
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(allowance.id)}
                      disabled={approving === allowance.id || rejecting === allowance.id}
                      className="bg-green-600 hover:bg-green-700 h-8 text-xs"
                      data-testid={`button-approve-${allowance.id}`}
                    >
                      {approving === allowance.id ? 'Approving...' : 'Quick Approve'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Approval Modal */}
      {selectedAllowance && (
        <AllowanceApprovalModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedAllowance(null);
          }}
          onSubmit={handleModalSubmit}
          allowanceData={JSON.parse(selectedAllowance.allowanceData)}
          employeeName={selectedAllowance.employeeName}
          date={selectedAllowance.date}
          isLoading={approving === selectedAllowance.id}
          maxValues={maxValues}
        />
      )}
    </div>
  );
}
