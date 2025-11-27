export interface Vendor {
  id?: string;
  name: string;
  email: string;
  mobile: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  aadhar: string;
  pan: string;
  gstin?: string;
  moa?: string;
  category: 'Individual' | 'Company';
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt?: Date;
}

export interface VendorListResponse {
  data: Vendor[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}
