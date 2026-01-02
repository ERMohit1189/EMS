// Shared types and interfaces for the application

export interface Vendor {
  id: string;
  name: string;
  vendorCode?: string;
  email?: string;
  mobile?: string;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Site {
  id: string;
  siteId?: string;
  name?: string;
  siteName?: string;
  vendorId?: string;
  vendor?: Vendor;
  location?: string;
  city?: string;
  state?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  poId?: string;
  vendorId: string;
  siteId?: string;
  vendor?: Vendor;
  site?: Site;
  poDate?: string;
  dueDate?: string;
  status?: string;
  description?: string;
  quantity?: number;
  unitPrice?: string | number;
  totalAmount?: string | number;
  amount?: string | number;
  gstApply?: boolean;
  gstType?: string;
  igstAmount?: number;
  igstPercentage?: number;
  cgstAmount?: number;
  cgstPercentage?: number;
  sgstAmount?: number;
  sgstPercentage?: number;
  vendorState?: string;
  siteState?: string;
  lines?: POLine[];
  createdAt?: string;
  updatedAt?: string;
  exportHeaders?: any;
}

export interface POLine {
  id: string;
  poId: string;
  siteId: string;
  description: string;
  quantity: number;
  unitPrice: string;
  totalAmount: string;
  siteHopAB?: string;
  sitePlanId?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceId?: string;
  vendorId: string;
  vendor?: Vendor;
  poIds?: string[];
  poDetails?: PurchaseOrder[];
  invoiceDate?: string;
  dueDate?: string;
  status?: string;
  amount?: number | string;
  gst?: number | string;
  totalAmount?: number | string;
  paymentMethod?: string;
  paymentDate?: string;
  bankDetails?: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
  exportHeaders?: any;
}

export interface ExportHeader {
  id?: string;
  companyName: string;
  address?: string;
  city?: string;
  state?: string;
  gstin?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
}
