import { useState, useEffect, Key } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';
import { authenticatedFetch } from '@/lib/fetchWithLoader';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { Download, Printer } from 'lucide-react';
import { fetchExportHeader, type ExportHeader } from '@/lib/exportUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  empCode?: string;
  employeeName?: string;
  date: string;
  teamId?: string;
  teamName?: string;
  allowanceData: string;
  selectedEmployeeIds?: string;
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
  // Role-based access control
  const employeeRole = localStorage.getItem('employeeRole')?.toLowerCase() || '';
  if (employeeRole !== 'admin' && employeeRole !== 'user' && employeeRole !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <h2 className="text-xl font-bold mb-2">Not Authorized</h2>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }
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
  const [pageLoading, setPageLoading] = useState(true);
  const [gridLoading, setGridLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [submittedEntries, setSubmittedEntries] = useState<AllowanceEntry[]>([]);
  const [employeeId] = useState(localStorage.getItem('employeeId') || '');
  const [caps, setCaps] = useState<any>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  
  // Add a new state to store employee ID to name mapping
  const [employeeNameMap, setEmployeeNameMap] = useState<Map<string, string>>(new Map());
  
  // Add required approvals from app settings
  const [requiredApprovals, setRequiredApprovals] = useState(1);
  
  // Month/Year filter - default to current month
  const now = new Date();
  const defaultMonth = String(now.getMonth() + 1).padStart(2, '0');
  const defaultYear = String(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  
  // Day filter for submitted allowances
  const [selectedDay, setSelectedDay] = useState<string>('all');

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
      return [];
    }
    try {
      const url = `${getApiBaseUrl()}/api/teams/employee/${employeeId}`;
      const response = await authenticatedFetch(url);
      if (response.ok) {
        const data = await response.json();
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
    setLoadingMembers(true);
    try {
      const url = `${getApiBaseUrl()}/api/teams/${teamId}/members`;
      const response = await authenticatedFetch(url);
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data || []);
        setSelectedMemberIds(new Set());
        
        // Build employee name map
        const nameMap = new Map<string, string>();
        data.forEach((member: TeamMember) => {
          nameMap.set(member.employeeId, member.name);
        });
        setEmployeeNameMap(nameMap);
      } else {
        console.error('Team members API error:', response.status);
        setTeamMembers([]);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
      setTeamMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Helper function to get employee name from ID
  const getEmployeeName = (employeeId: string): string => {
    return employeeNameMap.get(employeeId) || employeeId;
  };

  const fetchAllowancesParallel = async (skipLoading = false, month?: string, year?: string, useGridLoader = false) => {
    if (!employeeId) return;
    try {
      if (!skipLoading) {
        if (useGridLoader) {
          setGridLoading(true);
        } else {
          setPageLoading(true);
        }
      }
      const m = month || selectedMonth;
      const y = year || selectedYear;

      // Fetch allowances and teams in parallel
      const [allowancesResponse, teamsData] = await Promise.all([
        authenticatedFetch(`${getApiBaseUrl()}/api/allowances/${employeeId}?month=${m}&year=${y}`),
        fetchTeams()
      ]);

      if (allowancesResponse.ok) {
        const data = await allowancesResponse.json();
        setSubmittedEntries(data.data || []);

        // Build employee name map from allowances (names already in response)
        const nameMap = new Map<string, string>();
        data.data?.forEach((entry: AllowanceEntry) => {
          if (entry.employeeId && entry.employeeName) {
            nameMap.set(entry.employeeId, entry.employeeName);
          }
        });

        setEmployeeNameMap(nameMap);
      } else {
        console.error('API error:', allowancesResponse.status);
        setSubmittedEntries([]);
      }

      setTeams(teamsData);
      setPageLoading(false);
      setGridLoading(false);
    } catch (error) {
      console.error('Error fetching allowances:', error);
      setPageLoading(false);
      setGridLoading(false);
    }
  };

  const fetchCaps = async () => {
    if (!employeeId) return;
    try {
      const response = await authenticatedFetch(`${getApiBaseUrl()}/api/allowances/caps/${employeeId}`);
      if (response.ok) {
        const data = await response.json();
        setCaps(data);
      }
    } catch (error) {
      console.error('Error fetching caps:', error);
    }
  };

  useEffect(() => {
    if (employeeId) {
      // Initial load - use page loader
      fetchAllowancesParallel();
      fetchCaps();
      fetchAppSettings();
    }
  }, [employeeId]);

  // Separate effect for month/year changes - use grid loader only
  useEffect(() => {
    if (employeeId && !pageLoading) {
      // Month/year change - use grid loader to avoid full page reload
      fetchAllowancesParallel(false, selectedMonth, selectedYear, true);
    }
  }, [selectedMonth, selectedYear]);

  const fetchAppSettings = async () => {
    try {
      const response = await authenticatedFetch(`${getApiBaseUrl()}/api/app-settings`);
      if (response.ok) {
        const data = await response.json();
        setRequiredApprovals(data.approvalsRequiredForAllowance || 1);
      }
    } catch (error) {
      console.error('Error fetching app settings:', error);
    }
  };

  useEffect(() => {
    if (selectedTeamId) {
      fetchTeamMembers(selectedTeamId);
    } else {
      setTeamMembers([]);
      setSelectedMemberIds(new Set());
    }
  }, [selectedTeamId]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleMemberToggle = (memberId: string) => {
    setSelectedMemberIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date) {
      toast({
        title: 'Error',
        description: 'Please select a date',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.teamId) {
      toast({
        title: 'Error',
        description: 'Please select a team',
        variant: 'destructive',
      });
      return;
    }

    const allowanceData: AllowanceData = {
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

    if (!validateAllowances(formData, caps)) {
      toast({
        title: 'Validation Error',
        description: 'One or more allowances exceed the caps set for this employee.',
        variant: 'destructive',
      });
      return;
    }

    // Check if there's already a submission for this date with approvals/rejections
    const existingEntry = submittedEntries.find(entry => {
      const entryDate = new Date(entry.date).toISOString().split('T')[0];
      return entryDate === formData.date && entry.employeeId === employeeId;
    });

    if (existingEntry && (existingEntry.approvalCount && existingEntry.approvalCount > 0)) {
      toast({
        title: 'Cannot Submit',
        description: 'An allowance for this date has already been reviewed. You cannot submit another entry for the same date.',
        variant: 'destructive',
      });
      return;
    }

    if (existingEntry && (existingEntry.approvalStatus === 'approved' || existingEntry.approvalStatus === 'rejected')) {
      toast({
        title: 'Cannot Submit',
        description: 'An allowance for this date has been approved or rejected. You cannot submit another entry for the same date.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Get selected employee IDs (or just current employee if none selected)
      const selectedEmployees = selectedMemberIds.size > 0
        ? Array.from(selectedMemberIds)
        : [employeeId];

      // Create single bulk record with all selected employees
      const payload = {
        employeeId: employeeId,  // Logged-in user (submitter)
        date: formData.date,
        teamId: formData.teamId,
        employeeIds: selectedEmployees,  // Selected recipients
        selectedEmployeeIds: selectedEmployees,  // Selected recipients
        allowanceData: JSON.stringify(allowanceData),
      };

      const response = await authenticatedFetch(`${getApiBaseUrl()}/api/allowances/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit allowances');
      }

      const result = await response.json();

      toast({
        title: 'Success',
        description: `Allowances submitted successfully for ${selectedEmployees.length} employee(s)`,
      });

      // Extract month and year from the submitted date
      const submittedDate = new Date(formData.date);
      const submittedMonth = String(submittedDate.getMonth() + 1).padStart(2, '0');
      const submittedYear = String(submittedDate.getFullYear());

      // Reset form
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
      setSelectedTeamId('');
      setSelectedMemberIds(new Set());

      // Update the filter to show the month of the submitted allowance
      setSelectedMonth(submittedMonth);
      setSelectedYear(submittedYear);

      // Refresh the allowances list for the submitted month immediately
      await fetchAllowancesParallel(true, submittedMonth, submittedYear);
    } catch (error: any) {
      console.error('Error submitting allowances:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit allowances',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Find the entry to check its approval status
    const entry = submittedEntries.find(e => e.id === id);
    if (!entry) return;

    // Block deletion if any approval or rejection has occurred
    if (entry.approvalCount && entry.approvalCount > 0) {
      toast({
        title: 'Cannot Delete',
        description: 'This allowance has already been reviewed and cannot be deleted.',
        variant: 'destructive',
      });
      return;
    }

    if (entry.approvalStatus === 'approved' || entry.approvalStatus === 'rejected') {
      toast({
        title: 'Cannot Delete',
        description: 'This allowance has been approved or rejected and cannot be deleted.',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this allowance entry?')) return;

    // Show immediate feedback
    toast({
      title: 'Deleting...',
      description: 'Please wait while we delete the allowance entry.',
    });

    setDeleting(true);
    try {
      const response = await authenticatedFetch(`${getApiBaseUrl()}/api/allowances/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Allowance entry deleted',
        });
        fetchAllowancesParallel(true);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete allowance entry',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting allowance:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete allowance entry',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    
    try {
      // Fetch export header settings
      const exportHeader = await fetchExportHeader();
      
      const employeeName = localStorage.getItem('employeeName') || 'Employee';
      const monthYear = formatMonthYear();
      
      // Calculate summary
      let totalAmount = 0;
      const summaryData: { [key: string]: number } = {
        travel: 0,
        food: 0,
        accommodation: 0,
        mobile: 0,
        internet: 0,
        utilities: 0,
        parking: 0,
        misc: 0
      };

      filteredEntries.forEach(entry => {
        const allowanceData = typeof entry.allowanceData === 'string' ? JSON.parse(entry.allowanceData) : entry.allowanceData;
        summaryData.travel += allowanceData.travelAllowance || 0;
        summaryData.food += allowanceData.foodAllowance || 0;
        summaryData.accommodation += allowanceData.accommodationAllowance || 0;
        summaryData.mobile += allowanceData.mobileAllowance || 0;
        summaryData.internet += allowanceData.internetAllowance || 0;
        summaryData.utilities += allowanceData.utilitiesAllowance || 0;
        summaryData.parking += allowanceData.parkingAllowance || 0;
        summaryData.misc += allowanceData.miscAllowance || 0;
        
        totalAmount += (
          (allowanceData.travelAllowance || 0) +
          (allowanceData.foodAllowance || 0) +
          (allowanceData.accommodationAllowance || 0) +
          (allowanceData.mobileAllowance || 0) +
          (allowanceData.internetAllowance || 0) +
          (allowanceData.utilitiesAllowance || 0) +
          (allowanceData.parkingAllowance || 0) +
          (allowanceData.miscAllowance || 0)
        );
      });

      // Create PDF
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 15;

      // Header - Company Info
      doc.setFillColor(102, 126, 234);
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(exportHeader.companyName || 'Enterprise Operations Management System (EOMS)', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 7;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      if (exportHeader.address) {
        doc.text(exportHeader.address, pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
      }
      if (exportHeader.contactEmail || exportHeader.contactPhone) {
        doc.text([exportHeader.contactEmail, exportHeader.contactPhone].filter(Boolean).join(' | '), pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
      }
      if (exportHeader.gstin || exportHeader.website) {
        doc.text([exportHeader.gstin ? `GSTIN: ${exportHeader.gstin}` : '', exportHeader.website].filter(Boolean).join(' | '), pageWidth / 2, yPos, { align: 'center' });
      }

      // Report Title
      yPos = 45;
      doc.setTextColor(44, 62, 80);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Employee Allowance Report', pageWidth / 2, yPos, { align: 'center' });

      // Report Info Box
      yPos += 10;
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(15, yPos, pageWidth - 30, 20, 3, 3, 'F');
      
      doc.setFontSize(9);
      doc.setTextColor(102, 102, 102);
      doc.setFont('helvetica', 'normal');
      
      const col1X = 20;
      const col2X = pageWidth / 2 - 20;
      const col3X = pageWidth / 2 + 20;
      const col4X = pageWidth - 60;
      
      doc.text('Employee Name', col1X, yPos + 6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(44, 62, 80);
      doc.text(employeeName, col1X, yPos + 11);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(102, 102, 102);
      doc.text('Report Period', col2X, yPos + 6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(44, 62, 80);
      doc.text(monthYear, col2X, yPos + 11);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(102, 102, 102);
      doc.text('Generated On', col3X, yPos + 6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(44, 62, 80);
      doc.text(new Date().toLocaleDateString('en-IN'), col3X, yPos + 11);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(102, 102, 102);
      doc.text('Total Records', col4X, yPos + 6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(44, 62, 80);
      doc.text(String(filteredEntries.length), col4X, yPos + 11);

      if (filteredEntries.length === 0) {
        yPos += 30;
        doc.setFontSize(11);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'italic');
        doc.text('No allowance records found for this period.', pageWidth / 2, yPos, { align: 'center' });
      } else {
        // Summary Section
        yPos += 28;
        doc.setFillColor(102, 126, 234);
        doc.roundedRect(15, yPos, pageWidth - 30, 30, 3, 3, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Summary Breakdown', 20, yPos + 7);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const summaryStartY = yPos + 13;
        const summaryColWidth = (pageWidth - 40) / 3;
        
        const summaryItems = [
          { label: 'Travel', value: summaryData.travel },
          { label: 'Food', value: summaryData.food },
          { label: 'Accommodation', value: summaryData.accommodation },
          { label: 'Mobile', value: summaryData.mobile },
          { label: 'Internet', value: summaryData.internet },
          { label: 'Utilities', value: summaryData.utilities },
          { label: 'Parking', value: summaryData.parking },
          { label: 'Miscellaneous', value: summaryData.misc },
          { label: 'TOTAL AMOUNT', value: totalAmount, highlight: true }
        ];
        
        summaryItems.forEach((item, idx) => {
          const row = Math.floor(idx / 3);
          const col = idx % 3;
          const x = 20 + (col * summaryColWidth);
          const y = summaryStartY + (row * 6);
          
          if (item.highlight) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
          }
          doc.text(`${item.label}: Rs ${item.value.toFixed(2)}`, x, y);
          if (item.highlight) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
          }
        });

        // Detailed Records Table
        yPos += 38;
        doc.setTextColor(44, 62, 80);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Detailed Records', 15, yPos);

        yPos += 5;

        // Prepare table data
        const tableData = filteredEntries.map(entry => {
          const allowanceData = typeof entry.allowanceData === 'string' ? JSON.parse(entry.allowanceData) : entry.allowanceData;
          const entryTotal = (
            (allowanceData.travelAllowance || 0) +
            (allowanceData.foodAllowance || 0) +
            (allowanceData.accommodationAllowance || 0) +
            (allowanceData.mobileAllowance || 0) +
            (allowanceData.internetAllowance || 0) +
            (allowanceData.utilitiesAllowance || 0) +
            (allowanceData.parkingAllowance || 0) +
            (allowanceData.miscAllowance || 0)
          );

          const approvalCount = entry.approvalCount || 0;
          const savedStatus = entry.approvalStatus;
          const maxApprovals = (entry as any).requiredApprovals || requiredApprovals;
          
          let displayStatus: string;
          if (savedStatus === 'approved' || savedStatus === 'rejected') {
            displayStatus = savedStatus;
          } else {
            if (approvalCount >= maxApprovals && maxApprovals > 0) {
              displayStatus = 'approved';
            } else if (approvalCount > 0) {
              displayStatus = 'processing';
            } else {
              displayStatus = 'pending';
            }
          }

          return [
            new Date(entry.date).toLocaleDateString('en-IN'),
            entry.teamName || '-',
            `Rs ${(allowanceData.travelAllowance || 0).toFixed(2)}`,
            `Rs ${(allowanceData.foodAllowance || 0).toFixed(2)}`,
            `Rs ${(allowanceData.accommodationAllowance || 0).toFixed(2)}`,
            `Rs ${(allowanceData.mobileAllowance || 0).toFixed(2)}`,
            `Rs ${(allowanceData.internetAllowance || 0).toFixed(2)}`,
            `Rs ${(allowanceData.utilitiesAllowance || 0).toFixed(2)}`,
            `Rs ${(allowanceData.parkingAllowance || 0).toFixed(2)}`,
            `Rs ${(allowanceData.miscAllowance || 0).toFixed(2)}`,
            `Rs ${entryTotal.toFixed(2)}`,
            displayStatus.toUpperCase()
          ];
        });

        // Add total row
        tableData.push([
          { content: 'GRAND TOTAL', colSpan: 2, styles: { fontStyle: 'bold', fontSize: 9 } },
          `Rs ${summaryData.travel.toFixed(2)}`,
          `Rs ${summaryData.food.toFixed(2)}`,
          `Rs ${summaryData.accommodation.toFixed(2)}`,
          `Rs ${summaryData.mobile.toFixed(2)}`,
          `Rs ${summaryData.internet.toFixed(2)}`,
          `Rs ${summaryData.utilities.toFixed(2)}`,
          `Rs ${summaryData.parking.toFixed(2)}`,
          `Rs ${summaryData.misc.toFixed(2)}`,
          { content: `Rs ${totalAmount.toFixed(2)}`, styles: { fontStyle: 'bold', fontSize: 9 } },
          ''
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Date', 'Team', 'Travel', 'Food', 'Accom.', 'Mobile', 'Internet', 'Utilities', 'Parking', 'Misc', 'Total', 'Status']],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: [102, 126, 234],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'center'
          },
          bodyStyles: {
            fontSize: 7,
            textColor: [60, 60, 60]
          },
          alternateRowStyles: {
            fillColor: [248, 249, 250]
          },
          columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 25 },
            2: { cellWidth: 18, halign: 'right' },
            3: { cellWidth: 18, halign: 'right' },
            4: { cellWidth: 18, halign: 'right' },
            5: { cellWidth: 18, halign: 'right' },
            6: { cellWidth: 18, halign: 'right' },
            7: { cellWidth: 18, halign: 'right' },
            8: { cellWidth: 18, halign: 'right' },
            9: { cellWidth: 18, halign: 'right' },
            10: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: [40, 167, 69] },
            11: { cellWidth: 20, halign: 'center' }
          },
          didParseCell: (data) => {
            // Color code status column
            if (data.column.index === 11 && data.section === 'body') {
              const status = String(data.cell.text[0]).toLowerCase();
              if (status === 'approved') {
                data.cell.styles.textColor = [21, 87, 36];
                data.cell.styles.fillColor = [212, 237, 218];
              } else if (status === 'pending') {
                data.cell.styles.textColor = [133, 100, 4];
                data.cell.styles.fillColor = [255, 243, 205];
              } else if (status === 'processing') {
                data.cell.styles.textColor = [12, 84, 96];
                data.cell.styles.fillColor = [209, 236, 241];
              } else if (status === 'rejected') {
                data.cell.styles.textColor = [114, 28, 36];
                data.cell.styles.fillColor = [248, 215, 218];
              }
            }
            
            // Style total row
            if (data.row.index === tableData.length - 1) {
              data.cell.styles.fillColor = [232, 245, 233];
              data.cell.styles.fontStyle = 'bold';
            }
          },
          margin: { left: 15, right: 15 }
        });

        // Footer
        const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;
        doc.setDrawColor(222, 226, 230);
        doc.line(15, finalY + 10, pageWidth - 15, finalY + 10);
        
        doc.setFontSize(8);
        doc.setTextColor(108, 117, 125);
        doc.setFont('helvetica', 'normal');
        doc.text('This is a system-generated report. For any queries, please contact the HR department.', pageWidth / 2, finalY + 15, { align: 'center' });
        doc.text(`Generated from ${exportHeader.companyName || 'Enterprise Operations Management System (EOMS)'}`, pageWidth / 2, finalY + 19, { align: 'center' });
      }

      // Save PDF
      doc.save(`Allowance_Report_${employeeName}_${monthYear.replace(' ', '_')}.pdf`);
      
      toast({
        title: 'Success',
        description: 'PDF exported successfully',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF export',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = async () => {
    setPrinting(true);
    
    try {
      const exportHeader = await fetchExportHeader();
      const employeeName = localStorage.getItem('employeeName') || 'Employee';
      const monthYear = formatMonthYear();
      
      // Calculate summary
      let totalAmount = 0;
      const summaryData: { [key: string]: number } = {
        travel: 0, food: 0, accommodation: 0, mobile: 0,
        internet: 0, utilities: 0, parking: 0, misc: 0
      };

      filteredEntries.forEach(entry => {
        const allowanceData = typeof entry.allowanceData === 'string' ? JSON.parse(entry.allowanceData) : entry.allowanceData;
        Object.keys(summaryData).forEach(key => {
          summaryData[key] += allowanceData[`${key}Allowance`] || 0;
        });
        totalAmount += Object.values(allowanceData).reduce((sum: number, val: any) => 
          typeof val === 'number' ? sum + val : sum, 0
        );
      });

      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Allowance Report - ${employeeName} - ${monthYear}</title>
          <style>
            @page { size: landscape; margin: 1cm; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
            .header { text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; padding: 20px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header .details { font-size: 10px; margin-top: 8px; }
            .info-box { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; 
                        background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .info-item { text-align: center; }
            .info-label { font-size: 9px; color: #666; text-transform: uppercase; }
            .info-value { font-size: 12px; font-weight: bold; color: #2c3e50; margin-top: 3px; }
            .summary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; 
                      padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .summary h2 { margin: 0 0 10px 0; font-size: 14px; }
            .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
            .summary-item { background: rgba(255,255,255,0.2); padding: 8px; border-radius: 4px; text-align: center; }
            .summary-label { font-size: 9px; }
            .summary-value { font-size: 14px; font-weight: bold; margin-top: 3px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            thead { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
            th { padding: 8px 5px; font-size: 9px; text-align: left; font-weight: bold; }
            td { padding: 6px 5px; font-size: 9px; border-bottom: 1px solid #ddd; }
            tbody tr:nth-child(even) { background: #f8f9fa; }
            .amount { text-align: right; }
            .total-row { background: #e8f5e9 !important; font-weight: bold; border-top: 2px solid #4CAF50; }
            .status { display: inline-block; padding: 2px 6px; border-radius: 10px; 
                     font-size: 8px; font-weight: bold; text-transform: uppercase; }
            .status-approved { background: #d4edda; color: #155724; }
            .status-pending { background: #fff3cd; color: #856404; }
            .status-processing { background: #d1ecf1; color: #0c5460; }
            .status-rejected { background: #f8d7da; color: #721c24; }
            .footer { margin-top: 20px; padding-top: 10px; border-top: 2px solid #dee2e6; 
                     text-align: center; font-size: 9px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${exportHeader.companyName || 'Enterprise Operations Management System (EOMS)'}</h1>
            <div class="details">
              ${[exportHeader.address, [exportHeader.contactEmail, exportHeader.contactPhone].filter(Boolean).join(' | '),
                [exportHeader.gstin ? `GSTIN: ${exportHeader.gstin}` : '', exportHeader.website].filter(Boolean).join(' | ')
              ].filter(Boolean).join(' • ')}
            </div>
            <h2 style="margin: 10px 0 0 0; font-size: 16px;">Employee Allowance Report</h2>
          </div>
          
          <div class="info-box">
            <div class="info-item"><div class="info-label">Employee</div><div class="info-value">${employeeName}</div></div>
            <div class="info-item"><div class="info-label">Period</div><div class="info-value">${monthYear}</div></div>
            <div class="info-item"><div class="info-label">Generated</div><div class="info-value">${new Date().toLocaleDateString('en-IN')}</div></div>
            <div class="info-item"><div class="info-label">Records</div><div class="info-value">${filteredEntries.length}</div></div>
          </div>
      `;

      if (filteredEntries.length > 0) {
        html += `
          <div class="summary">
            <h2>Summary Breakdown</h2>
            <div class="summary-grid">
              <div class="summary-item"><div class="summary-label">Travel</div><div class="summary-value">Rs ${summaryData.travel.toFixed(2)}</div></div>
              <div class="summary-item"><div class="summary-label">Food</div><div class="summary-value">Rs ${summaryData.food.toFixed(2)}</div></div>
              <div class="summary-item"><div class="summary-label">Accommodation</div><div class="summary-value">Rs ${summaryData.accommodation.toFixed(2)}</div></div>
              <div class="summary-item"><div class="summary-label">Mobile</div><div class="summary-value">Rs ${summaryData.mobile.toFixed(2)}</div></div>
              <div class="summary-item"><div class="summary-label">Internet</div><div class="summary-value">Rs ${summaryData.internet.toFixed(2)}</div></div>
              <div class="summary-item"><div class="summary-label">Utilities</div><div class="summary-value">Rs ${summaryData.utilities.toFixed(2)}</div></div>
              <div class="summary-item"><div class="summary-label">Parking</div><div class="summary-value">Rs ${summaryData.parking.toFixed(2)}</div></div>
              <div class="summary-item"><div class="summary-label">Miscellaneous</div><div class="summary-value">Rs ${summaryData.misc.toFixed(2)}</div></div>
              <div class="summary-item" style="background: rgba(255,255,255,0.3);"><div class="summary-label">TOTAL</div><div class="summary-value" style="font-size: 16px;">Rs ${totalAmount.toFixed(2)}</div></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th><th>Team</th><th>Travel</th><th>Food</th><th>Accom.</th>
                <th>Mobile</th><th>Internet</th><th>Utilities</th><th>Parking</th><th>Misc</th>
                <th>Total</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
        `;

        filteredEntries.forEach(entry => {
          const allowanceData = typeof entry.allowanceData === 'string' ? JSON.parse(entry.allowanceData) : entry.allowanceData;
          const entryTotal = Object.values(allowanceData).reduce((sum: number, val: any) => 
            typeof val === 'number' ? sum + val : sum, 0
          );

          const approvalCount = entry.approvalCount || 0;
          const savedStatus = entry.approvalStatus;
          const maxApprovals = (entry as any).requiredApprovals || requiredApprovals;
          let displayStatus = savedStatus === 'approved' || savedStatus === 'rejected' ? savedStatus :
            approvalCount >= maxApprovals && maxApprovals > 0 ? 'approved' :
            approvalCount > 0 ? 'processing' : 'pending';

          html += `
            <tr>
              <td>${new Date(entry.date).toLocaleDateString('en-IN')}</td>
              <td>${entry.teamName || '-'}</td>
              <td class="amount">Rs ${(allowanceData.travelAllowance || 0).toFixed(2)}</td>
              <td class="amount">Rs ${(allowanceData.foodAllowance || 0).toFixed(2)}</td>
              <td class="amount">Rs ${(allowanceData.accommodationAllowance || 0).toFixed(2)}</td>
              <td class="amount">Rs ${(allowanceData.mobileAllowance || 0).toFixed(2)}</td>
              <td class="amount">Rs ${(allowanceData.internetAllowance || 0).toFixed(2)}</td>
              <td class="amount">Rs ${(allowanceData.utilitiesAllowance || 0).toFixed(2)}</td>
              <td class="amount">Rs ${(allowanceData.parkingAllowance || 0).toFixed(2)}</td>
              <td class="amount">Rs ${(allowanceData.miscAllowance || 0).toFixed(2)}</td>
              <td class="amount" style="font-weight: bold; color: #28a745;">Rs ${entryTotal.toFixed(2)}</td>
              <td><span class="status status-${displayStatus}">${displayStatus}</span></td>
            </tr>
          `;
        });

        html += `
              <tr class="total-row">
                <td colspan="2">GRAND TOTAL</td>
                <td class="amount">Rs ${summaryData.travel.toFixed(2)}</td>
                <td class="amount">Rs ${summaryData.food.toFixed(2)}</td>
                <td class="amount">Rs ${summaryData.accommodation.toFixed(2)}</td>
                <td class="amount">Rs ${summaryData.mobile.toFixed(2)}</td>
                <td class="amount">Rs ${summaryData.internet.toFixed(2)}</td>
                <td class="amount">Rs ${summaryData.utilities.toFixed(2)}</td>
                <td class="amount">Rs ${summaryData.parking.toFixed(2)}</td>
                <td class="amount">Rs ${summaryData.misc.toFixed(2)}</td>
                <td class="amount" style="font-size: 11px;">Rs ${totalAmount.toFixed(2)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        `;
      } else {
        html += '<div style="text-align: center; padding: 40px; color: #999;">No records found.</div>';
      }

      html += `
          <div class="footer">
            <p>This is a system-generated report. For queries, contact HR department.</p>
            <p>Generated from ${exportHeader.companyName || 'Enterprise Operations Management System (EOMS)'}</p>
          </div>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.onload = () => printWindow.print();
      } else {
        toast({
          title: 'Error',
          description: 'Could not open print window. Check popup blocker.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate print preview',
        variant: 'destructive',
      });
    } finally {
      setPrinting(false);
    }
  };

  const goToPreviousMonth = () => {
    let m = parseInt(selectedMonth);
    let y = parseInt(selectedYear);
    if (m === 1) {
      m = 12;
      y -= 1;
    } else {
      m -= 1;
    }
    const newMonth = String(m).padStart(2, '0');
    const newYear = String(y);
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const goToNextMonth = () => {
    let m = parseInt(selectedMonth);
    let y = parseInt(selectedYear);
    if (m === 12) {
      m = 1;
      y += 1;
    } else {
      m += 1;
    }
    const newMonth = String(m).padStart(2, '0');
    const newYear = String(y);
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const formatMonthYear = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(selectedMonth) - 1]} ${selectedYear}`;
  };
  
  // Filter entries by selected day
  const filteredEntries = selectedDay === 'all' 
    ? submittedEntries 
    : submittedEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return String(entryDate.getDate()).padStart(2, '0') === selectedDay;
      });
  
  // Get unique days from submitted entries for the dropdown
  const availableDays = Array.from(
    new Set(submittedEntries.map(entry => {
      const entryDate = new Date(entry.date);
      return String(entryDate.getDate()).padStart(2, '0');
    }))
  ).sort((a, b) => parseInt(a) - parseInt(b));

  if (pageLoading) {
    return <SkeletonLoader />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Submit Allowance Card - Compact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Submit Allowance</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3" data-testid="form-allowance">
            {/* Date & Team Selection - Single Row */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">Date</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  required
                  className="h-8 text-xs"
                  data-testid="input-date"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1">Team</label>
                <div className="flex flex-wrap gap-1">
                  {teams.map((team) => (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => {
                        handleInputChange('teamId', team.id);
                        setSelectedTeamId(team.id);
                      }}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        formData.teamId === team.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      data-testid={`badge-team-${team.id}`}
                    >
                      {team.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Team Members Selection - Optional */}
            {loadingMembers && (
              <div className="text-xs text-gray-500 italic">
                Loading team members...
              </div>
            )}
            {!loadingMembers && teamMembers.length > 0 && (
              <div>
                <label className="block text-xs font-medium mb-1">
                  Team Members (Optional - {selectedMemberIds.size} selected)
                </label>
                <div className="flex flex-wrap gap-1">
                  {teamMembers.map((member) => (
                    <button
                      key={member.employeeId}
                      type="button"
                      onClick={() => handleMemberToggle(member.employeeId)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        selectedMemberIds.has(member.employeeId)
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      data-testid={`badge-member-${member.employeeId}`}
                    >
                      {member.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Allowance Fields - 4 Columns */}
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1 truncate" title={`Travel (Cap: Rs ${caps.travelAllowance || 'N/A'})`}>
                  Travel
                </label>
                <Input
                  type="number"
                  value={formData.travelAllowance}
                  onChange={(e) => handleInputChange('travelAllowance', e.target.value)}
                  placeholder={caps.travelAllowance ? `Max: ${caps.travelAllowance}` : "0"}
                  max={caps.travelAllowance || undefined}
                  className="h-8 text-xs"
                  data-testid="input-travel"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 truncate" title={`Food (Cap: Rs ${caps.foodAllowance || 'N/A'})`}>
                  Food
                </label>
                <Input
                  type="number"
                  value={formData.foodAllowance}
                  onChange={(e) => handleInputChange('foodAllowance', e.target.value)}
                  placeholder={caps.foodAllowance ? `Max: ${caps.foodAllowance}` : "0"}
                  max={caps.foodAllowance || undefined}
                  className="h-8 text-xs"
                  data-testid="input-food"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 truncate" title={`Accommodation (Cap: Rs ${caps.accommodationAllowance || 'N/A'})`}>
                  Accom
                </label>
                <Input
                  type="number"
                  value={formData.accommodationAllowance}
                  onChange={(e) => handleInputChange('accommodationAllowance', e.target.value)}
                  placeholder={caps.accommodationAllowance ? `Max: ${caps.accommodationAllowance}` : "0"}
                  max={caps.accommodationAllowance || undefined}
                  className="h-8 text-xs"
                  data-testid="input-accommodation"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 truncate" title={`Mobile (Cap: Rs ${caps.mobileAllowance || 'N/A'})`}>
                  Mobile
                </label>
                <Input
                  type="number"
                  value={formData.mobileAllowance}
                  onChange={(e) => handleInputChange('mobileAllowance', e.target.value)}
                  placeholder={caps.mobileAllowance ? `Max: ${caps.mobileAllowance}` : "0"}
                  max={caps.mobileAllowance || undefined}
                  className="h-8 text-xs"
                  data-testid="input-mobile"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 truncate" title={`Internet (Cap: Rs ${caps.internetAllowance || 'N/A'})`}>
                  Internet
                </label>
                <Input
                  type="number"
                  value={formData.internetAllowance}
                  onChange={(e) => handleInputChange('internetAllowance', e.target.value)}
                  placeholder={caps.internetAllowance ? `Max: ${caps.internetAllowance}` : "0"}
                  max={caps.internetAllowance || undefined}
                  className="h-8 text-xs"
                  data-testid="input-internet"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 truncate" title={`Utilities (Cap: Rs ${caps.utilitiesAllowance || 'N/A'})`}>
                  Utilities
                </label>
                <Input
                  type="number"
                  value={formData.utilitiesAllowance}
                  onChange={(e) => handleInputChange('utilitiesAllowance', e.target.value)}
                  placeholder={caps.utilitiesAllowance ? `Max: ${caps.utilitiesAllowance}` : "0"}
                  max={caps.utilitiesAllowance || undefined}
                  className="h-8 text-xs"
                  data-testid="input-utilities"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 truncate" title={`Parking (Cap: Rs ${caps.parkingAllowance || 'N/A'})`}>
                  Parking
                </label>
                <Input
                  type="number"
                  value={formData.parkingAllowance}
                  onChange={(e) => handleInputChange('parkingAllowance', e.target.value)}
                  placeholder={caps.parkingAllowance ? `Max: ${caps.parkingAllowance}` : "0"}
                  max={caps.parkingAllowance || undefined}
                  className="h-8 text-xs"
                  data-testid="input-parking"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 truncate" title={`Miscellaneous (Cap: Rs ${caps.miscAllowance || 'N/A'})`}>
                  Misc
                </label>
                <Input
                  type="number"
                  value={formData.miscAllowance}
                  onChange={(e) => handleInputChange('miscAllowance', e.target.value)}
                  placeholder={caps.miscAllowance ? `Max: ${caps.miscAllowance}` : "0"}
                  max={caps.miscAllowance || undefined}
                  className="h-8 text-xs"
                  data-testid="input-misc"
                />
              </div>
            </div>

            {/* Notes & Submit - Inline */}
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-3">
                <label className="block text-xs font-medium mb-1">Notes</label>
                <Input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Optional notes"
                  className="h-8 text-xs"
                  data-testid="input-notes"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  type="submit" 
                  disabled={loading || deleting} 
                  className="w-full h-8 text-xs relative" 
                  data-testid="button-submit"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-3 w-3 mr-2 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : 'Submit'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Submitted Allowances Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Submitted Allowances</CardTitle>
              <CardDescription>View your submitted allowance history</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Export PDF Button */}
              <Button
                type="button"
                onClick={handleExportPDF}
                disabled={filteredEntries.length === 0 || exporting}
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                data-testid="button-export-pdf"
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-3 w-3 mr-1" />
                    Export PDF
                  </>
                )}
              </Button>
              {/* Print Button */}
              <Button
                type="button"
                onClick={handlePrint}
                disabled={filteredEntries.length === 0 || printing}
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                data-testid="button-print"
              >
                {printing ? (
                  <>
                    <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>
                    <Printer className="h-3 w-3 mr-1" />
                    Print
                  </>
                )}
              </Button>
              {/* Day Filter Dropdown */}
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50"
                data-testid="select-day-filter"
              >
                <option value="all">All Days</option>
                {availableDays.map(day => (
                  <option key={day} value={day}>Day {parseInt(day)}</option>
                ))}
              </select>
              <span className="text-sm font-semibold text-gray-700">{formatMonthYear()}</span>
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
          </div>
        </CardHeader>
        <CardContent className="p-3">
          {gridLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-2">
                <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-xs text-gray-500">Loading allowances...</p>
              </div>
            </div>
          ) : filteredEntries.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">
              {selectedDay === 'all'
                ? `No allowances submitted for ${formatMonthYear()}`
                : `No allowances submitted on Day ${parseInt(selectedDay)} of ${formatMonthYear()}`}
            </p>
          ) : (
            <>
              {/* Desktop Table View - Hidden on Mobile */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-300">
                      <th className="p-2 text-left font-semibold">Date</th>
                      <th className="p-2 text-left font-semibold">Team</th>
                      <th className="p-2 text-left font-semibold">Submitted By</th>
                      <th className="p-2 text-right font-semibold">Travel</th>
                      <th className="p-2 text-right font-semibold">Food</th>
                      <th className="p-2 text-right font-semibold">Accom</th>
                      <th className="p-2 text-right font-semibold">Mobile</th>
                      <th className="p-2 text-right font-semibold">Internet</th>
                      <th className="p-2 text-right font-semibold">Utilities</th>
                      <th className="p-2 text-right font-semibold">Parking</th>
                      <th className="p-2 text-right font-semibold">Misc</th>
                      <th className="p-2 text-right font-semibold">Total</th>
                      <th className="p-2 text-center font-semibold">Status</th>
                      <th className="p-2 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => {
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

                      const approvalCount = entry.approvalCount || 0;
                      const savedStatus = entry.approvalStatus;
                      const maxApprovals = (entry as any).requiredApprovals || requiredApprovals;

                      let displayStatus: string;
                      if (savedStatus === 'approved' || savedStatus === 'rejected') {
                        displayStatus = savedStatus;
                      } else {
                        if (approvalCount >= maxApprovals && maxApprovals > 0) {
                          displayStatus = 'approved';
                        } else if (approvalCount > 0) {
                          displayStatus = 'processing';
                        } else {
                          displayStatus = 'pending';
                        }
                      }

                      const canDelete = !entry.approvalCount || entry.approvalCount === 0;

                      return (
                        <tr
                          key={entry.id}
                          className="border-b hover:bg-gray-50"
                          data-testid={`allowance-entry-${entry.id}`}
                        >
                          <td className="p-2" data-testid={`text-date-${entry.id}`}>
                            {new Date(entry.date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="p-2 text-blue-600" data-testid={`text-team-${entry.id}`}>
                            {entry.teamName || '-'}
                          </td>
                          <td className="p-2" data-testid={`text-employee-${entry.id}`}>
                            {entry.employeeName || entry.employeeId || '-'}
                          </td>
                          <td className="p-2 text-right">Rs {allowanceData.travelAllowance || 0}</td>
                          <td className="p-2 text-right">Rs {allowanceData.foodAllowance || 0}</td>
                          <td className="p-2 text-right">Rs {allowanceData.accommodationAllowance || 0}</td>
                          <td className="p-2 text-right">Rs {allowanceData.mobileAllowance || 0}</td>
                          <td className="p-2 text-right">Rs {allowanceData.internetAllowance || 0}</td>
                          <td className="p-2 text-right">Rs {allowanceData.utilitiesAllowance || 0}</td>
                          <td className="p-2 text-right">Rs {allowanceData.parkingAllowance || 0}</td>
                          <td className="p-2 text-right">Rs {allowanceData.miscAllowance || 0}</td>
                          <td className="p-2 text-right font-bold text-green-600" data-testid={`text-total-${entry.id}`}>
                            Rs {entryTotal}
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex flex-col gap-1 items-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-white text-xs font-semibold ${
                                displayStatus === 'approved' ? 'bg-green-600' :
                                displayStatus === 'rejected' ? 'bg-red-600' :
                                displayStatus === 'processing' ? 'bg-yellow-600' :
                                'bg-gray-600'
                              }`} data-testid={`status-approval-${entry.id}`}>
                                {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                                {approvalCount > 0 ? ` (${approvalCount}/${maxApprovals})` : ''}
                              </span>
                              <span className={`inline-block px-2 py-0.5 rounded text-white text-xs font-semibold ${
                                entry.paidStatus === 'full' ? 'bg-green-600' :
                                entry.paidStatus === 'partial' ? 'bg-yellow-600' :
                                'bg-gray-600'
                              }`} data-testid={`status-paid-${entry.id}`}>
                                {entry.paidStatus.charAt(0).toUpperCase() + entry.paidStatus.slice(1)}
                              </span>
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDelete(entry.id)}
                                disabled={deleting || loading}
                                className="text-xs text-red-600 hover:text-red-700 font-semibold bg-red-50 hover:bg-red-100 px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                data-testid={`button-delete-allowance-${entry.id}`}
                              >
                                {deleting ? 'Deleting...' : 'Delete'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View - Hidden on Desktop */}
              <div className="lg:hidden space-y-2 max-h-96 overflow-y-auto">
                {filteredEntries.map((entry) => {
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

                  const approvalCount = entry.approvalCount || 0;
                  const savedStatus = entry.approvalStatus;
                  const maxApprovals = (entry as any).requiredApprovals || requiredApprovals;

                  let displayStatus: string;
                  if (savedStatus === 'approved' || savedStatus === 'rejected') {
                    displayStatus = savedStatus;
                  } else {
                    if (approvalCount >= maxApprovals && maxApprovals > 0) {
                      displayStatus = 'approved';
                    } else if (approvalCount > 0) {
                      displayStatus = 'processing';
                    } else {
                      displayStatus = 'pending';
                    }
                  }

                  const canDelete = !entry.approvalCount || entry.approvalCount === 0;

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
                          <p className="text-xs text-gray-500">Submitted By</p>
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

                      {/* Selected Employees Row */}
                      {entry.selectedEmployeeIds && (() => {
                        try {
                          const selectedIds = JSON.parse(entry.selectedEmployeeIds);
                          if (Array.isArray(selectedIds) && selectedIds.length > 0) {
                            return (
                              <div className="mb-2 pb-2 border-b">
                                <p className="text-xs text-gray-500 mb-1">
                                  Submitted For ({selectedIds.length} employee{selectedIds.length !== 1 ? 's' : ''})
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {selectedIds.map((empId: string, idx: number) => (
                                    <span
                                      key={idx}
                                      className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium"
                                      data-testid={`badge-selected-employee-${entry.id}-${idx}`}
                                    >
                                      {getEmployeeName(empId)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        } catch (e) {
                          return null;
                        }
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
                            displayStatus === 'approved' ? 'bg-green-600' :
                            displayStatus === 'rejected' ? 'bg-red-600' :
                            displayStatus === 'processing' ? 'bg-yellow-600' :
                            'bg-gray-600'
                          }`} data-testid={`status-approval-${entry.id}`}>
                            {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                            {approvalCount > 0 ? ` (${approvalCount}/${maxApprovals})` : ''}
                          </span>
                          <span className={`inline-block px-2 py-0.5 rounded text-white text-xs font-semibold ${
                            entry.paidStatus === 'full' ? 'bg-green-600' :
                            entry.paidStatus === 'partial' ? 'bg-yellow-600' :
                            'bg-gray-600'
                          }`} data-testid={`status-paid-${entry.id}`}>
                            {entry.paidStatus.charAt(0).toUpperCase() + entry.paidStatus.slice(1)}
                          </span>
                        </div>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(entry.id)}
                            disabled={deleting || loading}
                            className="text-xs text-red-600 hover:text-red-700 font-semibold bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            data-testid={`button-delete-allowance-${entry.id}`}
                          >
                            {deleting ? (
                              <>
                                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Deleting...
                              </>
                            ) : 'Delete'}
                          </button>
                        )}
                      </div>

                      {allowanceData.notes && (
                        <p className="text-xs text-gray-600 mt-2 italic border-t pt-2">Note: {allowanceData.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}