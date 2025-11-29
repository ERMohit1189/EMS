import { getApiBaseUrl } from './api';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

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
 * Professional Excel styling properties with vibrant colors
 */
const headerStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, size: 11 },
  fill: { fgColor: { rgb: '1F4E78' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: {
    left: { style: 'thin' },
    right: { style: 'thin' },
    top: { style: 'thin' },
    bottom: { style: 'thin' }
  }
};

const companyHeaderStyle = {
  font: { bold: true, size: 14, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '003D7A' } },
  alignment: { horizontal: 'center', vertical: 'center' },
};

const titleStyle = {
  font: { bold: true, size: 12, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '0066CC' } },
  alignment: { horizontal: 'center', vertical: 'center' },
};

const earningsSectionStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, size: 10 },
  fill: { fgColor: { rgb: '27AE60' } },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: {
    left: { style: 'thin' },
    right: { style: 'thin' },
    top: { style: 'thin' },
    bottom: { style: 'thin' }
  }
};

const deductionsSectionStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, size: 10 },
  fill: { fgColor: { rgb: 'E74C3C' } },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: {
    left: { style: 'thin' },
    right: { style: 'thin' },
    top: { style: 'thin' },
    bottom: { style: 'thin' }
  }
};

const grossSalaryStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, size: 11 },
  fill: { fgColor: { rgb: '16A085' } },
  alignment: { horizontal: 'right', vertical: 'center' },
  border: {
    left: { style: 'thin' },
    right: { style: 'thin' },
    top: { style: 'medium' },
    bottom: { style: 'medium' }
  }
};

const totalRowStyle = {
  font: { bold: true, size: 11, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: 'C0392B' } },
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

const dataRowEvenStyle = {
  alignment: { vertical: 'center' },
  fill: { fgColor: { rgb: 'EBF5FB' } },
  border: {
    left: { style: 'thin' },
    right: { style: 'thin' },
    top: { style: 'hair' },
    bottom: { style: 'hair' }
  }
};

const dataRowOddStyle = {
  alignment: { vertical: 'center' },
  fill: { fgColor: { rgb: 'F4ECF7' } },
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

  // Apply data row styling and number formatting with colorful alternating rows
  for (let row = dataStartRow - 1; row < totalRowIndex - 2; row++) {
    for (let col = 0; col < columnWidths.length; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      if (worksheet[cellRef]) {
        // Apply alternating row colors (blue and purple tints)
        const style = row % 2 === 0 ? dataRowEvenStyle : dataRowOddStyle;
        worksheet[cellRef].s = style;
        
        // Apply currency formatting to currency columns
        if (col >= 3 && typeof worksheet[cellRef].v === 'number') {
          worksheet[cellRef].z = currencyFormat;
        }
      }
    }
  }

  // Apply total row styling - red color for total
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
 * Apply colorful formatting to salary structure Excel with section colors
 * Green for earnings, red for deductions
 */
export const formatSalaryStructureExcel = (
  worksheet: XLSX.WorkSheet,
  data: any[],
  columnWidths: number[]
): void => {
  worksheet['!cols'] = columnWidths.map(width => ({ wch: width }));

  let currentSection = '';
  
  for (let row = 0; row < data.length; row++) {
    const firstCellValue = data[row][0]?.toString().toUpperCase() || '';
    
    // Detect sections
    if (firstCellValue.includes('EARNINGS')) {
      currentSection = 'earnings';
    } else if (firstCellValue.includes('DEDUCTIONS')) {
      currentSection = 'deductions';
    } else if (firstCellValue.includes('GROSS')) {
      currentSection = 'gross';
    } else if (firstCellValue.includes('TOTAL')) {
      currentSection = 'total';
    } else if (firstCellValue.includes('NET')) {
      currentSection = 'net';
    }

    // Apply styling based on section
    for (let col = 0; col < columnWidths.length; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      if (worksheet[cellRef]) {
        let style;
        
        if (currentSection === 'earnings' && firstCellValue.includes('MONTHLY')) {
          style = earningsSectionStyle;
        } else if (currentSection === 'deductions' && firstCellValue.includes('DEDUCTIONS') && col === 0) {
          style = deductionsSectionStyle;
        } else if (currentSection === 'gross' && firstCellValue.includes('GROSS')) {
          style = grossSalaryStyle;
        } else if (currentSection === 'total' && firstCellValue.includes('TOTAL DEDUCTIONS')) {
          style = totalRowStyle;
        } else if (currentSection === 'net' && firstCellValue.includes('NET')) {
          style = grossSalaryStyle;
        } else if (row % 2 === 0 && currentSection === 'earnings') {
          style = dataRowEvenStyle;
        } else if (row % 2 === 1 && currentSection === 'earnings') {
          style = dataRowOddStyle;
        } else if (row % 2 === 0 && currentSection === 'deductions') {
          style = dataRowEvenStyle;
        } else if (row % 2 === 1 && currentSection === 'deductions') {
          style = dataRowOddStyle;
        } else {
          style = dataRowStyle;
        }
        
        worksheet[cellRef].s = style;
        
        // Apply currency formatting to numeric values in rightmost column
        if (col === columnWidths.length - 1 && typeof worksheet[cellRef].v === 'number') {
          worksheet[cellRef].z = currencyFormat;
        }
      }
    }
    
    // Set row heights for section headers
    if (currentSection === 'earnings' && firstCellValue.includes('MONTHLY')) {
      worksheet['!rows'] = worksheet['!rows'] || [];
      worksheet['!rows'][row] = { hpt: 22 };
    }
  }
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
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Salary Report');

  // Set column widths first
  columnWidths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });

  // Add all data rows
  data.forEach((row, rowIndex) => {
    worksheet.addRow(row);
  });

  // Calculate last column letter for merging
  const getColumnLetter = (colNum: number): string => {
    let col = '';
    while (colNum > 0) {
      const mod = (colNum - 1) % 26;
      col = String.fromCharCode(65 + mod) + col;
      colNum = Math.floor((colNum - 1) / 26);
    }
    return col;
  };
  
  const lastColumnLetter = getColumnLetter(columnWidths.length);

  // Merge and style header rows
  // Row 1: Company Name
  worksheet.mergeCells(`A1:${lastColumnLetter}1`);
  const row1 = worksheet.getRow(1);
  row1.height = 28;
  row1.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF003D7A' }
  };
  row1.getCell(1).font = {
    bold: true,
    color: { argb: 'FFFFFFFF' },
    size: 14
  };
  row1.getCell(1).alignment = { horizontal: 'center', vertical: 'center' };

  // Row 2: Address
  worksheet.mergeCells(`A2:${lastColumnLetter}2`);
  const row2 = worksheet.getRow(2);
  row2.height = 22;
  row2.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0066CC' }
  };
  row2.getCell(1).font = {
    bold: true,
    color: { argb: 'FFFFFFFF' },
    size: 10
  };
  row2.getCell(1).alignment = { horizontal: 'center', vertical: 'center' };

  // Row 4: Title
  worksheet.mergeCells(`A4:${lastColumnLetter}4`);
  const row4 = worksheet.getRow(4);
  row4.height = 24;
  row4.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F4E78' }
  };
  row4.getCell(1).font = {
    bold: true,
    color: { argb: 'FFFFFFFF' },
    size: 12
  };
  row4.getCell(1).alignment = { horizontal: 'center', vertical: 'center' };

  // Row 5: Date
  worksheet.mergeCells(`A5:${lastColumnLetter}5`);
  const row5 = worksheet.getRow(5);
  row5.height = 20;
  row5.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE7F0F7' }
  };
  row5.getCell(1).font = {
    color: { argb: 'FF1F4E78' },
    size: 10
  };
  row5.getCell(1).alignment = { horizontal: 'left', vertical: 'center' };

  // Row 7: Column Headers
  const headerRowIndex = 7;
  const headerRow = worksheet.getRow(headerRowIndex);
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E78' }
    };
    cell.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
      size: 11
    };
    cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
    cell.border = {
      left: { style: 'thin' },
      right: { style: 'thin' },
      top: { style: 'thin' },
      bottom: { style: 'thin' }
    };
  });

  // Apply data row styling
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowIndex || rowNumber === worksheet.rowCount) return;
    
    row.eachCell((cell, colNumber) => {
      // Alternating colors
      if (rowNumber % 2 === 0) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEBF5FB' }
        };
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF4ECF7' }
        };
      }
      
      cell.border = {
        left: { style: 'thin' },
        right: { style: 'thin' },
        top: { style: 'hair' },
        bottom: { style: 'hair' }
      };
      
      if (typeof cell.value === 'number' && colNumber >= 4) {
        cell.numFmt = '₹ #,##0.00';
      }
    });
  });

  // Total row styling (last row)
  const lastRow = worksheet.getRow(worksheet.rowCount);
  if (lastRow) {
    lastRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFC0392B' }
      };
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 11
      };
      cell.alignment = { horizontal: 'right', vertical: 'center' };
      if (typeof cell.value === 'number') {
        cell.numFmt = '₹ #,##0.00';
      }
    });
  }

  workbook.xlsx.writeBuffer().then((buffer) => {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  });
};

/**
 * Apply colorful professional formatting to generic data Excel exports
 * Used for site lists, reports, and other generic data exports
 */
export const formatGenericExcelWorksheet = (
  worksheet: XLSX.WorkSheet,
  columnCount: number,
  headerRowIndex: number = 0
): void => {
  // Apply header styling to first row
  for (let col = 0; col < columnCount; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
    if (worksheet[cellRef]) {
      worksheet[cellRef].s = headerStyle;
    }
  }

  // Apply alternating row colors to data rows
  let rowIndex = headerRowIndex + 1;
  let cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: 0 });
  
  while (worksheet[cellRef]) {
    for (let col = 0; col < columnCount; col++) {
      const ref = XLSX.utils.encode_cell({ r: rowIndex, c: col });
      if (worksheet[ref]) {
        const style = rowIndex % 2 === 0 ? dataRowEvenStyle : dataRowOddStyle;
        worksheet[ref].s = style;
        
        // Apply currency formatting to numeric values in amount columns
        if ((ref.includes('Amount') || ref.includes('amount')) && typeof worksheet[ref].v === 'number') {
          worksheet[ref].z = currencyFormat;
        }
      }
    }
    rowIndex++;
    cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: 0 });
  }
};

/**
 * Create a professional generic Excel export with colorful formatting using ExcelJS
 */
export const createColorfulExcel = (
  data: any[],
  columnWidths: number[],
  filename: string,
  sheetName: string = 'Sheet1',
  exportHeader?: ExportHeader,
  reportTitle: string = 'Report'
): void => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Set column widths first
  columnWidths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });

  // Calculate last column letter for merging
  const getColumnLetter = (colNum: number): string => {
    let col = '';
    while (colNum > 0) {
      const mod = (colNum - 1) % 26;
      col = String.fromCharCode(65 + mod) + col;
      colNum = Math.floor((colNum - 1) / 26);
    }
    return col;
  };
  
  const lastColumnLetter = getColumnLetter(columnWidths.length);

  // Add header rows
  let dataRowStartIndex = 1;

  if (exportHeader?.companyName) {
    const companyRow = worksheet.addRow([getCompanyName(exportHeader)]);
    worksheet.mergeCells(`A1:${lastColumnLetter}1`);
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
    companyRow.getCell(1).alignment = { horizontal: 'center', vertical: 'center' };
    dataRowStartIndex = 2;
  }

  if (exportHeader?.address) {
    const addressRow = worksheet.addRow([getCompanyAddress(exportHeader)]);
    worksheet.mergeCells(`A${dataRowStartIndex}:${lastColumnLetter}${dataRowStartIndex}`);
    addressRow.height = 22;
    addressRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066CC' }
    };
    addressRow.getCell(1).font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
      size: 10
    };
    addressRow.getCell(1).alignment = { horizontal: 'center', vertical: 'center' };
    dataRowStartIndex++;
  }

  // Add empty row
  worksheet.addRow([]);
  dataRowStartIndex++;

  // Add title row
  const titleRow = worksheet.addRow([reportTitle]);
  worksheet.mergeCells(`A${dataRowStartIndex}:${lastColumnLetter}${dataRowStartIndex}`);
  titleRow.height = 24;
  titleRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F4E78' }
  };
  titleRow.getCell(1).font = {
    bold: true,
    color: { argb: 'FFFFFFFF' },
    size: 12
  };
  titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'center' };
  dataRowStartIndex++;

  // Add date row
  const dateRow = worksheet.addRow([`Generated on: ${formatExportDate()}`]);
  worksheet.mergeCells(`A${dataRowStartIndex}:${lastColumnLetter}${dataRowStartIndex}`);
  dateRow.height = 20;
  dateRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE7F0F7' }
  };
  dateRow.getCell(1).font = {
    color: { argb: 'FF1F4E78' },
    size: 10
  };
  dateRow.getCell(1).alignment = { horizontal: 'left', vertical: 'center' };
  dataRowStartIndex++;

  // Add empty row
  worksheet.addRow([]);
  dataRowStartIndex++;

  // Add data rows
  data.forEach((row, rowIndex) => {
    worksheet.addRow(row);
  });

  // Header row styling (now at dataRowStartIndex)
  const headerRow = worksheet.getRow(dataRowStartIndex);
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
      size: 12
    };
    cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
    cell.border = {
      left: { style: 'thin' },
      right: { style: 'thin' },
      top: { style: 'medium' },
      bottom: { style: 'medium' }
    };
  });

  // Apply data row styling with alternating colors
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= dataRowStartIndex || rowNumber === worksheet.rowCount) return; // Skip header rows and last row
    
    row.eachCell((cell) => {
      // Alternating row colors
      if (rowNumber % 2 === 0) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEBF5FB' } // Light blue
        };
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF4ECF7' } // Light purple
        };
      }
      
      cell.alignment = { vertical: 'center' };
      cell.border = {
        left: { style: 'thin' },
        right: { style: 'thin' },
        top: { style: 'hair' },
        bottom: { style: 'hair' }
      };
      
      // Apply currency formatting to numbers
      if (typeof cell.value === 'number') {
        cell.numFmt = '₹ #,##0.00';
      }
    });
  });

  // Save the file
  workbook.xlsx.writeBuffer().then((buffer) => {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  });
};
