import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AllowanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  teamId: string;
  teamName: string;
  date: string;
  allowanceData: string;
  approvalStatus: 'approved' | 'rejected' | 'pending' | 'processing';
  approvalCount?: number;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export default function ApprovalHistory() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<AllowanceRecord[]>([]);
  const [employeeId] = useState(localStorage.getItem('employeeId') || '');
  
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));

  useEffect(() => {
    fetchApprovalHistory();
  }, [selectedMonth, selectedYear]);

  const fetchApprovalHistory = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const isReportingPerson = localStorage.getItem('isReportingPerson') === 'true';
      const url = isReportingPerson && employeeId
        ? `${getApiBaseUrl()}/api/allowances/pending?employeeId=${employeeId}`
        : `${getApiBaseUrl()}/api/allowances/pending`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const allRecords = data.data || [];
        
        // Filter by month, year and approval status
        const filtered = allRecords.filter((record: AllowanceRecord) => {
          const recordDate = new Date(record.date);
          const recordMonth = String(recordDate.getMonth() + 1).padStart(2, '0');
          const recordYear = String(recordDate.getFullYear());
          return recordMonth === selectedMonth && recordYear === selectedYear && 
                 (record.approvalStatus === 'approved' || record.approvalStatus === 'rejected');
        });
        
        setRecords(filtered);
      } else {
        toast({ title: "Error", description: "Failed to fetch approval history", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to fetch history", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    let month = parseInt(selectedMonth);
    let year = parseInt(selectedYear);
    month--;
    if (month === 0) {
      month = 12;
      year--;
    }
    setSelectedMonth(String(month).padStart(2, '0'));
    setSelectedYear(String(year));
  };

  const handleNextMonth = () => {
    let month = parseInt(selectedMonth);
    let year = parseInt(selectedYear);
    month++;
    if (month === 13) {
      month = 1;
      year++;
    }
    setSelectedMonth(String(month).padStart(2, '0'));
    setSelectedYear(String(year));
  };

  const approvedCount = records.filter(r => r.approvalStatus === 'approved').length;
  const rejectedCount = records.filter(r => r.approvalStatus === 'rejected').length;

  const monthName = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (loading) {
    return <SkeletonLoader type="list" count={5} />;
  }

  return (
    <div className="space-y-3">
      <div className="pb-1">
        <h2 className="text-2xl font-bold">Approval History</h2>
        <p className="text-xs text-muted-foreground mt-0.5">View allowances you approved or rejected</p>
      </div>

      {/* Month Navigation */}
      <Card className="shadow-sm">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <button onClick={handlePreviousMonth} className="p-1 hover:bg-gray-100 rounded" data-testid="button-prev-month">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center flex-1">
              <p className="text-sm font-semibold">{monthName}</p>
            </div>
            <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded" data-testid="button-next-month">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold text-green-600" data-testid="text-approved-count">{approvedCount}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Rejected</p>
            <p className="text-2xl font-bold text-red-600" data-testid="text-rejected-count">{rejectedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Records List */}
      {records.length === 0 && (
        <Card className="shadow-sm border-dashed">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">No approvals or rejections in {monthName}</p>
          </CardContent>
        </Card>
      )}

      {records.length > 0 && (
        <div className="space-y-2">
          {records.map((record) => {
            let allowanceObj: any = {};
            try {
              allowanceObj = JSON.parse(record.allowanceData);
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

            const statusBg = record.approvalStatus === 'approved' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800';

            return (
              <Card key={record.id} className="shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b">
                    <div>
                      <p className="text-xs text-muted-foreground">Employee</p>
                      <p className="text-sm font-semibold">{record.employeeName}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded font-semibold ${statusBg}`} data-testid={`status-${record.id}`}>
                      {record.approvalStatus.charAt(0).toUpperCase() + record.approvalStatus.slice(1)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Date</p>
                      <p className="font-semibold">{new Date(record.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Team</p>
                      <p className="font-semibold">{record.teamName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="font-semibold text-green-600">Rs {total}</p>
                    </div>
                  </div>
                  {record.rejectionReason && (
                    <div className="mt-2 text-xs bg-red-50 p-2 rounded border border-red-200">
                      <p className="text-muted-foreground">Rejection Reason:</p>
                      <p className="text-red-700">{record.rejectionReason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
