export interface SalaryStructure {
  id?: string;
  employeeId: string;
  basicSalary: number;
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
  grossSalary?: number;
  netSalary?: number;
  createdAt?: Date;
}
