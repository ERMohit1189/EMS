import { Component, OnInit } from '@angular/core';
import { EmployeeService } from '../../../core/services/employee.service';
import { Employee } from '../../../core/models/employee.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-employee-list',
  templateUrl: './employee-list.component.html',
  styleUrls: ['./employee-list.component.scss']
})
export class EmployeeListComponent implements OnInit {
  employees: Employee[] = [];
  displayedColumns: string[] = ['name', 'designation', 'mobile', 'city', 'doj'];
  isLoading = false;

  constructor(private employeeService: EmployeeService, private router: Router) {}

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.isLoading = true;
    this.employeeService.getEmployees().subscribe(
      (response) => {
        this.employees = response.data;
        this.isLoading = false;
      },
      (error) => {
        this.isLoading = false;
        alert('Error loading employees');
      }
    );
  }

  addEmployee(): void {
    this.router.navigate(['/employee/register']);
  }
}
