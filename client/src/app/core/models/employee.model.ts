export interface Employee {
  id?: string;
  name: string;
  dob: string;
  fatherName: string;
  mobile: string;
  alternateNo?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  designation: string;
  doj: string;
  aadhar: string;
  pan: string;
  bloodGroup: string;
  maritalStatus: 'Single' | 'Married';
  nominee: string;
  ppeKit: boolean;
  kitNo?: string;
  createdAt?: Date;
}

export interface EmployeeListResponse {
  data: Employee[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}
