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
  spouseName?: string;
  nominee: string;
  ppeKit: boolean;
  kitNo?: string;
  status: 'Active' | 'Inactive';
  role?: string;
  departmentId?: string;
  designationId?: string;
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
  updateEmployeeStatus: (id: string, status: Employee['status']) => void;
  deleteEmployee: (id: string) => void;
  clearSites: () => void;
  clearVendors: () => void;
  clearEmployees: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      vendors: [],
      sites: [],
      employees: [],
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
      updateEmployeeStatus: (id, status) =>
        set((state) => ({
          employees: state.employees.map((e) => (e.id === id ? { ...e, status } : e)),
        })),
      deleteEmployee: (id) =>
        set((state) => ({
          employees: state.employees.filter((e) => e.id !== id),
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
