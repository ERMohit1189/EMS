import { getApiBaseUrl } from "@/lib/api";
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Download, CheckCircle, AlertCircle, Trash2, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchJsonWithLoader, fetchWithLoader, authenticatedFetch, authenticatedFetchJson } from '@/lib/fetchWithLoader';
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
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, stage: '' });
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState<{ minutes: number; seconds: number; totalSeconds: number }>({ minutes: 0, seconds: 0, totalSeconds: 0 });
  const [elapsedTime, setElapsedTime] = useState(0); // Track elapsed seconds
  const [sitesWithExistingPOs, setSitesWithExistingPOs] = useState<any[]>([]); // Sites that already have POs

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

  const calculateEstimatedTime = () => {
    // Fast estimate based on high-throughput runs (76s per 1000 rows)
    // Use a faster estimate derived from the 500-row measurement.
    const SECONDS_PER_THOUSAND = 76; // fast measured value (s per 1000 rows)
    const BASELINE_SECONDS = 5;

    const totalSeconds = Math.ceil((importedData.length * SECONDS_PER_THOUSAND) / 1000 + BASELINE_SECONDS);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    console.log(`[TimeEstimate] Fast estimate: ${totalSeconds}s for ${importedData.length} rows (${minutes}m ${seconds}s) using ${SECONDS_PER_THOUSAND}s/1000 rows`);
    return { minutes, seconds, totalSeconds };
  };

  // Timer effect - updates elapsed time while importing
  useEffect(() => {
    if (!importing) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [importing]);

  // Format seconds to MM:SS format
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const showImportConfirmation = () => {
    if (importedData.length === 0) return;

    const timeEst = calculateEstimatedTime();
    setEstimatedTime(timeEst);
    setShowConfirmDialog(true);
  };

  const proceedWithImport = async () => {
    setShowConfirmDialog(false);
    await handleImport();
  };

  const handleImport = async () => {
    if (importedData.length === 0) return;

    setImporting(true);
    setLoading(true);
    setImportProgress({ current: 0, total: 100, stage: 'STEP 1/4: Validating Partner Code column...' });
    const importErrors: string[] = [];
    const errorDetailsArray: any[] = [];
    const validData: any[] = []; // Store validated site data

    // Define helper functions OUTSIDE the loop for better performance
    const toString = (val: any) => {
      if (val === null || val === undefined || val === '') return null;
      const str = String(val).trim();
      return str && str !== 'undefined' && str !== 'null' ? str : null;
    };

    console.log(`[ExcelImport] FAST IMPORT PROCESS: ${importedData.length} records`);

    // ===== STEP 1: VALIDATE PARTNER CODE COLUMN =====
    console.log(`[ExcelImport] STEP 1: Validating Partner Code column...`);

    // Check if Partner Code column exists
    if (!columns.includes('PARTNER CODE')) {
      const error = 'Missing required column: PARTNER CODE';
      console.error(`[ExcelImport] ${error}`);
      toast({
        title: 'Validation Failed',
        description: error,
        variant: 'destructive',
      });
      setLoading(false);
      setImporting(false);
      setErrors([error]);
      setImportProgress({ current: 0, total: 0, stage: '' });
      return;
    }

    // Check for blank Partner Code values using filter (single pass)
    const blankPartnerCodeRows: any[] = importedData
      .map((row, idx) => {
        const partnerCode = String(row['PARTNER CODE'] || '').trim();
        return {
          row,
          idx,
          partnerCode
        };
      })
      .filter(({ partnerCode }) => !partnerCode)
      .map(({ row, idx }) => ({
        rowNum: idx + 2,
        planId: toString(row['PLAN ID']) || '-',
        partnerName: toString(row['PARTNER NAME']) || '-',
        error: 'PARTNER CODE is required and cannot be blank'
      }));

    // If there are blank Partner Codes, stop and show errors
    if (blankPartnerCodeRows.length > 0) {
      console.error(`[ExcelImport] Found ${blankPartnerCodeRows.length} rows with blank PARTNER CODE`);
      const errors = blankPartnerCodeRows.map(e => `Row ${e.rowNum}: ${e.error} (Plan: ${e.planId})`);

      toast({
        title: 'Validation Failed',
        description: `${blankPartnerCodeRows.length} rows have blank PARTNER CODE. Please fix and try again.`,
        variant: 'destructive',
      });
      setErrors(errors);
      setErrorDetails(blankPartnerCodeRows);
      setLoading(false);
      setImporting(false);
      setImportProgress({ current: 0, total: 0, stage: '' });
      return;
    }

    console.log(`[ExcelImport] ✅ Partner Code validation passed`);
    setImportProgress({ current: 25, total: 100, stage: 'STEP 2/4: Checking vendors in database...' });

    // Fetch all zones for matching Circle column
    let zonesMap: { [key: string]: string } = {};
    try {
      const zonesRes = await authenticatedFetch(`${getApiBaseUrl()}/api/zones?pageSize=500`);
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

    // Pre-calculate Excel epoch date once (not for each row)
    const excelEpoch = new Date(1900, 0, 1).getTime();

    // Optimized date conversion with pre-calculated epoch
    const excelDateToISO = (val: any) => {
      if (val === null || val === undefined || val === '') return null;
      const num = Number(val);

      // Check if it's an Excel serial number (numeric)
      if (!isNaN(num) && num > 0 && num < 100000) {
        const date = new Date((num - 1) * 86400000 + excelEpoch);
        return date.toISOString().split('T')[0];
      }

      // Otherwise treat as string date
      const str = toString(val);
      if (!str) return null;

      // Try parsing DD-MMM-YYYY format (e.g., "15-Mar-2025")
      const ddMmmYyyyMatch = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
      if (ddMmmYyyyMatch) {
        const day = ddMmmYyyyMatch[1].padStart(2, '0');
        const monthStr = ddMmmYyyyMatch[2].toLowerCase();
        const year = ddMmmYyyyMatch[3];
        const months: { [key: string]: string } = {
          'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
          'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
          'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
        };
        const month = months[monthStr];
        if (month) {
          return `${year}-${month}-${day}`;
        }
      }

      // Try parsing YYYY-MM-DD format (already ISO)
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
      }

      // Try parsing DD/MM/YYYY format
      const ddSlashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (ddSlashMatch) {
        const day = ddSlashMatch[1].padStart(2, '0');
        const month = ddSlashMatch[2].padStart(2, '0');
        const year = ddSlashMatch[3];
        return `${year}-${month}-${day}`;
      }

      // Try parsing MM/DD/YYYY format
      const mmSlashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (mmSlashMatch) {
        const month = mmSlashMatch[1].padStart(2, '0');
        const day = mmSlashMatch[2].padStart(2, '0');
        const year = mmSlashMatch[3];
        // Ambiguous - assume DD/MM if day > 12, otherwise try to parse with Date constructor
        if (parseInt(mmSlashMatch[1]) > 12) {
          return `${year}-${mmSlashMatch[2].padStart(2, '0')}-${mmSlashMatch[1].padStart(2, '0')}`;
        }
        return `${year}-${month}-${day}`;
      }

      // Try JavaScript Date parsing as last resort
      try {
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0];
        }
      } catch (e) {
        // Fall through
      }

      return null;
    };

    const toDate = excelDateToISO;

    // Normalize Soft/Phy AT status values: map null/empty/unknown values to 'Pending'
    const normalizeAtStatus = (val: any) => {
      const s = toString(val);
      if (!s) return 'Pending';
      const lower = s.toLowerCase();
      const mapping: { [key: string]: string } = {
        'pending': 'Pending',
        'approved': 'Approved',
        'raised': 'Raised',
        'rejected': 'Rejected'
      };
      return mapping[lower] || 'Pending';
    };

    for (let idx = 0; idx < importedData.length; idx++) {
      const row = importedData[idx];

      // Update progress less frequently for speed (every 50 rows, not 10)
      if (idx % 50 === 0) {
        setImportProgress({ current: idx + 1, total: importedData.length, stage: `Validating row ${idx + 1} of ${importedData.length}...` });
      }

      try {
        if (importType === 'site') {

          // Map all 81 columns for site from Excel
          // Get vendor from Partner Name and Partner Code columns
          const partnerName = toString(row['PARTNER NAME']);
          const partnerCode = toString(row['PARTNER CODE']);

          // FAST VALIDATION: Only check required fields, skip vendor API calls
          // Partner name is optional; PARTNER CODE is required to identify vendor
          if (!partnerCode) {
            const error = `Row ${idx + 2}: PARTNER CODE is required`;
            importErrors.push(error);
            errorDetailsArray.push({ rowNum: idx + 2, planId: toString(row['PLAN ID']) || '-', error, siteId: toString(row['SITE ID']) || '-', partner: partnerName });
            continue;
          }

          // Store partner code as vendorId placeholder (will be resolved during upload)
          const vendorId = partnerCode;

          // Match Circle column with Zone name to get zoneId
          const circleValue = toString(row['Circle']);
          const zoneId = circleValue && zonesMap[circleValue] ? zonesMap[circleValue] : undefined;

          // Generate IDs with fallbacks - accept any ID from available columns
          const planIdValue = toString(row['PLAN ID']) || toString(row['planId']);
          const siteIdValue = toString(row['SITE ID']) || toString(row['siteId']) || toString(row['Nominal Aop']);
          // Use just index for unique suffix (faster than random)
          const generatedSiteId = siteIdValue || `SITE-${idx}`;
          const generatedPlanId = planIdValue || `PLAN-${idx}`;

          // Normalize attestation statuses
          const normalizedSoftAtStatus = normalizeAtStatus(row['SOFT-AT STATUS']);
          const normalizedPhyAtStatus = normalizeAtStatus(row['PHY-AT STATUS']);

          // Auto-approve status if both soft and phy statuses are approved
          const autoStatus = (normalizedSoftAtStatus === 'Approved' && normalizedPhyAtStatus === 'Approved') ? 'Approved' : 'Pending';

          // Build site data object with optimized field access
          const siteData: any = {
            siteId: generatedSiteId,
            vendorId,
            partnerCode,
            zoneId,
            sno: Number(row['S.No.']) || undefined,
            circle: circleValue,
            planId: generatedPlanId,
            partnerName: partnerName,
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
            softAtStatus: normalizedSoftAtStatus,
            phyAtOfferDate: toDate(row['PHY-AT OFFER DATE']),
            phyAtAcceptanceDate: toDate(row['PHY-AT ACCEPTANCE DATE']),
            phyAtStatus: normalizedPhyAtStatus,
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
            status: autoStatus,
          };

          // Only log every 100 rows to reduce console overhead
          if (idx % 100 === 0) {
            console.log(`[ExcelImport] Row ${idx + 2}: Validation passed - siteId: "${siteData.siteId}", planId: "${siteData.planId}"`);
          }
          validData.push({ type: 'site', data: siteData, rowNum: idx + 2 });
        } else if (importType === 'vendor') {
          // FAST VALIDATION for vendor: Quick field check
          const name = toString(row['PARTNER NAME']) || toString(row['PARTNER CODE']) || '';
          const aadhar = row['aadhar'] || row['Aadhar'] || '';
          const pan = row['pan'] || row['PAN'] || '';

          if (name && aadhar && pan) {
            // Valid vendor - store for later processing
            const vendorData = {
              name: name,
              email: row['email'] || row['Email'] || `vendor${idx}@example.com`,
              mobile: row['mobile'] || row['Mobile No'] || row['Mobile'] || '',
              address: row['address'] || row['Address'] || '',
              city: row['city'] || row['City'] || '',
              state: row['state'] || row['State'] || '',
              pincode: row['pincode'] || row['Pincode'] || '',
              country: row['country'] || row['Country'] || 'India',
              aadhar: aadhar,
              pan: pan,
              gstin: row['gstin'] || row['GSTIN'] || '',
              category: (row['category'] || row['Category'] || 'Individual') as 'Individual' | 'Company',
              status: 'Pending' as const,
              moa: row['moa'] || row['MOA'] || '',
            };
            validData.push({ type: 'vendor', data: vendorData, rowNum: idx + 2 });
          } else {
            importErrors.push(`Row ${idx + 2}: Missing required vendor fields (name, aadhar, pan)`);
          }
        } else if (importType === 'employee') {
          // FAST VALIDATION for employee: Quick field check
          const name = row['name'] || row['Name'] || '';
          const aadhar = row['aadhar'] || row['Aadhar'] || '';
          const pan = row['pan'] || row['PAN'] || '';

          if (name && aadhar && pan) {
            // Valid employee - store for later processing
            const employeeData = {
              name: name,
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
              aadhar: aadhar,
              pan: pan,
              bloodGroup: row['bloodGroup'] || row['Blood Group'] || 'O+',
              maritalStatus: (row['maritalStatus'] || row['Marital Status'] || 'Single') as 'Single' | 'Married',
              nominee: row['nominee'] || row['Nominee'] || '',
              ppeKit: (row['ppeKit'] === 'YES' || row['ppeKit'] === true) as boolean,
              kitNo: row['kitNo'] || row['Kit No'] || '',
            };
            validData.push({ type: 'employee', data: employeeData, rowNum: idx + 2 });
          } else {
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
      setImporting(false);
      setImportProgress({ current: 0, total: 0, stage: '' });
      return;
    }

    console.log(`[ExcelImport] ✅ Validation complete. Moving to Step 2...`);

    // STEP 2: HANDLE VENDORS - Explicit 4-step process
    console.log(`[ExcelImport] STEP 2/4: Handling vendors...`);

    const siteItems = validData.filter(v => v.type === 'site');
    const errorDetailsArray2: any[] = [];
    const siteDataMap = new Map(); // Map to store full site data for error reporting
    let uploadedCount = 0;

    // Store full site data for each siteId for error reporting
    for (const item of siteItems) {
      siteDataMap.set(item.data.siteId, item.data);
    }

    // STEP 2.1: Collect all vendor codes in JSON
    setImportProgress({ current: 50, total: 100, stage: 'STEP 2a/4: Collecting vendor codes...' });

    // Build a code->name map using partnerName from the site rows when available
    const vendorCodeToName = new Map<string, string>();
    for (const item of siteItems) {
      const vendorCode = String(item.data.vendorId).trim();
      if (!vendorCode) continue;
      if (!vendorCodeToName.has(vendorCode)) {
        const pn = (item.data.partnerName || '').trim();
        vendorCodeToName.set(vendorCode, pn || vendorCode);
      }
    }

    const vendorCodesJson = Array.from(vendorCodeToName.entries()).map(([code, name]) => ({ code, name }));

    console.log(`[ExcelImport] ✅ Collected ${vendorCodeToName.size} unique vendor codes`);

    // STEP 2.2: Send to database and get missing vendors
    setImportProgress({ current: 55, total: 100, stage: 'STEP 2b/4: Checking which vendors are missing...' });

    let missingVendors: any[] = [];
    try {
      const checkMissingResponse = await authenticatedFetch(`${getApiBaseUrl()}/api/vendors/check-missing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendors: vendorCodesJson }),
      });

      if (checkMissingResponse.ok) {
        const missingResult = await checkMissingResponse.json();
        missingVendors = missingResult.missing || [];
        console.log(`[ExcelImport] Found ${missingVendors.length} vendors NOT in database`);
      } else {
        console.warn(`[ExcelImport] Check-missing endpoint not available, will create all`);
        missingVendors = vendorCodesJson;
      }
    } catch (err: any) {
      console.warn(`[ExcelImport] Could not check missing vendors, will proceed with create-all:`, err.message);
      missingVendors = vendorCodesJson;
    }

    // STEP 2.3: Send all missing vendors to database and insert
    setImportProgress({ current: 60, total: 100, stage: `STEP 2c/4: Inserting ${missingVendors.length} missing vendors...` });

    try {
      if (missingVendors.length > 0) {
        const insertVendorsResponse = await authenticatedFetch(`${getApiBaseUrl()}/api/vendors/batch-create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendors: missingVendors }),
        });

        if (!insertVendorsResponse.ok) {
          console.warn(`[ExcelImport] Batch create not available, using find-or-create instead`);
          // Fallback: use find-or-create
        } else {
          const insertResult = await insertVendorsResponse.json();
          console.log(`[ExcelImport] ✅ Inserted ${insertResult.created || missingVendors.length} vendors`);
        }
      } else {
        console.log(`[ExcelImport] ✅ All vendors already exist in database`);
      }
    } catch (err: any) {
      console.warn(`[ExcelImport] Error creating vendors:`, err.message);
    }

    // STEP 2.4: Send all vendor codes again and get code->ID mapping
    setImportProgress({ current: 65, total: 100, stage: 'STEP 2d/4: Getting vendor ID mappings...' });

    const vendorCodeToIdMap = new Map<string, string>();
    try {
      console.log(`[ExcelImport] Step 2a: Getting existing vendor mappings for ${vendorCodesJson.length} codes...`);

      // STEP 1: Try to get existing vendors first
      const getMappingResponse = await authenticatedFetch(`${getApiBaseUrl()}/api/vendors/get-mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendors: vendorCodesJson }),
      });

      if (getMappingResponse.ok) {
        const mappingResult = await getMappingResponse.json();
        if (mappingResult.mapping && typeof mappingResult.mapping === 'object') {
          for (const [code, id] of Object.entries(mappingResult.mapping)) {
            vendorCodeToIdMap.set(code, id as string);
          }
        }
        console.log(`[ExcelImport] ✅ Found ${vendorCodeToIdMap.size} existing vendors`);
      }

      // STEP 2: Check if there are any missing vendors that need to be created
      const missingVendorCodes = vendorCodesJson.filter(v => !vendorCodeToIdMap.has(v.code));

      if (missingVendorCodes.length > 0) {
        console.log(`[ExcelImport] Step 2b: Creating ${missingVendorCodes.length} missing vendors...`);
        console.log(`[ExcelImport] Missing vendor codes:`, missingVendorCodes.map(v => v.code));

        // Use batch-find-or-create to auto-create missing vendors
        const createResponse = await authenticatedFetch(`${getApiBaseUrl()}/api/vendors/batch-find-or-create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendors: missingVendorCodes }),
        });

        if (createResponse.ok) {
          const createResult = await createResponse.json();
          console.log(`[ExcelImport] Create response:`, createResult);

          if (createResult.vendors && Array.isArray(createResult.vendors)) {
            let createdCount = 0;
            for (const vendor of createResult.vendors) {
              if (!vendorCodeToIdMap.has(vendor.code)) {
                vendorCodeToIdMap.set(vendor.code, vendor.id);
                createdCount++;
              }
            }
            console.log(`[ExcelImport] ✅ Auto-created ${createdCount} new vendors`);
          }
        } else {
          const errorData = await createResponse.json().catch(() => ({}));
          throw new Error(`Failed to create missing vendors: ${errorData.error || createResponse.statusText}`);
        }
      }

      console.log(`[ExcelImport] ✅ Final vendor mapping complete: ${vendorCodeToIdMap.size} vendors ready`);
      console.log(`[ExcelImport] Vendor codes:`, Array.from(vendorCodeToIdMap.keys()));
    } catch (err: any) {
      console.error(`[ExcelImport] Failed to setup vendor mappings:`, err.message);
      toast({
        title: 'Vendor Setup Failed',
        description: err.message,
        variant: 'destructive',
      });
      setLoading(false);
      setImporting(false);
      return;
    }

    // STEP 3: Prepare all site data with vendor IDs in SINGLE BATCH
    setImportProgress({ current: 75, total: 100, stage: 'STEP 3/4: Preparing sites for insertion...' });

    // Collect all missing vendor codes first
    const missingVendorCodes = new Set<string>();
    const allSites = siteItems.map((item) => {
      const vendorCode = String(item.data.vendorId).trim();
      const resolvedVendorId = vendorCodeToIdMap.get(vendorCode);

      if (!resolvedVendorId) {
        missingVendorCodes.add(vendorCode);
      }

      return { item, vendorCode, resolvedVendorId };
    });

    // Check if there are any missing vendors and throw error with details
    if (missingVendorCodes.size > 0) {
      const availableVendors = Array.from(vendorCodeToIdMap.keys());
      const missingList = Array.from(missingVendorCodes).join(', ');
      throw new Error(
        `Vendor codes not found: ${missingList}\n\nAvailable vendor codes: ${availableVendors.length > 0 ? availableVendors.join(', ') : 'None'}\n\nPlease ensure all vendor codes exist in the system or check if they were properly created.`
      );
    }

    // Now create the final sites array
    const finalSites = allSites.map(({ item, resolvedVendorId }) => {

      return {
        ...item.data,
        vendorId: resolvedVendorId
      };
    });

    console.log(`[ExcelImport] ✅ Prepared ${finalSites.length} sites for insertion`);

    // STEP 4: CREATE MISSING CIRCLES IN BATCH BEFORE INSERTING SITES
    setImportProgress({ current: 82, total: 100, stage: 'STEP 4/4: Creating missing circles...' });

    try {
      // Collect unique circles from sites
      const uniqueCircles = new Set<string>();
      finalSites.forEach(site => {
        if (site.circle && site.circle.trim()) {
          uniqueCircles.add(site.circle.trim());
        }
      });

      if (uniqueCircles.size > 0) {
        console.log(`[ExcelImport] Found ${uniqueCircles.size} unique circles: ${Array.from(uniqueCircles).join(', ')}`);

        // Check all circles in database in one query
        const circlesToCheck = Array.from(uniqueCircles);
        const checkCirclesRes = await authenticatedFetch(`${getApiBaseUrl()}/api/circles/check-exist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ names: circlesToCheck }),
        });

        let existingCircleNames = new Set<string>();
        if (checkCirclesRes.ok) {
          const checkData = await checkCirclesRes.json();
          existingCircleNames = new Set(checkData.existing || []);
        } else {
          // Fallback: fetch all circles
          const existingCirclesRes = await authenticatedFetch(`${getApiBaseUrl()}/api/circles?pageSize=1000`);
          const existingCirclesData = await existingCirclesRes.json();
          existingCircleNames = new Set(
            (existingCirclesData.data || []).map((c: any) => c.name)
          );
        }

        // Find missing circles
        const missingCircles = circlesToCheck.filter(
          circle => !existingCircleNames.has(circle)
        );

        // Create all missing circles in one batch
        if (missingCircles.length > 0) {
          console.log(`[ExcelImport] Creating ${missingCircles.length} missing circles in batch...`);

          const circlesToCreate = missingCircles.map(name => ({
            name,
            shortName: name.substring(0, 3).toUpperCase()
          }));

          const createRes = await authenticatedFetch(`${getApiBaseUrl()}/api/circles/batch-create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ circles: circlesToCreate }),
          });

          if (createRes.ok) {
            const result = await createRes.json();
            console.log(`[ExcelImport] ✅ Created ${result.created || missingCircles.length} circles in batch`);
          } else {
            console.warn(`[ExcelImport] ⚠️ Failed to create circles in batch`);
          }
        } else {
          console.log(`[ExcelImport] All circles already exist in database`);
        }
      }
    } catch (error) {
      console.warn('[ExcelImport] Error processing circles:', error);
      // Continue with site import even if circle creation fails
    }

    // STEP 4.5: CHECK FOR DUPLICATE PLAN IDS IN PURCHASE ORDER LINES
    setImportProgress({ current: 88, total: 100, stage: 'Checking for duplicate Plan IDs with existing POs...' });

    let sitesToInsert = finalSites;
    let sitesWithExistingPOs: any[] = [];

    try {
      // Fetch all purchase order lines to get plan IDs that already have POs
      const poLinesResponse = await authenticatedFetch(`${getApiBaseUrl()}/api/purchase-order-lines?pageSize=10000`);

      if (poLinesResponse.ok) {
        const poLinesData = await poLinesResponse.json();
        // Extract unique plan IDs from purchase order lines
        const existingPlanIds = new Set(
          (poLinesData.data || [])
            .map((line: any) => line.planId)
            .filter((id: any) => id)
        );

        console.log(`[ExcelImport] Found ${existingPlanIds.size} Plan IDs with existing Purchase Orders`);

        // Separate sites into: new sites to insert and sites with existing POs
        sitesToInsert = finalSites.filter(site => !existingPlanIds.has(site.planId));
        sitesWithExistingPOs = finalSites.filter(site => existingPlanIds.has(site.planId));
        setSitesWithExistingPOs(sitesWithExistingPOs); // Update state to display in UI

        console.log(`[ExcelImport] Will insert ${sitesToInsert.length} new sites, ${sitesWithExistingPOs.length} sites already have POs (duplicate Plan IDs)`);

        if (sitesWithExistingPOs.length > 0) {
          console.log(`[ExcelImport] Skipping ${sitesWithExistingPOs.length} sites that have duplicate Plan IDs with existing POs`);
        }
      } else {
        console.warn('[ExcelImport] Could not fetch purchase order lines, proceeding with all sites');
        sitesToInsert = finalSites;
      }
    } catch (error) {
      console.warn('[ExcelImport] Error checking purchase order lines:', error);
      // Continue with all sites if check fails
      sitesToInsert = finalSites;
    }

    // STEP 5: INSERT ALL SITES IN PARALLEL BATCHES
    setImportProgress({ current: 90, total: 100, stage: `STEP 5/5: Inserting ${sitesToInsert.length} new sites in parallel batches...` });

    try {
      console.log(`[ExcelImport] Inserting ${sitesToInsert.length} sites in parallel intelligent mode...`);

      const insertResponse = await authenticatedFetch(`${getApiBaseUrl()}/api/sites/batch-upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sites: sitesToInsert }),
      });

      if (!insertResponse.ok) {
        let errorDetail = '';
        try {
          const errorJson = await insertResponse.json();
          if (insertResponse.status === 413) {
            errorDetail = 'Request payload too large. Try reducing the number of records per import.';
          } else if (errorJson?.error?.message) {
            errorDetail = errorJson.error.message;
          } else if (errorJson?.message) {
            errorDetail = errorJson.message;
          } else {
            errorDetail = typeof errorJson === 'string' ? errorJson : JSON.stringify(errorJson, null, 2);
          }
        } catch {
          errorDetail = await insertResponse.text();
        }
        throw new Error(`HTTP ${insertResponse.status}: ${errorDetail}`);
      }

      const result = await insertResponse.json();
      uploadedCount = result.successful || 0;

      // Update progress based on actual response
      const totalProcessed = uploadedCount + (result.failed || 0);
      const progressPercent = Math.round((totalProcessed / siteItems.length) * 100);

      console.log(`[ExcelImport] ✅ Insertion complete: ${uploadedCount} successful, ${result.failed || 0} failed`);
      console.log(`[ExcelImport] Progress: ${uploadedCount}/${siteItems.length} sites (${progressPercent}%)`);

      // Update progress bar with actual results
      setImportProgress({
        current: uploadedCount,
        total: siteItems.length,
        stage: `Inserted: ${uploadedCount}/${siteItems.length} sites (${progressPercent}%)`
      });

      // Collect error details with full site information
      if (result.errors && result.errors.length > 0) {
        errorDetailsArray2.push(
          ...result.errors.map((err: any) => {
            const siteId = err.siteId || '-';
            const fullSiteData = siteDataMap.get(siteId) || {};

            return {
              rowNum: err.planId,
              planId: err.planId || fullSiteData.planId || '-',
              siteId: siteId,
              circle: fullSiteData.circle || '-',
              district: fullSiteData.district || '-',
              project: fullSiteData.project || '-',
              partnerName: fullSiteData.partnerName || '-',
              hopType: fullSiteData.hopType || '-',
              siteAName: fullSiteData.siteAName || '-',
              siteBName: fullSiteData.siteBName || '-',
              nominalAop: fullSiteData.nominalAop || '-',
              status: fullSiteData.status || '-',
              error: err.error || 'Unknown error'
            };
          })
        );
      }
    } catch (err: any) {
      console.error(`[ExcelImport] INSERTION FAILED:`, err.message);
      toast({
        title: 'Insertion Failed',
        description: err.message,
        variant: 'destructive',
      });
      setLoading(false);
      setImporting(false);
      setImportProgress({ current: 0, total: 0, stage: '' });
      return;
    }

    // Final progress update
    setImportProgress({ current: uploadedCount, total: siteItems.length, stage: `Complete! ${uploadedCount}/${siteItems.length} sites inserted successfully` });

    // Process non-site items (vendor, employee) if any
    const nonSiteItems = validData.filter(v => v.type !== 'site');
    if (nonSiteItems.length > 0) {
      console.log(`[ExcelImport] Processing ${nonSiteItems.length} non-site items...`);
      setImportProgress({
        current: siteItems.length,
        total: validData.length,
        stage: `Processing ${nonSiteItems.length} additional items...`
      });

      for (let idx = 0; idx < nonSiteItems.length; idx++) {
        const item = nonSiteItems[idx];

        try {
          let response;
          if (item.type === 'vendor') {
            response = await authenticatedFetch(`${getApiBaseUrl()}/api/vendors`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.data),
            });
          } else if (item.type === 'employee') {
            response = await authenticatedFetch(`${getApiBaseUrl()}/api/employees`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.data),
            });
          }

          if (!response || !response.ok) {
            const errorText = response ? await response.text() : 'Unknown error';
            throw new Error(`${response?.status || 'Unknown'} - ${errorText}`);
          }

          console.log(`[ExcelImport] Row ${item.rowNum}: ${item.type} inserted successfully`);
          uploadedCount++;
        } catch (err: any) {
          console.error(`[ExcelImport] Row ${item.rowNum}: ${item.type} insertion failed -`, err.message);
          errorDetailsArray2.push({
            rowNum: item.rowNum,
            planId: item.data.planId || item.data.name || '-',
            siteId: item.data.siteId || '-',
            partner: item.data.partnerName || item.data.name || '-',
            error: `${item.type} insertion failed: ${err.message}`
          });
        }
      }
    }

    console.log(`[ExcelImport] Import complete: ${uploadedCount} inserted successfully, ${errorDetailsArray2.length} errors collected`);
    const imported = uploadedCount;
    const siteErrors = errorDetailsArray2.map(e => `Row ${e.rowNum}: ${e.error}`);

    // Update final progress
    setImportProgress({
      current: validData.length,
      total: validData.length,
      stage: `Complete! ${imported} inserted successfully, ${errorDetailsArray2.length} errors`
    });

    // Show completion toast
    toast({
      title: 'Import Complete',
      description: `${imported} records inserted successfully. ${errorDetailsArray2.length} errors found.`,
      variant: errorDetailsArray2.length > 0 ? 'destructive' : 'default',
    });

    // Clear imported data and show results
    setImportedData([]);
    setColumns([]);
    setErrors(siteErrors); // Show all errors
    setErrorDetails(errorDetailsArray2); // Set detailed error info for download
    setLoading(false);
    setImporting(false);

    // Keep progress bar visible for 2 seconds, then clear
    setTimeout(() => {
      setImportProgress({ current: 0, total: 0, stage: '' });
    }, 2000);
  };

  const downloadErrorsReport = () => {
    if (errorDetails.length === 0) return;

    const errorData = errorDetails.map(err => ({
      'Plan ID': err.planId || '-',
      'Site ID': err.siteId || '-',
      'Circle': err.circle || '-',
      'District': err.district || '-',
      'Project': err.project || '-',
      'Partner Name': err.partnerName || '-',
      'HOP Type': err.hopType || '-',
      'Site A Name': err.siteAName || '-',
      'Site B Name': err.siteBName || '-',
      'Nominal AOP': err.nominalAop || '-',
      'Status': err.status || '-',
      'Error Message': err.error || 'Unknown error',
      'Downloaded At': new Date().toISOString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(errorData);

    // Set column widths for better readability
    const columnWidths = [
      { wch: 18 }, // Plan ID
      { wch: 20 }, // Site ID
      { wch: 12 }, // Circle
      { wch: 15 }, // District
      { wch: 15 }, // Project
      { wch: 20 }, // Partner Name
      { wch: 12 }, // HOP Type
      { wch: 20 }, // Site A Name
      { wch: 20 }, // Site B Name
      { wch: 15 }, // Nominal AOP
      { wch: 12 }, // Status
      { wch: 40 }, // Error Message
      { wch: 25 }  // Downloaded At
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Site Errors');
    XLSX.writeFile(workbook, `site_import_errors_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: 'Success',
      description: `Downloaded ${errorDetails.length} error records with full site details`,
    });
  };

  const downloadApprovedSitesReport = () => {
    if (sitesWithExistingPOs.length === 0) return;

    const approvedData = sitesWithExistingPOs.map(site => ({
      'Plan ID': site.planId || '-',
      'Site ID': site.siteId || '-',
      'Circle': site.circle || '-',
      'District': site.district || '-',
      'Project': site.project || '-',
      'Status': site.status || 'Approved',
      'Exported At': new Date().toISOString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(approvedData);

    // Set column widths for better readability
    const columnWidths = [
      { wch: 18 }, // Plan ID
      { wch: 20 }, // Site ID
      { wch: 12 }, // Circle
      { wch: 15 }, // District
      { wch: 15 }, // Project
      { wch: 12 }, // Status
      { wch: 25 }  // Exported At
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Approved Sites');
    XLSX.writeFile(workbook, `approved_sites_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: 'Success',
      description: `Exported ${sitesWithExistingPOs.length} approved sites with existing purchase orders`,
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
        'PARTNER CODE': '1001',
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
        endpoint = `${getApiBaseUrl()}/api/sites?pageSize=500`;
        fileName = `sites_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      } else if (importType === 'vendor') {
        endpoint = `${getApiBaseUrl()}/api/vendors?pageSize=500`;
        fileName = `vendors_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      } else if (importType === 'employee') {
        endpoint = `${getApiBaseUrl()}/api/employees?pageSize=500`;
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

          {sitesWithExistingPOs.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    <div>
                      <CardTitle className="text-blue-900">
                        Existing Purchase Orders - {sitesWithExistingPOs.length} Site(s)
                      </CardTitle>
                      <CardDescription className="text-blue-700">
                        These sites are approved and have generated PO - Skipped from insertion
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    onClick={() => downloadApprovedSitesReport()}
                    size="sm"
                    variant="outline"
                    className="gap-2 text-blue-700 border-blue-300 hover:bg-blue-100"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto overflow-y-auto max-h-96 border rounded-lg border-blue-200">
                  <Table>
                    <TableHeader className="sticky top-0 bg-blue-100">
                      <TableRow className="hover:bg-blue-100">
                        <TableHead className="text-blue-900 font-bold">Plan ID</TableHead>
                        <TableHead className="text-blue-900 font-bold">Site ID</TableHead>
                        <TableHead className="text-blue-900 font-bold">Circle</TableHead>
                        <TableHead className="text-blue-900 font-bold">District</TableHead>
                        <TableHead className="text-blue-900 font-bold">Project</TableHead>
                        <TableHead className="text-blue-900 font-bold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sitesWithExistingPOs.map((site, idx) => (
                        <TableRow key={idx} className="hover:bg-blue-100">
                          <TableCell className="font-medium">{site.planId || '-'}</TableCell>
                          <TableCell>{site.siteId || '-'}</TableCell>
                          <TableCell>{site.circle || '-'}</TableCell>
                          <TableCell>{site.district || '-'}</TableCell>
                          <TableCell>{site.project || '-'}</TableCell>
                          <TableCell>
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              {site.status || 'Approved'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {errors.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="flex gap-2 mb-2 items-center justify-between">
                <div
                  className="flex gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setShowErrorModal(true)}
                >
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <span className="font-medium text-amber-900 underline">{errors.length} Errors Found</span>
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

              {/* Progress Indicator with Timer */}
              {importing && importProgress.total > 0 && (
                <div className="space-y-3 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-blue-900 dark:text-blue-100">
                      {importProgress.stage}
                    </span>
                    <span className="text-blue-700 dark:text-blue-300">
                      {importProgress.current} / {importProgress.total}
                    </span>
                  </div>

                  {/* Timer Section */}
                  <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Elapsed</div>
                        <div className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">{formatTime(elapsedTime)}</div>
                      </div>
                      <div className="h-8 w-px bg-blue-200 dark:bg-blue-800"></div>
                      <div className="text-center">
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Est. Remaining</div>
                        <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
                          {Math.max(0, estimatedTime.totalSeconds - elapsedTime) > 0
                            ? formatTime(Math.max(0, estimatedTime.totalSeconds - elapsedTime))
                            : '--:--'}
                        </div>
                      </div>
                      <div className="h-8 w-px bg-blue-200 dark:bg-blue-800"></div>
                      <div className="text-center">
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Total Est.</div>
                        <div className="text-lg font-bold font-mono text-green-600 dark:text-green-400">
                          {formatTime(estimatedTime.totalSeconds)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-blue-600 dark:bg-blue-400 h-full transition-all duration-300 ease-out flex items-center justify-center"
                      style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                    >
                      <span className="text-xs text-white font-medium px-2">
                        {Math.round((importProgress.current / importProgress.total) * 100)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
                    Please wait, processing your data...
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={() => {
                    setImportedData([]);
                    setColumns([]);
                  }}
                  variant="outline"
                  disabled={importing}
                >
                  Cancel
                </Button>
                <Button onClick={showImportConfirmation} size="lg" className="flex-1" disabled={importing}>
                  {importing ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : `Import ${importedData.length} Rows`}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Details Modal */}
      {showErrorModal && errorDetails.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-red-50 dark:bg-red-950">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                <h2 className="text-xl font-bold text-red-900 dark:text-red-100">
                  Import Errors - {errorDetails.length} Record(s) Failed
                </h2>
              </div>
              <button
                onClick={() => setShowErrorModal(false)}
                className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
              >
                <X className="h-6 w-6 text-red-600 dark:text-red-400" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-6">
              <div className="space-y-4">
                {errorDetails.map((error, idx) => (
                  <div
                    key={idx}
                    className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-red-900 dark:text-red-100">
                          Row {error.rowNum}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                          <div className="text-slate-700 dark:text-slate-300">
                            <span className="font-medium">Plan ID:</span> {error.planId}
                          </div>
                          <div className="text-slate-700 dark:text-slate-300">
                            <span className="font-medium">Site ID:</span> {error.siteId}
                          </div>
                          <div className="col-span-2 text-slate-700 dark:text-slate-300">
                            <span className="font-medium">Partner:</span> {error.partner}
                          </div>
                          {error.vendorCode && (
                            <div className="col-span-2 text-slate-700 dark:text-slate-300">
                              <span className="font-medium">Vendor Code:</span> {error.vendorCode}
                            </div>
                          )}
                        </div>
                        <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/50 rounded border border-red-300 dark:border-red-700">
                          <div className="font-medium text-red-800 dark:text-red-200 text-sm">Error Reason:</div>
                          <div className="text-red-700 dark:text-red-300 text-sm mt-1 break-words font-mono">
                            {error.error}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <Button
                onClick={downloadErrorsReport}
                className="flex-1"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Error Report
              </Button>
              <Button
                onClick={() => setShowErrorModal(false)}
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Import Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-950">
              <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100">
                Confirm Import
              </h2>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Total Rows:</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{importedData.length}</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Estimated Time:</span>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {estimatedTime.minutes > 0 ? `${estimatedTime.minutes}m ${estimatedTime.seconds}s` : `${estimatedTime.seconds}s`}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    This is an estimate. Actual time depends on server performance and network speed.
                  </p>
                </div>
              </div>

              <div className="text-sm text-slate-600 dark:text-slate-400 p-3 bg-amber-50 dark:bg-amber-950 rounded">
                <p>The process will:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Validate all rows (quick local check)</li>
                  <li>Validate/create vendors for each row</li>
                  <li>Insert all sites with vendor references</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <Button
                onClick={() => setShowConfirmDialog(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={proceedWithImport}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Start Import
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

