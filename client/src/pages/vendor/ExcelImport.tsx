import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Download, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchWithLoader } from '@/lib/fetchWithLoader';
import { SkeletonLoader } from '@/components/SkeletonLoader';

interface RawRowData {
  [key: string]: any;
}

export default function ExcelImport() {
  const { toast } = useToast();
  const [importedData, setImportedData] = useState<RawRowData[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [errorDetails, setErrorDetails] = useState<any[]>([]);
  const [importType, setImportType] = useState<'site' | 'vendor' | 'employee'>('site');
  const [loading, setLoading] = useState(false);

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

  // Helper function to add vendor
  const addVendor = async (vendorData: any) => {
    const response = await fetchWithLoader(`${getApiBaseUrl()}/api/vendors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vendorData),
    });
    if (!response.ok) {
      throw new Error(`Vendor import failed: ${response.status}`);
    }
    return response.json();
  };

  // Helper function to add employee
  const addEmployee = async (employeeData: any) => {
    const response = await fetchWithLoader(`${getApiBaseUrl()}/api/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employeeData),
    });
    if (!response.ok) {
      throw new Error(`Employee import failed: ${response.status}`);
    }
    return response.json();
  };

  const handleImport = async () => {
    if (importedData.length === 0) return;

    setLoading(true);
    const importErrors: string[] = [];
    const validData: any[] = [];

    console.log(`[ExcelImport] STEP 1: Validating ${importedData.length} records as ${importType}`);

    // Fetch all zones for matching Circle column
    let zonesMap: { [key: string]: string } = {};
    try {
      const zonesRes = await fetch(`${getApiBaseUrl()}/api/zones?pageSize=10000`);
      if (zonesRes.ok) {
        const zonesData = await zonesRes.json();
        zonesMap = (zonesData.data || []).reduce((acc: any, zone: any) => {
          acc[zone.shortName] = zone.id;
          return acc;
        }, {});
      }
    } catch (error) {
      console.error('Failed to fetch zones');
    }

    // STEP 1: VALIDATION PHASE - Check all data before uploading
    const errorDetailsArray: any[] = [];
    for (let idx = 0; idx < importedData.length; idx++) {
      const row = importedData[idx];
      try {
        if (importType === 'site') {
          // Helper functions to handle Excel values
          const toString = (val: any) => {
            if (val === null || val === undefined || val === '') return null;
            const str = String(val).trim();
            return str && str !== 'undefined' && str !== 'null' ? str : null;
          };

          // Convert Excel serial numbers to ISO date strings
          const excelDateToISO = (val: any) => {
            if (val === null || val === undefined || val === '') return null;
            
            // Check if it's an Excel serial number (numeric)
            const num = Number(val);
            if (!isNaN(num) && num > 0 && num < 100000) {
              try {
                // Excel stores dates as days since January 1, 1900
                const date = new Date((num - 1) * 86400000 + new Date(1900, 0, 1).getTime());
                return date.toISOString().split('T')[0];
              } catch (e) {
                return null;
              }
            }
            
            // Otherwise treat as string date
            const str = toString(val);
            return str ? str : null;
          };

          const toDate = excelDateToISO;

          // Map all 81 columns for site from Excel
          // Get vendor from Partner Name and Partner Code columns
          const partnerName = toString(row['PARTNER NAME']);
          const partnerCode = toString(row['PARTNER CODE']);
          
          if (!partnerName) {
            const error = `Row ${idx + 2}: Partner Name (vendor) is required`;
            importErrors.push(error);
            errorDetailsArray.push({ rowNum: idx + 2, planId: toString(row['PLAN ID']) || '-', error, siteId: toString(row['SITE ID']) || '-' });
            continue;
          }

          if (!partnerCode) {
            const error = `Row ${idx + 2}: Partner or ${partnerName} must have PARTNER CODE`;
            importErrors.push(error);
            errorDetailsArray.push({ rowNum: idx + 2, planId: toString(row['PLAN ID']) || '-', error, siteId: toString(row['SITE ID']) || '-', partner: partnerName });
            continue;
          }

          let vendorId: string;
          try {
            const response = await fetch(`${getApiBaseUrl()}/api/vendors/find-or-create`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ vendorCode: partnerCode, name: partnerName }),
            });
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: response.statusText }));
              const error = `Row ${idx + 2}: Vendor error - ${errorData.error || response.statusText}`;
              console.error(`[ExcelImport] Row ${idx + 2}: Vendor API error - Status: ${response.status}`, errorData);
              importErrors.push(error);
              errorDetailsArray.push({ rowNum: idx + 2, planId: toString(row['PLAN ID']) || '-', error, siteId: toString(row['SITE ID']) || '-', partner: partnerName });
              continue;
            }
            const vendor = await response.json();
            vendorId = vendor.id;
            console.log(`[ExcelImport] Row ${idx + 2}: Vendor created/found - ${partnerName} (code: ${partnerCode}, id: ${vendorId})`);
          } catch (err: any) {
            const error = `Row ${idx + 2}: Vendor error - ${err?.message || String(err)}`;
            console.error(`[ExcelImport] Row ${idx + 2}: Vendor error details:`, err?.message, err?.response, err);
            importErrors.push(error);
            errorDetailsArray.push({ rowNum: idx + 2, planId: toString(row['PLAN ID']) || '-', error, siteId: toString(row['SITE ID']) || '-', partner: partnerName });
            continue;
          }

          // Match Circle column with Zone name to get zoneId
          const circleValue = toString(row['Circle']);
          const zoneId = circleValue && zonesMap[circleValue] ? zonesMap[circleValue] : undefined;

          // Generate IDs with fallbacks - accept any ID from available columns
          const planIdValue = toString(row['PLAN ID']) || toString(row['planId']);
          const siteIdValue = toString(row['SITE ID']) || toString(row['siteId']) || toString(row['Nominal Aop']);
          // Use unique suffix combining index and random to ensure no duplicates
          const uniqueSuffix = `${idx}-${Math.random().toString(36).slice(-8)}`;
          const generatedSiteId = siteIdValue || `SITE-${uniqueSuffix}`;
          const generatedPlanId = planIdValue || `PLAN-${uniqueSuffix}`; // Use unique suffix as fallback for planId

          const siteData = {
            siteId: generatedSiteId,
            vendorId,
            zoneId,
            sno: Number(row['S.No.']) || undefined,
            circle: circleValue,
            planId: generatedPlanId,
            nominalAop: toString(row['Nominal Aop']),
            hopType: toString(row['HOP TYPE']),
            hopAB: toString(row['HOP A-B']),
            hopBA: toString(row['HOP B-A']),
            district: toString(row['District']),
            project: toString(row['PROJECT']),
            siteAAntDia: toString(row['SITE A ANT DIA']),
            siteBAntDia: toString(row['SITE B ANT DIA']),
            maxAntSize: toString(row['Max Ant Size']),
            siteAName: toString(row['SITE A NAME']),
            tocoVendorA: toString(row['TOCO VENDOR A']),
            tocoIdA: toString(row['TOCO ID A']),
            siteBName: toString(row['SITE B NAME']),
            tocoVendorB: toString(row['TOCO VENDOR B']),
            tocoIdB: toString(row['TOCO ID B']),
            mediaAvailabilityStatus: toString(row['MEDIA AVAILABILITY STATUS']),
            srNoSiteA: toString(row['SR NO SITE A']),
            srDateSiteA: toDate(row['SR DATE SITE A']),
            srNoSiteB: toString(row['SR NO SITE B']),
            srDateSiteB: toDate(row['SR DATE SITE B']),
            hopSrDate: toDate(row['HOP SR DATE']),
            spDateSiteA: toDate(row['SP DATE SITE A']),
            spDateSiteB: toDate(row['SP DATE SITE B']),
            hopSpDate: toDate(row['HOP SP DATE']),
            soReleasedDateSiteA: toDate(row['SO RELEASED DATE SITE A']),
            soReleasedDateSiteB: toDate(row['SO RELEASED DATE SITE B']),
            hopSoDate: toDate(row['HOP SO DATE']),
            rfaiOfferedDateSiteA: toDate(row['RFAI OFFERED DATE SITE A']),
            rfaiOfferedDateSiteB: toDate(row['RFAI OFFERED DATE SITE B']),
            actualHopRfaiOfferedDate: toDate(row['ACTUAL HOP RFAI OFFERED DATE']),
            partnerName: partnerName,
            rfaiSurveyCompletionDate: toDate(row['RFAI SURVEY COMPLETION DATE']),
            moNumberSiteA: toString(row['MO NUMBER SITE A']),
            materialTypeSiteA: toString(row['MATERIAL TYPE SITE A(SRN, FRESH, FRESH+SRN)']),
            moDateSiteA: toDate(row['MO DATE SITE A']),
            moNumberSiteB: toString(row['MO NUMBER SITE B']),
            materialTypeSiteB: toString(row['MATERIAL TYPE SITE B(SRN, FRESH, FRESH+SRN)']),
            moDateSiteB: toDate(row['MO DATE SITE B']),
            srnRmoNumber: toString(row['SRN/RMO NUMBER']),
            srnRmoDate: toDate(row['SRN/RMO DATE']),
            hopMoDate: toDate(row['HOP MO DATE']),
            hopMaterialDispatchDate: toDate(row['HOP MATERIAL DISPATCH DATE']),
            hopMaterialDeliveryDate: toDate(row['HOP MATERIAL DELIVERY DATE']),
            materialDeliveryStatus: toString(row['MATERIAL DELIVERY STATUS']),
            siteAInstallationDate: toDate(row['SITE A INSTALLATION DATE']),
            ptwNumberSiteA: toString(row['PTW Number(Site A)']),
            ptwStatusA: toString(row['PTW Status A']),
            siteBInstallationDate: toDate(row['SITE B INSTALLATION DATE']),
            ptwNumberSiteB: toString(row['PTW Number(Site B)']),
            ptwStatusB: toString(row['PTW Status B']),
            hopIcDate: toDate(row['HOP I&C DATE']),
            alignmentDate: toDate(row['Alignment Date']),
            hopInstallationRemarks: toString(row['HOP Installation Remarks']),
            visibleInNms: toString(row['VISIBLE IN NMS']),
            nmsVisibleDate: toDate(row['NMS VISIBLE DATE']),
            softAtOfferDate: toDate(row['SOFT AT OFFER DATE']),
            softAtAcceptanceDate: toDate(row['SOFT AT ACCEPTANCE DATE']),
            softAtStatus: toString(row['SOFT-AT STATUS']),
            phyAtOfferDate: toDate(row['PHY-AT OFFER DATE']),
            phyAtAcceptanceDate: toDate(row['PHY-AT ACCEPTANCE DATE']),
            phyAtStatus: toString(row['PHY-AT STATUS']),
            bothAtStatus: toString(row['BOTH AT STATUS']),
            priIssueCategory: toString(row['PRI ISSUE CATEGORY']),
            priSiteId: toString(row['PRI SITE ID']),
            priOpenDate: toDate(row['PRI OPEN DATE']),
            priCloseDate: toDate(row['PRI CLOSE DATE']),
            priHistory: toString(row['PRI HISTORY']),
            rfiSurveyAllocationDate: toDate(row['RFI Survey Allocation Date']),
            descope: toString(row['Descope']),
            reasonOfExtraVisit: toString(row['Reason of Extra Visit']),
            wccReceived80Percent: toString(row['WCC Received 80%']),
            wccReceivedDate80Percent: toDate(row['WCC Received Date 80%']),
            wccReceived20Percent: toString(row['WCC Received 20%']),
            wccReceivedDate20Percent: toDate(row['WCC Received Date 20%']),
            wccReceivedDate100Percent: toDate(row['WCC Received Date 100%']),
            survey: toString(row['Survey']),
            finalPartnerSurvey: toString(row['Final Partner Survey']),
            surveyDate: toDate(row['Survey Date']),
            status: 'Pending' as const,
          };

          console.log(`[ExcelImport] Row ${idx + 2}: Validation passed - siteId: "${siteData.siteId}", planId: "${siteData.planId}", vendor: "${siteData.partnerName}"`);
          validData.push({ type: 'site', data: siteData, rowNum: idx + 2 });
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
            console.log(`[ExcelImport] Row ${idx + 2}: Vendor validation passed - ${vendorData.name}`);
            validData.push({ type: 'vendor', data: vendorData, rowNum: idx + 2 });
          } else {
            console.warn(`[ExcelImport] Row ${idx + 2}: Missing vendor required fields`);
            importErrors.push(`Row ${idx + 2}: Missing required vendor fields (name, aadhar, pan)`);
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
            console.log(`[ExcelImport] Row ${idx + 2}: Employee validation passed - ${employeeData.name}`);
            validData.push({ type: 'employee', data: employeeData, rowNum: idx + 2 });
          } else {
            console.warn(`[ExcelImport] Row ${idx + 2}: Missing employee required fields`);
            importErrors.push(`Row ${idx + 2}: Missing required employee fields (name, aadhar, pan)`);
          }
        }
      } catch (err: any) {
        console.error(`[ExcelImport] Row ${idx + 2}: Unexpected error -`, err);
        importErrors.push(`Row ${idx + 2}: ${err.message || 'Error processing data'}`);
      }
    }

    console.log(`[ExcelImport] Validation complete: ${validData.length} valid records, ${importErrors.length} validation errors`);

    // If there are any validation errors, stop here and show errors
    if (importErrors.length > 0) {
      console.error('[ExcelImport] Validation errors found:', importErrors);
      toast({
        title: 'Validation Failed',
        description: `${importErrors.length} validation errors found. Please fix these before uploading.`,
        variant: 'destructive',
      });
      setErrors(importErrors);
      setErrorDetails(errorDetailsArray);
      setLoading(false);
      return;
    }

    // STEP 2: UPLOAD PHASE - If all validation passes, upload all data at once
    console.log(`[ExcelImport] STEP 2: Uploading ${validData.length} validated records`);
    let imported = 0;
    const uploadErrors: string[] = [];

    // Upload all data in parallel
    const uploadPromises = validData.map(async (item) => {
      try {
        if (item.type === 'site') {
          const response = await fetch(`${getApiBaseUrl()}/api/sites/upsert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data),
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`${response.status} - ${errorText}`);
          }
          console.log(`[ExcelImport] Row ${item.rowNum}: Site uploaded successfully`);
          return { success: true };
        } else if (item.type === 'vendor') {
          const response = await fetch(`${getApiBaseUrl()}/api/vendors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data),
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`${response.status} - ${errorText}`);
          }
          console.log(`[ExcelImport] Row ${item.rowNum}: Vendor uploaded successfully`);
          return { success: true };
        } else if (item.type === 'employee') {
          const response = await fetch(`${getApiBaseUrl()}/api/employees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data),
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`${response.status} - ${errorText}`);
          }
          console.log(`[ExcelImport] Row ${item.rowNum}: Employee uploaded successfully`);
          return { success: true };
        }
      } catch (err: any) {
        console.error(`[ExcelImport] Row ${item.rowNum}: Upload failed -`, err.message);
        uploadErrors.push(`Row ${item.rowNum}: ${err.message}`);
        return { success: false };
      }
    });

    const results = await Promise.all(uploadPromises);
    imported = results.filter(r => r.success).length;

    console.log(`[ExcelImport] Upload complete: ${imported} uploaded, ${uploadErrors.length} upload errors`);

    if (uploadErrors.length > 0) {
      console.error('[ExcelImport] Upload errors:', uploadErrors);
      // Collect upload error details
      const uploadErrorDetails = validData.map((item, idx) => {
        if (!results[idx].success) {
          return {
            rowNum: item.rowNum,
            planId: item.data.planId || item.data.name || '-',
            siteId: item.data.siteId || '-',
            error: uploadErrors.find(e => e.includes(`Row ${item.rowNum}`)) || `Upload failed`
          };
        }
      }).filter(Boolean);
      setErrorDetails(uploadErrorDetails);
    }

    toast({
      title: 'Import Complete',
      description: `${imported} records uploaded successfully. ${uploadErrors.length} errors found.`,
      variant: uploadErrors.length > 0 ? 'destructive' : 'default',
    });

    setImportedData([]);
    setColumns([]);
    setErrors(uploadErrors);
    setLoading(false);
  };

  const downloadErrorsReport = () => {
    if (errorDetails.length === 0) return;

    const errorData = errorDetails.map(err => ({
      'Row Number': err.rowNum,
      'Plan ID': err.planId,
      'Site ID': err.siteId || '-',
      'Partner Name': err.partner || '-',
      'Error Message': err.error,
      'Timestamp': new Date().toISOString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(errorData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Errors');
    XLSX.writeFile(workbook, `import_errors_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: 'Success',
      description: `Downloaded ${errorDetails.length} error records`,
    });
  };

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        'S.No.': 1,
        'Circle': 'UPE',
        'PLAN ID': '1234756712457324',
        'Nominal Aop': 'AOP 24-25',
        'HOP TYPE': 'E-BAND',
        'HOP A-B': 'ALB368-ACNT04',
        'HOP B-A': 'ACNT04-ALB368',
        'District': 'Prayagraj',
        'PROJECT': 'Ceragon-Bharti',
        'SITE A ANT DIA': '0.9',
        'SITE B ANT DIA': '0.9',
        'Max Ant Size': '0.9',
        'SITE A NAME': 'Patrakarcolony',
        'TOCO VENDOR A': 'Indus',
        'TOCO ID A': 'IN-1360937',
        'SITE B NAME': 'Patrakarcolony',
        'TOCO VENDOR B': 'TVI',
        'TOCO ID B': 'ATUPALH1165',
        'MEDIA AVAILABILITY STATUS': 'Available',
        'SR NO SITE A': 'SR-001',
        'SR DATE SITE A': '2024-01-15',
        'SR NO SITE B': 'SR-002',
        'SR DATE SITE B': '2024-01-15',
        'HOP SR DATE': '2024-01-16',
        'SP DATE SITE A': '2024-01-20',
        'SP DATE SITE B': '2024-01-20',
        'HOP SP DATE': '2024-01-21',
        'SO RELEASED DATE SITE A': '2024-01-25',
        'SO RELEASED DATE SITE B': '2024-01-25',
        'HOP SO DATE': '2024-01-26',
        'RFAI OFFERED DATE SITE A': '2024-02-01',
        'RFAI OFFERED DATE SITE B': '2024-02-01',
        'ACTUAL HOP RFAI OFFERED DATE': '2024-02-02',
        'PARTNER NAME': 'Jiya',
        'RFAI SURVEY COMPLETION DATE': '2024-02-05',
        'MO NUMBER SITE A': 'MO-001',
        'MATERIAL TYPE SITE A(SRN, FRESH, FRESH+SRN)': 'FRESH',
        'MO DATE SITE A': '2024-02-08',
        'MO NUMBER SITE B': 'MO-002',
        'MATERIAL TYPE SITE B(SRN, FRESH, FRESH+SRN)': 'FRESH',
        'MO DATE SITE B': '2024-02-08',
        'SRN/RMO NUMBER': 'RMO-001',
        'SRN/RMO DATE': '2024-02-10',
        'HOP MO DATE': '2024-02-12',
        'HOP MATERIAL DISPATCH DATE': '2024-02-15',
        'HOP MATERIAL DELIVERY DATE': '2024-02-18',
        'MATERIAL DELIVERY STATUS': 'Received',
        'SITE A INSTALLATION DATE': '2024-02-20',
        'PTW Number(Site A)': 'PTW-001',
        'PTW Status A': 'Approved',
        'SITE B INSTALLATION DATE': '2024-02-20',
        'PTW Number(Site B)': 'PTW-002',
        'PTW Status B': 'Approved',
        'HOP I&C DATE': '2024-02-22',
        'Alignment Date': '2024-02-23',
        'HOP Installation Remarks': 'Site done',
        'VISIBLE IN NMS': 'Yes',
        'NMS VISIBLE DATE': '2024-02-25',
        'SOFT AT OFFER DATE': '2024-03-01',
        'SOFT AT ACCEPTANCE DATE': '2024-03-02',
        'SOFT-AT STATUS': 'Accepted',
        'PHY-AT OFFER DATE': '2024-03-01',
        'PHY-AT ACCEPTANCE DATE': '2024-03-02',
        'PHY-AT STATUS': 'Accepted',
        'BOTH AT STATUS': 'Yes',
        'PRI ISSUE CATEGORY': 'Normal',
        'PRI SITE ID': 'PRI-001',
        'PRI OPEN DATE': '2024-03-05',
        'PRI CLOSE DATE': '2024-03-10',
        'PRI HISTORY': 'Issue resolved',
        'RFI Survey Allocation Date': '2024-02-05',
        'Descope': 'No',
        'Reason of Extra Visit': 'N/A',
        'WCC Received 80%': 'Done',
        'WCC Received Date 80%': '2024-03-15',
        'WCC Received 20%': 'Done',
        'WCC Received Date 20%': '2024-03-20',
        'WCC Received Date 100%': '2024-03-25',
        'Survey': 'Completed',
        'Final Partner Survey': 'JIYA',
        'Survey Date': '2024-03-28',
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sites');
    XLSX.writeFile(workbook, 'site_import_template.xlsx');
  };

  const deleteAllData = async () => {
    if (!confirm('Are you sure you want to delete ALL imported site data? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetchWithLoader(`${getApiBaseUrl()}/api/sites`, {
        method: 'DELETE',
      });

      if (response.ok) {
        clearSites();
        toast({
          title: 'Success',
          description: 'All site data has been deleted.',
        });
      } else {
        throw new Error('Failed to delete data');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete site data',
      });
    }
  };

  const downloadCurrentData = async () => {
    try {
      let dataToExport: any[] = [];
      let fileName = '';
      let endpoint = '';

      if (importType === 'site') {
        endpoint = `${getApiBaseUrl()}/api/sites?pageSize=10000`;
        fileName = `sites_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      } else if (importType === 'vendor') {
        endpoint = `${getApiBaseUrl()}/api/vendors?pageSize=10000`;
        fileName = `vendors_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      } else if (importType === 'employee') {
        endpoint = `${getApiBaseUrl()}/api/employees?pageSize=10000`;
        fileName = `employees_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      }

      // Fetch data from database
      const result = await fetchJsonWithLoader<any>(endpoint);
      dataToExport = result.data || [];

      if (dataToExport.length === 0) {
        toast({
          title: 'No data to export',
          description: `No ${importType}s found in the database`,
        });
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, importType);
      XLSX.writeFile(workbook, fileName);

      toast({
        title: 'Export successful',
        description: `Exported ${dataToExport.length} ${importType}s`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export data',
      });
    }
  };

  if (loading) {
    return <SkeletonLoader type="dashboard" />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Excel Import / Export</h2>
        <p className="text-muted-foreground">Upload or download data with all columns (supports 50+ columns).</p>
      </div>

      {importType !== 'site' && (
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
      )}

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

        {importType !== 'site' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                Delete All Data
              </CardTitle>
              <CardDescription>Permanently remove all imported site data</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={deleteAllData} variant="destructive" className="w-full" data-testid="button-delete-all-data">
                Delete All Sites
              </Button>
            </CardContent>
          </Card>
        )}
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
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="flex gap-2 mb-2 items-center justify-between">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <span className="font-medium text-amber-900">{errors.length} Errors Found</span>
                </div>
                {errorDetails.length > 0 && (
                  <Button
                    onClick={downloadErrorsReport}
                    size="sm"
                    variant="outline"
                    className="gap-2 text-amber-700 border-amber-300 hover:bg-amber-100"
                    data-testid="button-download-errors"
                  >
                    <Download className="h-4 w-4" />
                    Download Errors
                  </Button>
                )}
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
