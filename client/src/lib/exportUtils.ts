import { getApiBaseUrl } from './api';

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
