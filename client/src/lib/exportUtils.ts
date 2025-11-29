import { getApiBaseUrl } from './api';
import * as XLSX from 'xlsx';

export interface ExportHeader {
  companyName?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  gstin?: string;
  website?: string;
}

/**
 * Centralized function to fetch export header settings
 * Used for all PDF and Excel exports to maintain consistency
 */
export const fetchExportHeader = async (): Promise<ExportHeader> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/export-headers`);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    return {};
  } catch (error) {
    console.error('Failed to fetch export header:', error);
    return {};
  }
};

/**
 * Get company name for export headers
 */
export const getCompanyName = (header?: ExportHeader): string => {
  return header?.companyName || 'Enterprise Management System';
};

/**
 * Get company address for export headers
 */
export const getCompanyAddress = (header?: ExportHeader): string => {
  return header?.address || '';
};

/**
 * Format date for exports in Indian format
 */
export const formatExportDate = (): string => {
  return new Date().toLocaleDateString('en-IN', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

/**
 * Get current year for file naming
 */
export const getCurrentYear = (): number => {
  return new Date().getFullYear();
};

/**
 * Professional Excel styling properties
 */
const headerStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, size: 11 },
  fill: { fgColor: { rgb: '2E75B6' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: {
    left: { style: 'thin' },
    right: { style: 'thin' },
    top: { style: 'thin' },
    bottom: { style: 'thin' }
  }
};

const companyHeaderStyle = {
  font: { bold: true, size: 14, color: { rgb: '1F4E78' } },
  alignment: { horizontal: 'center', vertical: 'center' },
};

const titleStyle = {
  font: { bold: true, size: 12, color: { rgb: '2E75B6' } },
  alignment: { horizontal: 'center', vertical: 'center' },
};

const totalRowStyle = {
  font: { bold: true, size: 11, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '1F4E78' } },
  alignment: { horizontal: 'right', vertical: 'center' },
  border: {
    left: { style: 'thin' },
    right: { style: 'thin' },
    top: { style: 'medium' },
    bottom: { style: 'medium' }
  }
};

const dataRowStyle = {
  alignment: { vertical: 'center' },
  border: {
    left: { style: 'thin' },
    right: { style: 'thin' },
    top: { style: 'hair' },
    bottom: { style: 'hair' }
  }
};

const currencyFormat = '₹ #,##0.00';
const numberFormat = '#,##0.00';

/**
 * Apply professional formatting to Excel worksheet
 * Creates a client-ready report with proper styling, colors, and formatting
 */
export const formatSalaryExcelWorksheet = (
  worksheet: XLSX.WorkSheet,
  data: any[],
  columnWidths: number[]
): void => {
  const totalRows = data.length;
  const headerRowIndex = 7; // After company info and title
  const dataStartRow = 8;
  const totalRowIndex = totalRows;

  // Set column widths
  worksheet['!cols'] = columnWidths.map(width => ({ wch: width }));

  // Apply header styling to header row
  if (headerRowIndex <= totalRows) {
    for (let col = 0; col < columnWidths.length; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: headerRowIndex - 1, c: col });
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = headerStyle;
      }
    }
  }

  // Apply data row styling and number formatting
  for (let row = dataStartRow - 1; row < totalRowIndex - 2; row++) {
    for (let col = 0; col < columnWidths.length; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = dataRowStyle;
        
        // Apply currency formatting to currency columns (typically columns with amounts)
        if (col >= 3 && typeof worksheet[cellRef].v === 'number') {
          worksheet[cellRef].z = currencyFormat;
        }
      }
    }
    
    // Alternate row background color for better readability
    if (row % 2 === 0) {
      for (let col = 0; col < columnWidths.length; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (worksheet[cellRef]) {
          worksheet[cellRef].s = {
            ...dataRowStyle,
            fill: { fgColor: { rgb: 'E7F0F7' } }
          };
        }
      }
    }
  }

  // Apply total row styling
  if (totalRowIndex - 1 < totalRows) {
    for (let col = 0; col < columnWidths.length; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: totalRowIndex - 2, c: col });
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = totalRowStyle;
        if (typeof worksheet[cellRef].v === 'number') {
          worksheet[cellRef].z = currencyFormat;
        }
      }
    }
  }

  // Set row heights
  worksheet['!rows'] = [];
  if (headerRowIndex <= totalRows) {
    worksheet['!rows'][headerRowIndex - 1] = { hpt: 25 };
  }
  worksheet['!rows'][0] = { hpt: 25 }; // Company name
  worksheet['!rows'][4] = { hpt: 20 }; // Title row
};

/**
 * Create a professional salary report Excel file
 * Handles formatting and exports with proper styling
 */
export const createProfessionalSalaryExcel = (
  data: any[],
  columnWidths: number[],
  filename: string
): void => {
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  formatSalaryExcelWorksheet(worksheet, data, columnWidths);
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary Report');
  XLSX.writeFile(workbook, filename);
};
