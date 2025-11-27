import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { Employee, EmployeeListResponse } from '../models/employee.model';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private employeesSubject = new BehaviorSubject<Employee[]>([]);
  employees$ = this.employeesSubject.asObservable();

  constructor(private apiService: ApiService) { }

  registerEmployee(employee: Employee): Observable<Employee> {
    return this.apiService.post<Employee>('/employees', employee);
  }

  getEmployees(page: number = 1, pageSize: number = 10, designation?: string): Observable<EmployeeListResponse> {
    const params = { page, pageSize, designation };
    return this.apiService.get<EmployeeListResponse>('/employees', params);
  }

  getEmployeeById(id: string): Observable<Employee> {
    return this.apiService.get<Employee>(`/employees/${id}`);
  }

  updateEmployee(id: string, employee: Employee): Observable<Employee> {
    return this.apiService.put<Employee>(`/employees/${id}`, employee);
  }

  deleteEmployee(id: string): Observable<void> {
    return this.apiService.delete<void>(`/employees/${id}`);
  }

  bulkImportEmployees(file: File): Observable<any> {
    return this.apiService.uploadFile<any>('/employees/bulk-import', file);
  }

  addLocalEmployee(employee: Employee): void {
    const employees = this.employeesSubject.value;
    employee.id = Math.random().toString(36).substr(2, 9);
    this.employeesSubject.next([...employees, employee]);
  }
}
