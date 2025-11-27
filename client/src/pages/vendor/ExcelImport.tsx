import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useStore } from '@/lib/mockData';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RawRowData {
  [key: string]: any;
}

export default function ExcelImport() {
  const { addSite, addVendor, addEmployee, sites, vendors, employees } = useStore();
  const { toast } = useToast();
  const [importedData, setImportedData] = useState<RawRowData[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importType, setImportType] = useState<'site' | 'vendor' | 'employee'>('site');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as RawRowData[];

        if (jsonData.length === 0) {
          toast({
            title: 'Empty file',
            description: 'No data found in Excel file',
          });
          return;
        }

        const allColumns = Object.keys(jsonData[0]);
        setColumns(allColumns);
        setImportedData(jsonData);
        setErrors([]);

        toast({
          title: `Loaded ${jsonData.length} rows`,
          description: `Found ${allColumns.length} columns. Ready to import.`,
        });
      } catch (error) {
        toast({
          title: 'Error reading file',
          description: 'Please ensure the file is a valid Excel file',
        });
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleImport = () => {
    if (importedData.length === 0) return;

    let imported = 0;
    const importErrors: string[] = [];

    importedData.forEach((row, idx) => {
      try {
        if (importType === 'site') {
          // Map all columns for site
          const siteData = {
            siteId: row['siteId'] || row['Site ID'] || `SITE-${idx}`,
            vendorId: vendors[0]?.id || '1',
            planId: row['planId'] || row['Plan ID'] || '',
            antennaSize: row['antennaSize'] || row['Antenna Size'] || '',
            incDate: row['incDate'] || row['INC Date'] || new Date().toISOString().split('T')[0],
            state: row['state'] || row['State'] || '',
            region: row['region'] || row['Region'] || '',
            zone: row['zone'] || row['Zone'] || '',
            inside: (row['inside'] === 'YES' || row['inside'] === 'yes' || row['inside'] === true) as boolean,
            formNo: row['formNo'] || row['Form No'] || '',
            siteAmount: Number(row['siteAmount'] || row['Site Amount'] || 0),
            vendorAmount: Number(row['vendorAmount'] || row['Vendor Amount'] || 0),
            status: 'Pending' as const,
            softAtRemark: row['softAtRemark'] || row['Soft AT Remark'] || 'Pending',
            phyAtRemark: 'Pending',
            atpRemark: 'Pending',
          };

          if (siteData.siteId && siteData.planId && siteData.formNo) {
            addSite(siteData);
            imported++;
          }
        } else if (importType === 'vendor') {
          // Map all columns for vendor
          const vendorData = {
            name: row['name'] || row['Name'] || '',
            email: row['email'] || row['Email'] || `vendor${idx}@example.com`,
            mobile: row['mobile'] || row['Mobile No'] || row['Mobile'] || '',
            address: row['address'] || row['Address'] || '',
            city: row['city'] || row['City'] || '',
            state: row['state'] || row['State'] || '',
            pincode: row['pincode'] || row['Pincode'] || '',
            country: row['country'] || row['Country'] || 'India',
            aadhar: row['aadhar'] || row['Aadhar'] || '',
            pan: row['pan'] || row['PAN'] || '',
            gstin: row['gstin'] || row['GSTIN'] || '',
            category: (row['category'] || row['Category'] || 'Individual') as 'Individual' | 'Company',
            status: 'Pending' as const,
            moa: row['moa'] || row['MOA'] || '',
          };

          if (vendorData.name && vendorData.aadhar && vendorData.pan) {
            addVendor(vendorData);
            imported++;
          }
        } else if (importType === 'employee') {
          // Map all columns for employee
          const employeeData = {
            name: row['name'] || row['Name'] || '',
            dob: row['dob'] || row['DOB'] || '',
            fatherName: row['fatherName'] || row['Father Name'] || '',
            mobile: row['mobile'] || row['Mobile No'] || row['Mobile'] || '',
            alternateNo: row['alternateNo'] || row['Alternate No'] || '',
            address: row['address'] || row['Address'] || '',
            city: row['city'] || row['City'] || '',
            state: row['state'] || row['State'] || '',
            country: row['country'] || row['Country'] || 'India',
            designation: row['designation'] || row['Designation'] || '',
            doj: row['doj'] || row['Date of Joining'] || row['DOJ'] || '',
            aadhar: row['aadhar'] || row['Aadhar'] || '',
            pan: row['pan'] || row['PAN'] || '',
            bloodGroup: row['bloodGroup'] || row['Blood Group'] || 'O+',
            maritalStatus: (row['maritalStatus'] || row['Marital Status'] || 'Single') as 'Single' | 'Married',
            nominee: row['nominee'] || row['Nominee'] || '',
            ppeKit: (row['ppeKit'] === 'YES' || row['ppeKit'] === true) as boolean,
            kitNo: row['kitNo'] || row['Kit No'] || '',
          };

          if (employeeData.name && employeeData.aadhar && employeeData.pan) {
            addEmployee(employeeData);
            imported++;
          }
        }
      } catch (err) {
        importErrors.push(`Row ${idx + 2}: Error processing data`);
      }
    });

    toast({
      title: 'Import Complete',
      description: `${imported} records imported successfully. ${importErrors.length} errors found.`,
    });

    setImportedData([]);
    setColumns([]);
    setErrors(importErrors);
  };

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        'Site ID': 'DL-1001',
        'Plan ID': 'P-500',
        'Antenna Size': '2.4m',
        'INC Date': '2024-01-20',
        'State': 'Delhi',
        'Region': 'North',
        'Zone': 'Zone-1',
        'Inside': 'YES',
        'Form No': 'F-101',
        'Site Amount': 50000,
        'Vendor Amount': 45000,
        'Soft AT Remark': 'Cleared',
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sites');
    XLSX.writeFile(workbook, 'ems_import_template.xlsx');
  };

  const downloadCurrentData = () => {
    let dataToExport: any[] = [];
    let fileName = '';

    if (importType === 'site') {
      dataToExport = sites;
      fileName = `sites_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    } else if (importType === 'vendor') {
      dataToExport = vendors;
      fileName = `vendors_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    } else if (importType === 'employee') {
      dataToExport = employees;
      fileName = `employees_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    }

    if (dataToExport.length === 0) {
      toast({
        title: 'No data to export',
        description: `No ${importType}s found`,
      });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, importType);
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Excel Import / Export</h2>
        <p className="text-muted-foreground">Upload or download data with all columns (supports 50+ columns).</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Data Type</CardTitle>
          <CardDescription>Choose what type of data you want to import</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={importType} onValueChange={(val) => setImportType(val as 'site' | 'vendor' | 'employee')}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="site">Sites Registration</SelectItem>
              <SelectItem value="vendor">Vendor Registration</SelectItem>
              <SelectItem value="employee">Employee Registration</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Template
            </CardTitle>
            <CardDescription>Get a sample template to fill in</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={downloadSampleTemplate} variant="outline" className="w-full">
              Download Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Current Data
            </CardTitle>
            <CardDescription>Download all registered {importType}s</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={downloadCurrentData} variant="outline" className="w-full">
              Export Data
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Excel File
          </CardTitle>
          <CardDescription>Upload your Excel file with any number of columns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
              id="excel-upload"
            />
            <label htmlFor="excel-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">Click to upload or drag and drop</span>
                <span className="text-xs text-muted-foreground">Excel files (.xlsx, .xls, .csv)</span>
              </div>
            </label>
          </div>

          {errors.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <span className="font-medium text-amber-900">Errors Found</span>
              </div>
              <ul className="space-y-1 text-sm text-amber-800 max-h-40 overflow-y-auto">
                {errors.map((error, idx) => (
                  <li key={idx}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {importedData.length > 0 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex gap-2 items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <span className="font-medium text-green-900">Ready to import</span>
                  <p className="text-sm text-green-800">{importedData.length} rows with {columns.length} columns</p>
                </div>
              </div>

              <div className="rounded-md border p-4 bg-slate-50 dark:bg-slate-900 max-h-60 overflow-x-auto overflow-y-auto">
                <div className="text-xs mb-2 font-mono text-muted-foreground">
                  <strong>Columns detected ({columns.length}):</strong>
                </div>
                <div className="flex flex-wrap gap-2">
                  {columns.map((col) => (
                    <span key={col} className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-xs font-mono">
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      {columns.slice(0, 8).map((col) => (
                        <TableHead key={col}>{col}</TableHead>
                      ))}
                      {columns.length > 8 && <TableHead>+{columns.length - 8} more</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importedData.slice(0, 5).map((row, idx) => (
                      <TableRow key={idx}>
                        {columns.slice(0, 8).map((col) => (
                          <TableCell key={col} className="truncate max-w-xs">
                            {String(row[col] || '-').substring(0, 20)}
                          </TableCell>
                        ))}
                        {columns.length > 8 && <TableCell>...</TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {importedData.length > 5 && (
                <p className="text-sm text-muted-foreground">
                  Showing 5 of {importedData.length} rows
                </p>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={() => {
                    setImportedData([]);
                    setColumns([]);
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button onClick={handleImport} size="lg" className="flex-1">
                  Import {importedData.length} Rows
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
