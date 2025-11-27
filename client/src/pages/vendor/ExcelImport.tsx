import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useStore } from '@/lib/mockData';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Upload, Download, CheckCircle, AlertCircle } from 'lucide-react';

interface ImportedSiteData {
  siteId: string;
  vendorId?: string;
  planId: string;
  antennaSize: string;
  incDate: string;
  state: string;
  region: string;
  zone: string;
  inside: boolean | string;
  formNo: string;
  siteAmount: string | number;
  vendorAmount: string | number;
  softAtRemark?: string;
}

export default function ExcelImport() {
  const { addSite, sites, vendors } = useStore();
  const { toast } = useToast();
  const [importedData, setImportedData] = useState<ImportedSiteData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as ImportedSiteData[];

        const validatedData: ImportedSiteData[] = [];
        const newErrors: string[] = [];

        jsonData.forEach((row, index) => {
          const rowNum = index + 2; // Excel row number (1-indexed, +1 for header)

          if (!row.siteId) {
            newErrors.push(`Row ${rowNum}: Site ID is required`);
            return;
          }
          if (!row.planId) {
            newErrors.push(`Row ${rowNum}: Plan ID is required`);
            return;
          }
          if (!row.formNo) {
            newErrors.push(`Row ${rowNum}: Form No is required`);
            return;
          }

          validatedData.push({
            ...row,
            inside: row.inside === 'YES' || row.inside === 'yes' || row.inside === true ? true : false,
            siteAmount: Number(row.siteAmount) || 0,
            vendorAmount: Number(row.vendorAmount) || 0,
          });
        });

        if (newErrors.length > 0) {
          setErrors(newErrors);
        }

        setImportedData(validatedData);
        setIsProcessing(false);

        if (validatedData.length > 0) {
          toast({
            title: `Loaded ${validatedData.length} sites`,
            description: newErrors.length > 0 ? `${newErrors.length} rows have errors` : 'Ready to import',
          });
        }
      } catch (error) {
        toast({
          title: 'Error reading file',
          description: 'Please ensure the file is a valid Excel file',
        });
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleImport = () => {
    if (importedData.length === 0) return;

    let imported = 0;
    importedData.forEach((row) => {
      // Find vendor ID if not provided
      let vendorId = row.vendorId;
      if (!vendorId && vendors.length > 0) {
        vendorId = vendors[0].id; // Default to first vendor
      }

      if (vendorId) {
        addSite({
          siteId: row.siteId,
          planId: row.planId,
          antennaSize: row.antennaSize,
          incDate: row.incDate,
          state: row.state,
          region: row.region,
          zone: row.zone,
          inside: typeof row.inside === 'string' ? row.inside === 'YES' || row.inside === 'yes' : row.inside,
          formNo: row.formNo,
          siteAmount: Number(row.siteAmount),
          vendorAmount: Number(row.vendorAmount),
          vendorId,
          status: 'Pending',
          phyAtRemark: 'Pending',
          atpRemark: 'Pending',
          softAtRemark: row.softAtRemark || 'Pending',
        });
        imported++;
      }
    });

    toast({
      title: 'Import Successful',
      description: `${imported} sites have been imported successfully`,
    });

    setImportedData([]);
    setErrors([]);
  };

  const downloadTemplate = () => {
    const template = [
      {
        siteId: 'DL-1001',
        vendorId: vendors[0]?.id || '1',
        planId: 'P-500',
        antennaSize: '2.4m',
        incDate: '2024-01-20',
        state: 'Delhi',
        region: 'North',
        zone: 'Zone-1',
        inside: 'YES',
        formNo: 'F-101',
        siteAmount: 50000,
        vendorAmount: 45000,
        softAtRemark: 'Pending'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sites');
    XLSX.writeFile(workbook, 'site_registration_template.xlsx');
  };

  const downloadCurrentData = () => {
    const worksheet = XLSX.utils.json_to_sheet(sites);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sites');
    XLSX.writeFile(workbook, `sites_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Excel Site Import</h2>
        <p className="text-muted-foreground">Import or export site data using Excel files.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Template
            </CardTitle>
            <CardDescription>Get a template to fill in your site data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={downloadTemplate} variant="outline" className="w-full">
              Download Excel Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Current Data
            </CardTitle>
            <CardDescription>Export all registered sites to Excel</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={downloadCurrentData} variant="outline" className="w-full" disabled={sites.length === 0}>
              Export {sites.length} Sites
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Sites from Excel
          </CardTitle>
          <CardDescription>Upload your filled Excel file to import multiple sites at once</CardDescription>
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
                <span className="font-medium text-amber-900">Import Errors</span>
              </div>
              <ul className="space-y-1 text-sm text-amber-800">
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
                  <p className="text-sm text-green-800">{importedData.length} sites will be added</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Site ID</TableHead>
                      <TableHead>Plan ID</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Antenna</TableHead>
                      <TableHead>Site Amount</TableHead>
                      <TableHead>Vendor Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importedData.slice(0, 10).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{row.siteId}</TableCell>
                        <TableCell>{row.planId}</TableCell>
                        <TableCell>{row.state}</TableCell>
                        <TableCell>{row.antennaSize}</TableCell>
                        <TableCell>₹{Number(row.siteAmount).toLocaleString()}</TableCell>
                        <TableCell>₹{Number(row.vendorAmount).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {importedData.length > 10 && (
                <p className="text-sm text-muted-foreground">
                  Showing 10 of {importedData.length} sites
                </p>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={() => {
                    setImportedData([]);
                    setErrors([]);
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button onClick={handleImport} size="lg" className="flex-1">
                  Import {importedData.length} Sites
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
