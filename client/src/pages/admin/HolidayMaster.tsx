import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Sparkles, Plus, Trash2, Edit, Calendar, MapPin, RefreshCw, Search, FileDown, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiCall } from '@/lib/api';
import { IndianStates } from '@/assets/india-data';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchExportHeader, type ExportHeader } from '@/lib/exportUtils';

interface Holiday {
  id: string;
  name: string;
  date: string;
  state: string | null;
  type: 'public' | 'optional' | 'restricted';
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

interface SuggestedHoliday {
  name: string;
  date: string;
  description: string;
  type: 'public' | 'optional' | 'restricted';
  selected?: boolean;
}

export default function HolidayMaster() {
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
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingPrint, setExportingPrint] = useState(false);
  const [suggestedHolidays, setSuggestedHolidays] = useState<SuggestedHoliday[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    state: '',
    type: 'public' as 'public' | 'optional' | 'restricted',
    description: '',
  });

  // Filter holidays based on search query
  const filteredHolidays = holidays.filter(holiday => {
    const query = searchQuery.toLowerCase();
    return (
      holiday.name.toLowerCase().includes(query) ||
      holiday.type.toLowerCase().includes(query) ||
      (holiday.state && holiday.state.toLowerCase().includes(query)) ||
      new Date(holiday.date).toLocaleDateString('en-IN').includes(query)
    );
  });

  useEffect(() => {
    fetchHolidays();
  }, [selectedYear]);

  const fetchHolidays = async () => {
    try {
      const response = await apiCall(`/api/holidays?year=${selectedYear}`);
      if (response.ok) {
        const data = await response.json();
        setHolidays(data);
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);
      toast({ title: 'Error', description: 'Failed to fetch holidays', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const generateAIHolidays = async () => {
    if (!selectedState) {
      toast({ title: 'Error', description: 'Please select a state first', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiCall('/api/holidays/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: selectedState, year: selectedYear }),
      });

      if (response.ok) {
        const data = await response.json();
        // Mark all holidays as selected by default
        const holidaysWithSelection = data.holidays.map((h: SuggestedHoliday) => ({
          ...h,
          selected: true,
        }));
        setSuggestedHolidays(holidaysWithSelection);
        setShowSuggestions(true);
        toast({ 
          title: 'Success', 
          description: `Generated ${data.holidays.length} holiday suggestions for ${selectedState}`,
        });
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to generate holidays');
      }
    } catch (error: any) {
      console.error('Error generating holidays:', error);
      toast({ title: 'Error', description: error.message || 'Failed to generate holiday suggestions', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveSuggestedHolidays = async () => {
    setIsSaving(true);
    try {
      const selectedHolidays = suggestedHolidays.filter(h => h.selected);
      
      if (selectedHolidays.length === 0) {
        toast({ title: 'Error', description: 'Please select at least one holiday to save', variant: 'destructive' });
        setIsSaving(false);
        return;
      }

      const holidaysToSave = selectedHolidays.map(h => ({
        name: h.name,
        date: h.date,
        description: h.description,
        type: h.type,
        state: selectedState,
        isActive: true,
      }));

      const response = await apiCall('/api/holidays/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holidays: holidaysToSave }),
      });

      if (response.ok) {
        const data = await response.json();
        const { inserted = 0, updated = 0 } = data;
        
        let message = '';
        if (inserted > 0 && updated > 0) {
          message = `${inserted} holiday(s) added and ${updated} holiday(s) updated`;
        } else if (inserted > 0) {
          message = `${inserted} holiday(s) added successfully`;
        } else if (updated > 0) {
          message = `${updated} holiday(s) updated successfully`;
        }
        
        toast({ title: 'Success', description: message });
        setShowSuggestions(false);
        setSuggestedHolidays([]);
        fetchHolidays();
      } else {
        throw new Error('Failed to save holidays');
      }
    } catch (error) {
      console.error('Error saving holidays:', error);
      toast({ title: 'Error', description: 'Failed to save holidays', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddHoliday = async () => {
    setIsSaving(true);
    try {
      const response = await apiCall('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        const message = data.isUpdated 
          ? 'Holiday updated successfully (existing holiday found)' 
          : 'Holiday added successfully';
        toast({ title: 'Success', description: message });
        setShowEditDialog(false);
        resetForm();
        fetchHolidays();
      } else {
        throw new Error('Failed to add holiday');
      }
    } catch (error) {
      console.error('Error adding holiday:', error);
      toast({ title: 'Error', description: 'Failed to save holiday', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateHoliday = async () => {
    if (!editingHoliday) return;

    setIsSaving(true);
    try {
      const response = await apiCall(`/api/holidays/${editingHoliday.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Holiday updated successfully' });
        setShowEditDialog(false);
        setEditingHoliday(null);
        resetForm();
        fetchHolidays();
      } else {
        throw new Error('Failed to update holiday');
      }
    } catch (error) {
      console.error('Error updating holiday:', error);
      toast({ title: 'Error', description: 'Failed to update holiday', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;

    try {
      const response = await apiCall(`/api/holidays/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Holiday deleted successfully' });
        fetchHolidays();
      } else {
        throw new Error('Failed to delete holiday');
      }
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast({ title: 'Error', description: 'Failed to delete holiday', variant: 'destructive' });
    }
  };

  const openEditDialog = (holiday?: Holiday) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        name: holiday.name,
        date: holiday.date,
        state: holiday.state || '',
        type: holiday.type,
        description: holiday.description || '',
      });
    } else {
      setEditingHoliday(null);
      resetForm();
    }
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      date: '',
      state: '',
      type: 'public',
      description: '',
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'public': return 'bg-green-100 text-green-800 border-green-300';
      case 'optional': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'restricted': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const exportToExcel = async () => {
    setExportingExcel(true);
    try {
      const exportHeader = await fetchExportHeader();
      
      const formatDate = () => {
        const date = new Date();
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      };
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Holidays');

      worksheet.columns = [
        { width: 25 }, { width: 15 }, { width: 20 }, { width: 18 }, { width: 40 }
      ];

      let currentRow = 1;

      // Company Header Row
      const companyRow = worksheet.addRow([exportHeader.companyName || 'Enterprise Operations Management System (EOMS)']);
      worksheet.mergeCells(currentRow, 1, currentRow, 5);
      companyRow.height = 28;
      companyRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF003D7A' }
      };
      companyRow.getCell(1).font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 14
      };
      companyRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      currentRow++;

      // Company Address
      if (exportHeader.address) {
        const addressRow = worksheet.addRow([exportHeader.address]);
        worksheet.mergeCells(currentRow, 1, currentRow, 5);
        addressRow.height = 18;
        addressRow.getCell(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0066CC' }
        };
        addressRow.getCell(1).font = {
          color: { argb: 'FFFFFFFF' },
          size: 9
        };
        addressRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        currentRow++;
      }

      // Contact Info
      const contactInfo = [exportHeader.contactEmail, exportHeader.contactPhone].filter(Boolean).join(' | ');
      if (contactInfo) {
        const contactRow = worksheet.addRow([contactInfo]);
        worksheet.mergeCells(currentRow, 1, currentRow, 5);
        contactRow.height = 18;
        contactRow.getCell(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0066CC' }
        };
        contactRow.getCell(1).font = {
          color: { argb: 'FFFFFFFF' },
          size: 9
        };
        contactRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        currentRow++;
      }

      // GSTIN & Website
      const gstWebsite = [exportHeader.gstin ? `GSTIN: ${exportHeader.gstin}` : '', exportHeader.website].filter(Boolean).join(' | ');
      if (gstWebsite) {
        const gstRow = worksheet.addRow([gstWebsite]);
        worksheet.mergeCells(currentRow, 1, currentRow, 5);
        gstRow.height = 18;
        gstRow.getCell(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0066CC' }
        };
        gstRow.getCell(1).font = {
          color: { argb: 'FFFFFFFF' },
          size: 9
        };
        gstRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        currentRow++;
      }

      // Report Title
      const titleRow = worksheet.addRow([`HOLIDAY LIST ${selectedYear}`]);
      worksheet.mergeCells(currentRow, 1, currentRow, 5);
      titleRow.height = 24;
      titleRow.getCell(1).font = {
        bold: true,
        size: 13
      };
      titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      currentRow++;

      // Generation Date
      const dateRow = worksheet.addRow([`Generated on: ${formatDate()} | Total Holidays: ${filteredHolidays.length}`]);
      worksheet.mergeCells(currentRow, 1, currentRow, 5);
      dateRow.height = 20;
      dateRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8F9FA' }
      };
      dateRow.getCell(1).font = {
        size: 10
      };
      dateRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      currentRow++;

      const headerRow = worksheet.addRow([
        'Holiday Name', 'Date', 'State', 'Type', 'Description'
      ]);
      headerRow.height = 26;
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1F4E78' }
        };
        cell.font = {
          bold: true,
          color: { argb: 'FFFFFFFF' },
          size: 10
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      filteredHolidays.forEach((h) => {
        const dataRow = worksheet.addRow([
          h.name,
          new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
          h.state || 'All India',
          h.type.charAt(0).toUpperCase() + h.type.slice(1),
          h.description || '-',
        ]);

        dataRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFFF' }
          };
          cell.alignment = { vertical: 'middle' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
          };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Holidays_${selectedYear}_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Success',
        description: 'Holidays exported to Excel successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export to Excel',
        variant: 'destructive',
      });
    } finally {
      setExportingExcel(false);
    }
  };

  const exportToPDF = async () => {
    setExportingPDF(true);
    try {
      const exportHeader = await fetchExportHeader();
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      
      const headerStartY = 8;
      const headerHeight = 35;
      
      // Draw gradient-style header background
      doc.setFillColor(102, 126, 234);
      doc.roundedRect(10, headerStartY, pageWidth - 20, headerHeight, 3, 3, 'F');
      
      // Company name
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(exportHeader.companyName || 'Enterprise Operations Management System (EOMS)', pageWidth / 2, headerStartY + 8, { align: 'center' });
      
      // Company details in white
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      let yPos = headerStartY + 14;
      
      if (exportHeader.address) {
        doc.text(exportHeader.address, pageWidth / 2, yPos, { align: 'center' });
        yPos += 4;
      }
      
      const contactInfo = [exportHeader.contactEmail, exportHeader.contactPhone].filter(Boolean).join(' | ');
      if (contactInfo) {
        doc.text(contactInfo, pageWidth / 2, yPos, { align: 'center' });
        yPos += 4;
      }
      
      const gstWebsite = [exportHeader.gstin ? `GSTIN: ${exportHeader.gstin}` : '', exportHeader.website].filter(Boolean).join(' | ');
      if (gstWebsite) {
        doc.text(gstWebsite, pageWidth / 2, yPos, { align: 'center' });
      }
      
      // Reset text color for content
      doc.setTextColor(0, 0, 0);
      yPos = headerStartY + headerHeight + 5;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`HOLIDAY LIST ${selectedYear}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 6;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;
      doc.text(`Total Holidays: ${filteredHolidays.length}`, pageWidth / 2, yPos, { align: 'center' });

      const tableData = filteredHolidays.map(h => [
        h.name,
        new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
        h.state || 'All India',
        h.type.charAt(0).toUpperCase() + h.type.slice(1),
        h.description || '-',
      ]);

      autoTable(doc, {
        head: [['Holiday Name', 'Date', 'State', 'Type', 'Description']],
        body: tableData,
        startY: yPos + 5,
        styles: { 
          fontSize: 9, 
          cellPadding: 2.5,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        headStyles: { 
          fillColor: [41, 128, 185], 
          textColor: 255, 
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center'
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 35 },
          2: { cellWidth: 30 },
          3: { cellWidth: 25 },
          4: { cellWidth: 55 },
        },
      });

      doc.save(`Holidays_${selectedYear}_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: 'Success',
        description: 'Holidays exported to PDF successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export to PDF',
        variant: 'destructive',
      });
    } finally {
      setExportingPDF(false);
    }
  };

  const handlePrint = async () => {
    setExportingPrint(true);
    try {
      const exportHeader = await fetchExportHeader();
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Popup blocked');
      }

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Holidays List ${selectedYear}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; padding: 20px; margin-bottom: 10px; border-radius: 8px; position: relative; }
            .holiday-icons { position: absolute; top: 10px; left: 20px; font-size: 24px; opacity: 0.3; }
            .holiday-icons-right { position: absolute; top: 10px; right: 20px; font-size: 24px; opacity: 0.3; }
            h1 { color: white; margin: 0; font-size: 24px; }
            .company-details { font-size: 11px; margin-top: 8px; line-height: 1.6; }
            .report-title { text-align: center; font-size: 20px; font-weight: bold; margin: 15px 0; color: #2c3e50; 
                           display: flex; align-items: center; justify-content: center; gap: 10px; }
            .title-icon { font-size: 28px; }
            .meta { text-align: center; color: #666; margin: 10px 0 20px 0; font-size: 12px; padding: 10px; 
                    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 5px; 
                    border-left: 4px solid #667eea; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #2980b9; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .holiday-name { display: flex; align-items: center; gap: 8px; }
            .holiday-icon { font-size: 16px; }
            .type-badge { padding: 3px 8px; border-radius: 3px; font-size: 10px; font-weight: bold; display: inline-block; }
            .type-public { background: #d4edda; color: #155724; }
            .type-optional { background: #d1ecf1; color: #0c5460; }
            .type-restricted { background: #fff3cd; color: #856404; }
            @media print {
              body { margin: 0; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="holiday-icons">🎊 🎉 🎈</div>
            <div class="holiday-icons-right">🎆 🎇 ✨</div>
            <h1>${exportHeader.companyName || 'Enterprise Management System'}</h1>
            <div class="company-details">
              ${exportHeader.address ? exportHeader.address + '<br>' : ''}
              ${[exportHeader.contactEmail, exportHeader.contactPhone].filter(Boolean).join(' | ')}<br>
              ${[exportHeader.gstin ? `GSTIN: ${exportHeader.gstin}` : '', exportHeader.website].filter(Boolean).join(' | ')}
            </div>
          </div>
          <div class="report-title">
            <span class="title-icon">🗓️</span>
            HOLIDAY LIST ${selectedYear}
            <span class="title-icon">🎯</span>
          </div>
          <div class="meta">
            <strong>📅 Generated on:</strong> ${new Date().toLocaleString()} | 
            <strong>📊 Total Holidays:</strong> ${filteredHolidays.length}
          </div>
          <table>
            <thead>
              <tr>
                <th>🎭 Holiday Name</th>
                <th>📅 Date</th>
                <th>📍 State</th>
                <th>🏷️ Type</th>
                <th>📝 Description</th>
              </tr>
            </thead>
            <tbody>
              ${filteredHolidays.map(h => {
                const holidayName = h.name.toLowerCase();
                let icon = '🎉';
                if (holidayName.includes('diwali') || holidayName.includes('deepavali')) icon = '🪔';
                else if (holidayName.includes('holi')) icon = '🎨';
                else if (holidayName.includes('christmas')) icon = '🎄';
                else if (holidayName.includes('eid')) icon = '🌙';
                else if (holidayName.includes('republic') || holidayName.includes('independence')) icon = '🇮🇳';
                else if (holidayName.includes('gandhi')) icon = '👓';
                else if (holidayName.includes('new year')) icon = '🎊';
                else if (holidayName.includes('durga') || holidayName.includes('navratri') || holidayName.includes('dussehra')) icon = '🙏';
                else if (holidayName.includes('janmashtami') || holidayName.includes('krishna')) icon = '🦚';
                else if (holidayName.includes('ram') || holidayName.includes('navami')) icon = '🏹';
                else if (holidayName.includes('buddha') || holidayName.includes('mahavir')) icon = '☸️';
                else if (holidayName.includes('guru')) icon = '📖';
                
                return `
                <tr>
                  <td>
                    <div class="holiday-name">
                      <span class="holiday-icon">${icon}</span>
                      <span>${h.name}</span>
                    </div>
                  </td>
                  <td>${new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                  <td>${h.state || 'All India'}</td>
                  <td><span class="type-badge type-${h.type}">${h.type.charAt(0).toUpperCase() + h.type.slice(1)}</span></td>
                  <td>${h.description || '-'}</td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
        printWindow.onafterprint = () => printWindow.close();
      };

      toast({
        title: 'Success',
        description: 'Print preview opened',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to open print preview',
        variant: 'destructive',
      });
    } finally {
      setExportingPrint(false);
    }
  };

  const toggleHolidaySelection = (index: number) => {
    setSuggestedHolidays(prev => 
      prev.map((holiday, i) => 
        i === index ? { ...holiday, selected: !holiday.selected } : holiday
      )
    );
  };

  const toggleAllHolidays = () => {
    const allSelected = suggestedHolidays.every(h => h.selected);
    setSuggestedHolidays(prev => 
      prev.map(holiday => ({ ...holiday, selected: !allSelected }))
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-1">Holiday Master</h2>
            <p className="text-indigo-100 text-sm">AI-powered holiday management system</p>
          </div>
          <Button 
            onClick={fetchHolidays}
            className="bg-white text-indigo-600 hover:bg-indigo-50"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* AI Holiday Generator */}
      <Card className="shadow-lg border-2 border-indigo-200">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            AI Holiday Generator
          </CardTitle>
          <CardDescription>
            Automatically generate holidays based on your state and year
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-2 block">State</label>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger>
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent>
                  {IndianStates.map((state: string) => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Year</label>
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027, 2028].map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={generateAIHolidays}
                disabled={isGenerating || !selectedState}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Holidays
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suggested Holidays */}
      {showSuggestions && suggestedHolidays.length > 0 && (
        <Card className="shadow-lg border-2 border-green-200">
          <CardHeader className="bg-green-50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-green-900">
                  Suggested Holidays ({suggestedHolidays.filter(h => h.selected).length} of {suggestedHolidays.length} selected)
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">Uncheck holidays you don't want to save</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={toggleAllHolidays} 
                  variant="outline" 
                  size="sm"
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  {suggestedHolidays.every(h => h.selected) ? 'Deselect All' : 'Select All'}
                </Button>
                <Button 
                  onClick={saveSuggestedHolidays} 
                  disabled={isSaving}
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Selected'
                  )}
                </Button>
                <Button onClick={() => setShowSuggestions(false)} variant="outline" size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {suggestedHolidays.map((holiday, index) => (
                <div 
                  key={index} 
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    holiday.selected 
                      ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => toggleHolidaySelection(index)}
                >
                  <input
                    type="checkbox"
                    checked={holiday.selected || false}
                    onChange={() => toggleHolidaySelection(index)}
                    className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className={`font-medium ${!holiday.selected && 'text-gray-400'}`}>{holiday.name}</span>
                      <Badge className={getTypeColor(holiday.type)}>{holiday.type}</Badge>
                    </div>
                    <div className={`text-sm ml-7 mt-1 ${holiday.selected ? 'text-gray-600' : 'text-gray-400'}`}>
                      {new Date(holiday.date).toLocaleDateString('en-GB', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </div>
                    {holiday.description && (
                      <div className={`text-xs ml-7 mt-1 ${holiday.selected ? 'text-gray-500' : 'text-gray-400'}`}>
                        {holiday.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Holidays List */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Holidays ({filteredHolidays.length})</CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={exportToExcel} 
                disabled={exportingExcel || filteredHolidays.length === 0}
                size="sm" 
                variant="outline"
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                {exportingExcel ? 'Exporting...' : 'Excel'}
              </Button>
              <Button 
                onClick={exportToPDF} 
                disabled={exportingPDF || filteredHolidays.length === 0}
                size="sm" 
                variant="outline"
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                {exportingPDF ? 'Exporting...' : 'PDF'}
              </Button>
              <Button 
                onClick={handlePrint} 
                disabled={exportingPrint || filteredHolidays.length === 0}
                size="sm" 
                variant="outline"
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                {exportingPrint ? 'Printing...' : 'Print'}
              </Button>
              <Button onClick={() => openEditDialog()} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Holiday
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search holidays by name, type, state, or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading holidays...</div>
          ) : filteredHolidays.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? `No holidays found matching "${searchQuery}"` : `No holidays found for ${selectedYear}`}
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b-2">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Holiday Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">State</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                {filteredHolidays.map((holiday) => (
                  <tr key={holiday.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-sm">
                      {new Date(holiday.date).toLocaleDateString('en-GB', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm">{holiday.name}</td>
                    <td className="px-4 py-3 text-sm">
                      {holiday.state ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-gray-500" />
                          {holiday.state}
                        </div>
                      ) : (
                        <span className="text-gray-400">All India</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge className={getTypeColor(holiday.type)}>{holiday.type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {holiday.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditDialog(holiday)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteHoliday(holiday.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingHoliday ? 'Edit Holiday' : 'Add Holiday'}</DialogTitle>
            <DialogDescription>
              {editingHoliday ? 'Update holiday details' : 'Add a new holiday to the system'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Holiday Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Republic Day"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Date</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">State (Optional)</label>
              <Select 
                value={formData.state || 'all'} 
                onValueChange={(v) => setFormData({ ...formData, state: v === 'all' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select State (leave empty for All India)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All India</SelectItem>
                  {IndianStates.map((state: string) => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <Select 
                value={formData.type} 
                onValueChange={(v: any) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public Holiday</SelectItem>
                  <SelectItem value="optional">Optional Holiday</SelectItem>
                  <SelectItem value="restricted">Restricted Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional details about the holiday"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button 
              onClick={editingHoliday ? handleUpdateHoliday : handleAddHoliday}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {editingHoliday ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                <>{editingHoliday ? 'Update' : 'Add'} Holiday</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
