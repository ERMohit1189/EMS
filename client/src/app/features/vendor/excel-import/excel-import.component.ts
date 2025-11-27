import { Component } from '@angular/core';
import * as XLSX from 'xlsx';
import { VendorService } from '../../../core/services/vendor.service';
import { SiteService } from '../../../core/services/site.service';
import { EmployeeService } from '../../../core/services/employee.service';

@Component({
  selector: 'app-excel-import',
  templateUrl: './excel-import.component.html',
  styleUrls: ['./excel-import.component.scss']
})
export class ExcelImportComponent {
  importedData: any[] = [];
  columns: string[] = [];
  errors: string[] = [];
  importType: 'site' | 'vendor' | 'employee' = 'site';
  importTypes = [
    { value: 'site', label: 'Sites Registration' },
    { value: 'vendor', label: 'Vendor Registration' },
    { value: 'employee', label: 'Employee Registration' }
  ];

  constructor(
    private vendorService: VendorService,
    private siteService: SiteService,
    private employeeService: EmployeeService
  ) {}

  onFileUpload(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          alert('No data found in Excel file');
          return;
        }

        const allColumns = Object.keys(jsonData[0]);
        this.columns = allColumns;
        this.importedData = jsonData;
        this.errors = [];
      } catch (error) {
        alert('Error reading file');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  handleImport(): void {
    if (this.importedData.length === 0) return;

    let imported = 0;
    this.importedData.forEach((row, idx) => {
      try {
        if (this.importType === 'site') {
          const site = {
            siteId: row['siteId'] || row['Site ID'] || `SITE-${idx}`,
            vendorId: '1',
            planId: row['planId'] || row['Plan ID'] || '',
            antennaSize: row['antennaSize'] || row['Antenna Size'] || '',
            incDate: row['incDate'] || row['INC Date'] || '',
            state: row['state'] || row['State'] || '',
            region: row['region'] || row['Region'] || '',
            zone: row['zone'] || row['Zone'] || '',
            inside: (row['inside'] === 'YES' || row['inside'] === true),
            formNo: row['formNo'] || row['Form No'] || '',
            siteAmount: Number(row['siteAmount'] || 0),
            vendorAmount: Number(row['vendorAmount'] || 0),
            status: 'Pending',
            softAtRemark: 'Pending',
            phyAtRemark: 'Pending',
            atpRemark: 'Pending'
          };
          if (site.siteId && site.planId) {
            this.siteService.addLocalSite(site);
            imported++;
          }
        }
      } catch (err) {
        // Error in row
      }
    });

    alert(`${imported} records imported successfully`);
    this.importedData = [];
    this.columns = [];
  }

  downloadTemplate(): void {
    const template = [
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
        'Vendor Amount': 45000
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sites');
    XLSX.writeFile(workbook, 'ems_import_template.xlsx');
  }

  cancel(): void {
    this.importedData = [];
    this.columns = [];
  }
}
