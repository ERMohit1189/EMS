import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Download, Eye, CheckCircle, XCircle, FileDown, Printer } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { getApiBaseUrl } from "@/lib/api";
import { fetchWithLoader, authenticatedFetch } from "@/lib/fetchWithLoader";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import type { Vendor } from "@shared/schema";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fetchExportHeader, type ExportHeader } from "@/lib/exportUtils";

export default function VendorList() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalVendors, setTotalVendors] = useState(0);
  const [vendorUsage, setVendorUsage] = useState<{ [key: string]: boolean }>({});
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const { toast } = useToast();

  // When server-side paging is enabled, `vendors` contains only the current page
  const filteredVendors = vendors;

  useEffect(() => {
    fetchVendors();
  }, [currentPage, pageSize, statusFilter]);

  const startIndex = totalVendors === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(totalVendors, currentPage * pageSize);

  const fetchVendors = async () => {
    try {
      setLoading(true); // Always show loader instantly
      setTableLoading(true);

      const params = new URLSearchParams();
      params.append('page', String(currentPage));
      params.append('pageSize', String(pageSize));
      if (statusFilter && statusFilter !== 'All') params.append('status', statusFilter);

      const url = `${getApiBaseUrl()}/api/vendors?${params.toString()}`;
      const response = await authenticatedFetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Failed to fetch vendors (${response.status})`);
      }
      const result = await response.json();

      const vendors_data: Vendor[] = result.data || [];
      const total = result.totalCount || 0;

      const usageMap: { [key: string]: boolean } = {};
      vendors_data.forEach((vendor: any) => {
        usageMap[vendor.id] = vendor.isUsed || false;
      });

      setVendors(vendors_data);
      setVendorUsage(usageMap);
      setTotalVendors(total);
    } catch (error) {
      console.error('[VendorList] Error loading vendors:', error);
      toast({ title: 'Error', description: 'Failed to load vendors', variant: 'destructive' });
      setVendors([]);
      setTotalVendors(0);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const url = `${getApiBaseUrl()}/api/vendors/${id}/status`;
      const response = await fetchWithLoader(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Failed to update status');
      fetchVendors();
      toast({
        title: 'Success',
        description: 'Vendor status updated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update vendor status',
        variant: 'destructive',
      });
    }
  };

  const deleteVendor = async (id: string, name: string) => {
    if (!confirm(`Delete vendor "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const url = `${getApiBaseUrl()}/api/vendors/${id}`;
      const response = await fetchWithLoader(url, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete vendor');

      setVendors(vendors.filter(v => v.id !== id));
      toast({
        title: 'Success',
        description: `Vendor "${name}" has been deleted.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete vendor',
        variant: 'destructive',
      });
    }
  };

  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingPrint, setExportingPrint] = useState(false);

  const exportToExcel = async () => {
    setExportingExcel(true);
    try {
      const exportHeader = await fetchExportHeader();
      
      // Format date as "9 December 2025"
      const formatDate = () => {
        const date = new Date();
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      };
      
      // Create workbook and worksheet using ExcelJS
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Vendors');

      // Set column widths
      worksheet.columns = [
        { width: 15 }, { width: 30 }, { width: 30 }, { width: 15 },
        { width: 20 }, { width: 20 }, { width: 15 }, { width: 12 },
        { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 },
        { width: 15 }, { width: 15 }, { width: 20 }, { width: 15 }
      ];

      // Add date header row
      const dateRow = worksheet.addRow([`Generated on: ${formatDate()}`]);
      worksheet.mergeCells(1, 1, 1, 16);
      dateRow.height = 24;
      dateRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E78' }
      };
      dateRow.getCell(1).font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 11
      };
      dateRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

      // Add column headers
      const headerRow = worksheet.addRow([
        'Vendor Code', 'Name', 'Email', 'Mobile', 'City', 'State', 'Category', 'Status',
        'Aadhar No', 'Aadhar Doc', 'PAN No', 'PAN Doc', 'GSTIN No', 'GSTIN Doc', 'MOA', 'MOA Doc'
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

      // Add data rows
      filteredVendors.forEach((v) => {
        const dataRow = worksheet.addRow([
          v.vendorCode || '-',
          v.name,
          v.email,
          v.mobile,
          v.city,
          v.state,
          v.category,
          v.status,
          v.aadhar || '-',
          v.aadharDoc ? '✓ Uploaded' : '✗ Not Uploaded',
          v.pan || '-',
          v.panDoc ? '✓ Uploaded' : '✗ Not Uploaded',
          v.gstin || '-',
          v.gstinDoc ? '✓ Uploaded' : '✗ Not Uploaded',
          v.moa || '-',
          v.moaDoc ? '✓ Uploaded' : '✗ Not Uploaded',
        ]);

        // Style data cells
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

      // Generate buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Vendors_List_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Success',
        description: 'Vendors exported to Excel successfully',
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
      const doc = new jsPDF('l', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Company Header with gradient-style background
      const headerStartY = 8;
      const headerHeight = 32;
      
      // Draw gradient-style background box (using purple color from gradient)
      doc.setFillColor(102, 126, 234); // #667eea
      doc.roundedRect(10, headerStartY, pageWidth - 20, headerHeight, 3, 3, 'F');
      
      // Company name in white
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(exportHeader.companyName || 'Enterprise Operations Management System (EOMS)', pageWidth / 2, headerStartY + 8, { align: 'center' });
      
      // Company details in white
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      let yPos = headerStartY + 13;
      
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
      
      // Reset text color for content below header
      doc.setTextColor(0, 0, 0);
      yPos = headerStartY + headerHeight + 5;
      
      // Report Title (outside header)
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('VENDOR LIST REPORT', pageWidth / 2, yPos, { align: 'center' });
      yPos += 6;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;
      doc.text(`Total Vendors: ${filteredVendors.length} | Status Filter: ${statusFilter}`, pageWidth / 2, yPos, { align: 'center' });

      const tableData = filteredVendors.map(v => [
        v.vendorCode || '-',
        v.name || '-',
        v.email || '-',
        v.mobile || '-',
        `${v.city || ''}, ${v.state || ''}`,
        v.category || '-',
        v.status || '-',
        v.aadhar || '-',
        v.aadharDoc ? '✓' : '✗',
        v.pan || '-',
        v.panDoc ? '✓' : '✗',
        v.gstin || '-',
        v.gstinDoc ? '✓' : '✗',
        v.moa || '-',
        v.moaDoc ? '✓' : '✗',
      ]);

      autoTable(doc, {
        head: [[
          'Code',
          'Name',
          'Email',
          'Mobile',
          'Location',
          'Category',
          'Status',
          'Aadhar No',
          'Aadhar Doc',
          'PAN No',
          'PAN Doc',
          'GSTIN No',
          'GSTIN Doc',
          'MOA',
          'MOA Doc'
        ]],
        body: tableData,
        startY: yPos + 5,
        styles: { 
          fontSize: 7, 
          cellPadding: 1.5,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        headStyles: { 
          fillColor: [41, 128, 185], 
          textColor: 255, 
          fontStyle: 'bold',
          fontSize: 7,
          halign: 'center'
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 15 },  // Code
          1: { cellWidth: 25 },  // Name
          2: { cellWidth: 30 },  // Email
          3: { cellWidth: 18 },  // Mobile
          4: { cellWidth: 25 },  // Location
          5: { cellWidth: 18 },  // Category
          6: { cellWidth: 15 },  // Status
          7: { cellWidth: 20 },  // Aadhar No
          8: { cellWidth: 10, halign: 'center' },  // Aadhar Doc
          9: { cellWidth: 20 },  // PAN No
          10: { cellWidth: 10, halign: 'center' }, // PAN Doc
          11: { cellWidth: 20 }, // GSTIN No
          12: { cellWidth: 10, halign: 'center' }, // GSTIN Doc
          13: { cellWidth: 20 }, // MOA
          14: { cellWidth: 10, halign: 'center' }, // MOA Doc
        },
      });

      doc.save(`Vendors_List_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: 'Success',
        description: 'Vendors exported to PDF successfully',
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
          <title>Vendors List</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; padding: 20px; margin-bottom: 10px; border-radius: 8px; }
            h1 { color: white; margin: 0; font-size: 24px; }
            .company-details { font-size: 11px; margin-top: 8px; line-height: 1.6; }
            .report-title { text-align: center; font-size: 18px; font-weight: bold; margin: 15px 0; color: #2c3e50; }
            .meta { text-align: center; color: #666; margin: 10px 0 20px 0; font-size: 12px; padding: 10px; background: #f8f9fa; border-radius: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background-color: #2980b9; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .doc-status { text-align: center; font-size: 14px; }
            .uploaded { color: green; font-weight: bold; }
            .not-uploaded { color: red; }
            @media print {
              body { margin: 0; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${exportHeader.companyName || 'Enterprise Operations Management System (EOMS)'}</h1>
            <div class="company-details">
              ${exportHeader.address ? exportHeader.address + '<br>' : ''}
              ${[exportHeader.contactEmail, exportHeader.contactPhone].filter(Boolean).join(' | ')}<br>
              ${[exportHeader.gstin ? `GSTIN: ${exportHeader.gstin}` : '', exportHeader.website].filter(Boolean).join(' | ')}
            </div>
          </div>
          <div class="report-title">VENDOR LIST REPORT</div>
          <div class="meta">
            <strong>Generated on:</strong> ${new Date().toLocaleString()} | 
            <strong>Total Vendors:</strong> ${filteredVendors.length} | 
            <strong>Status Filter:</strong> ${statusFilter}
          </div>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Location</th>
                <th>Category</th>
                <th>Status</th>
                <th>Aadhar No</th>
                <th>Aadhar Doc</th>
                <th>PAN No</th>
                <th>PAN Doc</th>
                <th>GSTIN No</th>
                <th>GSTIN Doc</th>
                <th>MOA</th>
                <th>MOA Doc</th>
              </tr>
            </thead>
            <tbody>
              ${filteredVendors.map(v => `
                <tr>
                  <td>${v.vendorCode || '-'}</td>
                  <td>${v.name}</td>
                  <td>${v.email}</td>
                  <td>${v.mobile}</td>
                  <td>${v.city}, ${v.state}</td>
                  <td>${v.category}</td>
                  <td>${v.status}</td>
                  <td>${v.aadhar || '-'}</td>
                  <td class="doc-status ${v.aadharDoc ? 'uploaded' : 'not-uploaded'}">${v.aadharDoc ? '✓' : '✗'}</td>
                  <td>${v.pan || '-'}</td>
                  <td class="doc-status ${v.panDoc ? 'uploaded' : 'not-uploaded'}">${v.panDoc ? '✓' : '✗'}</td>
                  <td>${v.gstin || '-'}</td>
                  <td class="doc-status ${v.gstinDoc ? 'uploaded' : 'not-uploaded'}">${v.gstinDoc ? '✓' : '✗'}</td>
                  <td>${v.moa || '-'}</td>
                  <td class="doc-status ${v.moaDoc ? 'uploaded' : 'not-uploaded'}">${v.moaDoc ? '✓' : '✗'}</td>
                </tr>
              `).join('')}
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

  if (loading) {
    return <SkeletonLoader type="dashboard" />;
  }
  
  return (
    <div className="space-y-4 md:space-y-6">
       <div className="rounded-lg p-4 bg-card">
         <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
           <div>
             <h2 className="text-2xl md:text-3xl font-bold tracking-tight">All Vendors</h2>
             <p className="text-xs md:text-sm text-muted-foreground">
               Manage your registered vendors. {statusFilter !== 'All' && `Showing ${filteredVendors.length} of ${vendors.length} vendors`}
             </p>
           </div>
           <div className="flex flex-wrap gap-2">
           <Link href="/vendor/register">
             <Button className="gap-2 text-xs md:text-sm bg-white text-blue-600 hover:bg-blue-50">
               <Plus className="h-4 w-4" /> Register Vendor
             </Button>
           </Link>
           <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
             <SelectTrigger className="w-[140px] h-9">
               <SelectValue placeholder="Filter by status" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="All">All Status</SelectItem>
               <SelectItem value="Pending">Pending</SelectItem>
               <SelectItem value="Approved">Approved</SelectItem>
               <SelectItem value="Rejected">Rejected</SelectItem>
             </SelectContent>
           </Select>
           <Button
             variant="outline"
             size="sm"
             onClick={exportToExcel}
             disabled={exportingExcel || filteredVendors.length === 0}
             className="gap-2"
           >
             {exportingExcel ? (
               <span className="animate-spin">⏳</span>
             ) : (
               <FileDown className="h-4 w-4" />
             )}
             Excel
           </Button>
           <Button
             variant="outline"
             size="sm"
             onClick={exportToPDF}
             disabled={exportingPDF || filteredVendors.length === 0}
             className="gap-2"
           >
             {exportingPDF ? (
               <span className="animate-spin">⏳</span>
             ) : (
               <FileDown className="h-4 w-4" />
             )}
             PDF
           </Button>
           <Button
             variant="outline"
             size="sm"
             onClick={handlePrint}
             disabled={exportingPrint || filteredVendors.length === 0}
             className="gap-2"
           >
             {exportingPrint ? (
               <span className="animate-spin">⏳</span>
             ) : (
               <Printer className="h-4 w-4" />
             )}
             Print
           </Button>
         </div>
       </div>

       {/* Desktop Table */}
       <div className="hidden md:block rounded-md border bg-card overflow-x-auto max-h-[60vh] overflow-auto">
         <div className="sticky top-0 z-20 grid grid-cols-12 gap-3 p-4 font-medium border-b bg-primary text-primary-foreground text-xs min-w-[1400px]">
           <div className="col-span-2">Name / Email</div>
           <div>Location</div>
           <div>Category</div>
           <div>Status</div>
           <div>Aadhar</div>
           <div>PAN</div>
           <div>GSTIN</div>
           <div>MOA</div>
           <div>Contact</div>
           <div className="text-right">Actions</div>
         </div>
         {tableLoading ? (
           <div className="p-8">
             <SkeletonLoader type="table" count={Math.min(pageSize, 10)} />
           </div>
         ) : filteredVendors.length === 0 ? (
           <div className="p-8 text-center text-muted-foreground">
             {statusFilter === 'All' ? 'No vendors found. Register one to get started.' : `No vendors with status "${statusFilter}".`}
           </div>
         ) : (
           filteredVendors.map(v => (
             <div key={v.id} className="grid grid-cols-12 gap-3 p-4 border-b last:border-0 items-center hover:bg-muted/50 transition-colors min-w-[1400px]">
               <div className="col-span-2">
                 <div className="font-medium text-sm">{v.name}</div>
                 <div className="text-xs text-muted-foreground truncate">{v.email}</div>
                 <div className="text-xs font-mono font-bold text-primary mt-1" data-testid={`vendor-code-${v.id}`}>Vendor Code: {v.vendorCode || '-'}</div>
               </div>
               <div className="text-xs">{v.city}, {v.state}</div>
               <div className="text-xs">{v.category}</div>
               <div>
                 <Select value={v.status} onValueChange={(status) => updateStatus(v.id, status)}>
                   <SelectTrigger className="w-[110px] h-8 text-xs">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="Pending">Pending</SelectItem>
                     <SelectItem value="Approved">Approved</SelectItem>
                     <SelectItem value="Rejected">Rejected</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               {/* Aadhar Document */}
               <div className="flex items-center gap-1">
                 {v.aadharDoc ? (
                   <>
                     <CheckCircle className="h-3 w-3 text-green-600" />
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => window.open(`${getApiBaseUrl()}/uploads/${v.aadharDoc}`, '_blank')}
                       className="h-6 px-1"
                       title="Download Aadhar"
                     >
                       <Download className="h-3 w-3" />
                     </Button>
                   </>
                 ) : (
                   <span className="flex items-center gap-1 text-xs text-muted-foreground">
                     <XCircle className="h-3 w-3 text-red-400" />
                     <span>-</span>
                   </span>
                 )}
               </div>
               {/* PAN Document */}
               <div className="flex items-center gap-1">
                 {v.panDoc ? (
                   <>
                     <CheckCircle className="h-3 w-3 text-green-600" />
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => window.open(`${getApiBaseUrl()}/uploads/${v.panDoc}`, '_blank')}
                       className="h-6 px-1"
                       title="Download PAN"
                     >
                       <Download className="h-3 w-3" />
                     </Button>
                   </>
                 ) : (
                   <span className="flex items-center gap-1 text-xs text-muted-foreground">
                     <XCircle className="h-3 w-3 text-red-400" />
                     <span>-</span>
                   </span>
                 )}
               </div>
               {/* GSTIN Document */}
               <div className="flex items-center gap-1">
                 {v.gstinDoc ? (
                   <>
                     <CheckCircle className="h-3 w-3 text-green-600" />
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => window.open(`${getApiBaseUrl()}/uploads/${v.gstinDoc}`, '_blank')}
                       className="h-6 px-1"
                       title="Download GSTIN"
                     >
                       <Download className="h-3 w-3" />
                     </Button>
                   </>
                 ) : (
                   <span className="flex items-center gap-1 text-xs text-muted-foreground">
                     <XCircle className="h-3 w-3 text-red-400" />
                     <span>-</span>
                   </span>
                 )}
               </div>
               {/* MOA Document */}
               <div className="flex items-center gap-1">
                 {v.moaDoc ? (
                   <>
                     <CheckCircle className="h-3 w-3 text-green-600" />
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => window.open(`${getApiBaseUrl()}/uploads/${v.moaDoc}`, '_blank')}
                       className="h-6 px-1"
                       title="Download MOA"
                     >
                       <Download className="h-3 w-3" />
                     </Button>
                   </>
                 ) : (
                   <span className="flex items-center gap-1 text-xs text-muted-foreground">
                     <XCircle className="h-3 w-3 text-red-400" />
                     <span>-</span>
                   </span>
                 )}
               </div>
               <div className="text-xs font-mono">{v.mobile}</div>
               <div className="text-right flex gap-1 justify-end">
                 <Link href={`/vendor/edit/${v.id}`}>
                   <Button variant="ghost" size="sm" className="gap-1 h-8">
                     <Edit className="h-4 w-4" />
                   </Button>
                 </Link>
                 {vendorUsage[v.id] === false && (
                   <Button 
                     variant="destructive" 
                     size="sm"
                     className="h-8"
                     onClick={() => deleteVendor(v.id, v.name)}
                   >
                     <Trash2 className="h-4 w-4" />
                   </Button>
                 )}
               </div>
             </div>
           ))
         )}
       </div>

      {/* Mobile Pagination Controls */}
      <div className="md:hidden flex flex-col gap-2 mt-4">
        <div className="text-xs text-muted-foreground">Showing {startIndex} - {endIndex} of {totalVendors.toLocaleString()}</div>
        <div className="flex items-center gap-1 flex-wrap">
          <Button type="button" size="xs" variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="text-xs h-8">Prev</Button>
          <Input value={String(currentPage)} onChange={(e) => { const v = Number(e.target.value || 1); if (!isNaN(v)) setCurrentPage(Math.min(Math.max(1, v), Math.max(1, Math.ceil(totalVendors / pageSize)))); }} className="w-12 h-8 text-center text-xs" onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />
          <div className="text-xs text-muted-foreground">of {Math.max(1, Math.ceil(totalVendors / pageSize))}</div>
          <Button type="button" size="xs" variant="outline" onClick={() => setCurrentPage(p => Math.min(Math.max(1, Math.ceil(totalVendors / pageSize)), p + 1))} disabled={currentPage === Math.max(1, Math.ceil(totalVendors / pageSize))} className="text-xs h-8">Next</Button>
        </div>
      </div>

      {/* Pagination controls */}
      <div className="hidden md:flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">Showing {startIndex} - {endIndex} of {totalVendors.toLocaleString()} vendors</div>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>First</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</Button>
          <div className="px-2">Page</div>
          <Input value={String(currentPage)} onChange={(e) => { const v = Number(e.target.value || 1); if (!isNaN(v)) setCurrentPage(Math.min(Math.max(1, v), Math.max(1, Math.ceil(totalVendors / pageSize)))); }} className="w-16 text-center" onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />
          <div className="px-2">of {Math.max(1, Math.ceil(totalVendors / pageSize))}</div>
          <Button type="button" size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.min(Math.max(1, Math.ceil(totalVendors / pageSize)), p + 1))} disabled={currentPage === Math.max(1, Math.ceil(totalVendors / pageSize))}>Next</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setCurrentPage(Math.max(1, Math.ceil(totalVendors / pageSize)))} disabled={currentPage === Math.max(1, Math.ceil(totalVendors / pageSize))}>Last</Button>
          <select className="form-select text-sm" value={String(pageSize)} onChange={(e) => { const v = Number(e.target.value || 25); setPageSize(v); setCurrentPage(1); }}>
            {[10,25,50,100].map(sz => <option key={sz} value={sz}>{sz}</option>)}
          </select>
        </div>
      </div>

       {/* Mobile Card View */}
       <div className="md:hidden space-y-2">
         {filteredVendors.length === 0 ? (
           <div className="p-6 text-center text-muted-foreground text-sm">
             {statusFilter === 'All' ? 'No vendors found. Register one to get started.' : `No vendors with status "${statusFilter}".`}
           </div>
         ) : (
           filteredVendors.map(v => (
             <Card key={v.id} className="p-3 shadow-sm border">
               <div className="space-y-2">
                 <div className="flex items-start justify-between gap-2">
                   <div className="flex-1 min-w-0">
                     <p className="font-medium text-sm truncate">{v.name}</p>
                     <p className="text-xs text-muted-foreground truncate">{v.email}</p>
                     <p className="text-xs font-mono font-bold text-primary mt-1" data-testid={`vendor-code-mobile-${v.id}`}>Vendor Code: {v.vendorCode || '-'}</p>
                   </div>
                   <div className="flex gap-1 flex-shrink-0">
                     <Link href={`/vendor/edit/${v.id}`}>
                       <Button variant="ghost" size="sm" className="gap-1 h-7 px-2">
                         <Edit className="h-3 w-3" />
                       </Button>
                     </Link>
                     {vendorUsage[v.id] === false && (
                       <Button 
                         variant="destructive" 
                         size="sm"
                         className="h-7 px-2"
                         onClick={() => deleteVendor(v.id, v.name)}
                       >
                         <Trash2 className="h-3 w-3" />
                       </Button>
                     )}
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-2 text-xs">
                   <div>
                     <p className="text-muted-foreground">Location</p>
                     <p className="font-medium truncate">{v.city}, {v.state}</p>
                   </div>
                   <div>
                     <p className="text-muted-foreground">Category</p>
                     <p className="font-medium">{v.category}</p>
                   </div>
                   <div>
                     <p className="text-muted-foreground">Contact</p>
                     <p className="font-medium text-xs">{v.mobile}</p>
                   </div>
                   <div>
                     <p className="text-muted-foreground">Status</p>
                     <Select value={v.status} onValueChange={(status) => updateStatus(v.id, status)}>
                       <SelectTrigger className="h-6 text-xs w-full">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="Pending">Pending</SelectItem>
                         <SelectItem value="Approved">Approved</SelectItem>
                         <SelectItem value="Rejected">Rejected</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                 </div>
                 {/* Document Status Section */}
                 <div className="border-t pt-2 mt-2">
                   <p className="text-xs font-medium text-muted-foreground mb-2">Documents</p>
                   <div className="grid grid-cols-2 gap-2">
                     <div className="flex items-center gap-1">
                       {v.aadharDoc ? (
                         <>
                           <CheckCircle className="h-3 w-3 text-green-600" />
                           <span className="text-xs">Aadhar</span>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => window.open(`${getApiBaseUrl()}/uploads/${v.aadharDoc}`, '_blank')}
                             className="h-5 px-1 ml-auto"
                           >
                             <Download className="h-3 w-3" />
                           </Button>
                         </>
                       ) : (
                         <>
                           <XCircle className="h-3 w-3 text-red-400" />
                           <span className="text-xs text-muted-foreground">Aadhar</span>
                         </>
                       )}
                     </div>
                     <div className="flex items-center gap-1">
                       {v.panDoc ? (
                         <>
                           <CheckCircle className="h-3 w-3 text-green-600" />
                           <span className="text-xs">PAN</span>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => window.open(`${getApiBaseUrl()}/uploads/${v.panDoc}`, '_blank')}
                             className="h-5 px-1 ml-auto"
                           >
                             <Download className="h-3 w-3" />
                           </Button>
                         </>
                       ) : (
                         <>
                           <XCircle className="h-3 w-3 text-red-400" />
                           <span className="text-xs text-muted-foreground">PAN</span>
                         </>
                       )}
                     </div>
                     <div className="flex items-center gap-1">
                       {v.gstinDoc ? (
                         <>
                           <CheckCircle className="h-3 w-3 text-green-600" />
                           <span className="text-xs">GSTIN</span>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => window.open(`${getApiBaseUrl()}/uploads/${v.gstinDoc}`, '_blank')}
                             className="h-5 px-1 ml-auto"
                           >
                             <Download className="h-3 w-3" />
                           </Button>
                         </>
                       ) : (
                         <>
                           <XCircle className="h-3 w-3 text-red-400" />
                           <span className="text-xs text-muted-foreground">GSTIN</span>
                         </>
                       )}
                     </div>
                     <div className="flex items-center gap-1">
                       {v.moaDoc ? (
                         <>
                           <CheckCircle className="h-3 w-3 text-green-600" />
                           <span className="text-xs">MOA</span>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => window.open(`${getApiBaseUrl()}/uploads/${v.moaDoc}`, '_blank')}
                             className="h-5 px-1 ml-auto"
                           >
                             <Download className="h-3 w-3" />
                           </Button>
                         </>
                       ) : (
                         <>
                           <XCircle className="h-3 w-3 text-red-400" />
                           <span className="text-xs text-muted-foreground">MOA</span>
                         </>
                       )}
                     </div>
                   </div>
                 </div>
               </div>
             </Card>
           ))
         )}
       </div>
      </div>
     </div>
  );
}
