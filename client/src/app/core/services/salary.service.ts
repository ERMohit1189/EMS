import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { SalaryStructure } from '../models/salary.model';

@Injectable({
  providedIn: 'root'
})
export class SalaryService {

  constructor(private apiService: ApiService) { }

  createSalaryStructure(salary: SalaryStructure): Observable<SalaryStructure> {
    return this.apiService.post<SalaryStructure>('/salary-structures', salary);
  }

  getSalaryByEmployeeId(employeeId: string): Observable<SalaryStructure> {
    return this.apiService.get<SalaryStructure>(`/employees/${employeeId}/salary`);
  }

  getAllSalaryStructures(page: number = 1, pageSize: number = 10): Observable<any> {
    const params = { page, pageSize };
    return this.apiService.get<any>('/salary-structures', params);
  }

  updateSalaryStructure(id: string, salary: SalaryStructure): Observable<SalaryStructure> {
    return this.apiService.put<SalaryStructure>(`/salary-structures/${id}`, salary);
  }

  calculateNetSalary(salary: SalaryStructure): number {
    const gross = salary.basicSalary + salary.hra + salary.da + salary.lta + salary.conveyance + salary.medical;
    const deductions = salary.pf + salary.professionalTax + salary.incomeTax + salary.epf + salary.esic;
    return gross - deductions;
  }
}
