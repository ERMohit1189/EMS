import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Vendor {
  id: string;
  name: string;
  address: string;
  pincode: string;
  state: string;
  city: string;
  country: string;
  mobile: string;
  email: string;
  aadhar: string;
  gstin: string;
  pan: string;
  moa: string; // path or string
  category: 'Individual' | 'Company';
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

export interface Site {
  id: string;
  sno?: number;
  circle?: string;
  planId: string;
  nominalAop?: string;
  hopType?: string;
  hopAB?: string;
  hopBA?: string;
  district?: string;
  project?: string;
  siteAAntDia?: string;
  siteBAntDia?: string;
  maxAntSize?: string;
  siteAName?: string;
  tocoVendorA?: string;
  tocoIdA?: string;
  siteBName?: string;
  tocoVendorB?: string;
  tocoIdB?: string;
  mediaAvailabilityStatus?: string;
  srNoSiteA?: string;
  srDateSiteA?: string;
  srNoSiteB?: string;
  srDateSiteB?: string;
  hopSrDate?: string;
  spDateSiteA?: string;
  spDateSiteB?: string;
  hopSpDate?: string;
  soReleasedDateSiteA?: string;
  soReleasedDateSiteB?: string;
  hopSoDate?: string;
  rfaiOfferedDateSiteA?: string;
  rfaiOfferedDateSiteB?: string;
  actualHopRfaiOfferedDate?: string;
  partnerName?: string;
  rfaiSurveyCompletionDate?: string;
  moNumberSiteA?: string;
  materialTypeSiteA?: string;
  moDateSiteA?: string;
  moNumberSiteB?: string;
  materialTypeSiteB?: string;
  moDateSiteB?: string;
  srnRmoNumber?: string;
  srnRmoDate?: string;
  hopMoDate?: string;
  hopMaterialDispatchDate?: string;
  hopMaterialDeliveryDate?: string;
  materialDeliveryStatus?: string;
  siteAInstallationDate?: string;
  ptwNumberSiteA?: string;
  ptwStatusA?: string;
  siteBInstallationDate?: string;
  ptwNumberSiteB?: string;
  ptwStatusB?: string;
  hopIcDate?: string;
  alignmentDate?: string;
  hopInstallationRemarks?: string;
  visibleInNms?: string;
  nmsVisibleDate?: string;
  softAtOfferDate?: string;
  softAtAcceptanceDate?: string;
  softAtStatus?: string;
  phyAtOfferDate?: string;
  phyAtAcceptanceDate?: string;
  phyAtStatus?: string;
  bothAtStatus?: string;
  priIssueCategory?: string;
  priSiteId?: string;
  priOpenDate?: string;
  priCloseDate?: string;
  priHistory?: string;
  rfiSurveyAllocationDate?: string;
  descope?: string;
  reasonOfExtraVisit?: string;
  wccReceived80Percent?: string;
  wccReceivedDate80Percent?: string;
  wccReceived20Percent?: string;
  wccReceivedDate20Percent?: string;
  wccReceivedDate100Percent?: string;
  survey?: string;
  finalPartnerSurvey?: string;
  surveyDate?: string;
  status: 'Pending' | 'Active' | 'Inactive';
}

export interface Employee {
  id: string;
  name: string;
  dob: string;
  fatherName: string;
  mobile: string;
  alternateNo: string;
  address: string;
  city: string;
  state: string;
  country: string;
  designation: string;
  doj: string;
  aadhar: string;
  pan: string;
  lwd?: string;
  bloodGroup: string;
  maritalStatus: 'Single' | 'Married';
  nominee: string;
  ppeKit: boolean;
  kitNo?: string;
  salary?: SalaryStructure;
}

export interface SalaryStructure {
  basic: number;
  hra: number;
  da: number;
  lta: number;
  conveyance: number;
  medical: number;
  bonuses: number;
  otherBenefits: number;
  pf: number;
  professionalTax: number;
  incomeTax: number;
  epf: number;
  esic: number;
}

interface AppState {
  vendors: Vendor[];
  sites: Site[];
  employees: Employee[];
  addVendor: (vendor: Omit<Vendor, 'id' | 'createdAt'>) => void;
  addSite: (site: Omit<Site, 'id'>) => void;
  addEmployee: (employee: Omit<Employee, 'id'>) => void;
  updateVendorStatus: (id: string, status: Vendor['status']) => void;
  clearSites: () => void;
  clearVendors: () => void;
  clearEmployees: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      vendors: [
        {
          id: '1',
          name: 'Acme Towers Ltd',
          address: '123 Business Park',
          pincode: '110001',
          state: 'Delhi',
          city: 'New Delhi',
          country: 'India',
          mobile: '9876543210',
          email: 'contact@acme.com',
          aadhar: '123456789012',
          gstin: '07AAAAA0000A1Z5',
          pan: 'ABCDE1234F',
          moa: 'doc.pdf',
          category: 'Company',
          status: 'Approved',
          createdAt: '2024-01-15',
        },
        {
          id: '2',
          name: 'Rajesh Kumar',
          address: '45 Main St',
          pincode: '400001',
          state: 'Maharashtra',
          city: 'Mumbai',
          country: 'India',
          mobile: '9123456789',
          email: 'rajesh@gmail.com',
          aadhar: '987654321098',
          gstin: '',
          pan: 'FGHIJ5678K',
          moa: '',
          category: 'Individual',
          status: 'Pending',
          createdAt: '2024-02-20',
        },
      ],
      sites: [
        {
          id: '1',
          siteId: 'DL-001',
          vendorId: '1',
          planId: 'P-500',
          antennaSize: '2.4m',
          incDate: '2024-01-20',
          state: 'Delhi',
          region: 'North',
          zone: 'Zone-1',
          inside: true,
          formNo: 'F-101',
          status: 'Active',
          softAtRemark: 'Cleared',
          phyAtRemark: 'Pending',
          atpRemark: '',
          siteAmount: 50000,
          vendorAmount: 45000,
        },
      ],
      employees: [
        {
          id: '1',
          name: 'Amit Singh',
          dob: '1990-05-15',
          fatherName: 'Vikram Singh',
          mobile: '9988776655',
          alternateNo: '',
          address: 'Sector 62',
          city: 'Noida',
          state: 'Uttar Pradesh',
          country: 'India',
          designation: 'Field Engineer',
          doj: '2023-06-01',
          aadhar: '112233445566',
          pan: 'ABCDE1111F',
          bloodGroup: 'O+',
          maritalStatus: 'Married',
          nominee: 'Spouse',
          ppeKit: true,
          kitNo: 'K-101',
          salary: {
             basic: 15000,
             hra: 7500,
             da: 3000,
             lta: 1500,
             conveyance: 2000,
             medical: 1250,
             bonuses: 0,
             otherBenefits: 0,
             pf: 1800,
             professionalTax: 200,
             incomeTax: 0,
             epf: 1800,
             esic: 500
          }
        }
      ],
      addVendor: (vendor) =>
        set((state) => ({
          vendors: [
            ...state.vendors,
            { ...vendor, id: Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString().split('T')[0] },
          ],
        })),
      addSite: (site) =>
        set((state) => ({
          sites: [...state.sites, { ...site, id: Math.random().toString(36).substr(2, 9) }],
        })),
      addEmployee: (employee) =>
        set((state) => ({
          employees: [
            ...state.employees,
            { ...employee, id: Math.random().toString(36).substr(2, 9) },
          ],
        })),
      updateVendorStatus: (id, status) =>
        set((state) => ({
          vendors: state.vendors.map((v) => (v.id === id ? { ...v, status } : v)),
        })),
      clearSites: () => set({ sites: [] }),
      clearVendors: () => set({ vendors: [] }),
      clearEmployees: () => set({ employees: [] }),
    }),
    {
      name: 'ems-storage',
    }
  )
);
