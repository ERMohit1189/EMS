export interface Site {
  id?: string;
  siteId: string;
  vendorId: string;
  vendorName?: string;
  planId: string;
  antennaSize: string;
  incDate: string;
  state: string;
  region: string;
  zone: string;
  inside: boolean;
  formNo: string;
  siteAmount: number;
  vendorAmount: number;
  status: 'Pending' | 'Active' | 'Inactive';
  softAtRemark?: string;
  phyAtRemark?: string;
  atpRemark?: string;
  createdAt?: Date;
}

export interface SiteListResponse {
  data: Site[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}
