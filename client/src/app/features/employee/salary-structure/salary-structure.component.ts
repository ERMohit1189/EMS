import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EmployeeService } from '../../../core/services/employee.service';
import { SalaryService } from '../../../core/services/salary.service';
import { Employee } from '../../../core/models/employee.model';
import { SalaryStructure } from '../../../core/models/salary.model';

@Component({
  selector: 'app-salary-structure',
  templateUrl: './salary-structure.component.html',
  styleUrls: ['./salary-structure.component.scss']
})
export class SalaryStructureComponent implements OnInit {
  salaryForm: FormGroup;
  employees: Employee[] = [];
  selectedEmployee?: Employee;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private salaryService: SalaryService
  ) {
    this.salaryForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadEmployees();
  }

  createForm(): FormGroup {
    return this.fb.group({
      employeeId: ['', Validators.required],
      basicSalary: [15000, Validators.required],
      hra: [7500, Validators.required],
      da: [3000, Validators.required],
      lta: [1500, Validators.required],
      conveyance: [2000, Validators.required],
      medical: [1250, Validators.required],
      bonuses: [0],
      otherBenefits: [0],
      pf: [1800, Validators.required],
      professionalTax: [200, Validators.required],
      incomeTax: [0],
      epf: [1800, Validators.required],
      esic: [500, Validators.required]
    });
  }

  loadEmployees(): void {
    this.employeeService.getEmployees().subscribe(
      (response) => {
        this.employees = response.data;
      },
      (error) => {
        alert('Error loading employees');
      }
    );
  }

  onEmployeeChange(employeeId: string): void {
    this.selectedEmployee = this.employees.find(e => e.id === employeeId);
    this.salaryForm.patchValue({ employeeId });
  }

  get grossSalary(): number {
    const basic = this.salaryForm.get('basicSalary')?.value || 0;
    const hra = this.salaryForm.get('hra')?.value || 0;
    const da = this.salaryForm.get('da')?.value || 0;
    const lta = this.salaryForm.get('lta')?.value || 0;
    const conveyance = this.salaryForm.get('conveyance')?.value || 0;
    const medical = this.salaryForm.get('medical')?.value || 0;
    return basic + hra + da + lta + conveyance + medical;
  }

  get totalDeductions(): number {
    const pf = this.salaryForm.get('pf')?.value || 0;
    const tax = this.salaryForm.get('professionalTax')?.value || 0;
    const income = this.salaryForm.get('incomeTax')?.value || 0;
    const epf = this.salaryForm.get('epf')?.value || 0;
    const esic = this.salaryForm.get('esic')?.value || 0;
    return pf + tax + income + epf + esic;
  }

  get netSalary(): number {
    return this.grossSalary - this.totalDeductions;
  }

  onSubmit(): void {
    if (this.salaryForm.invalid) return;

    this.isLoading = true;
    const salary: SalaryStructure = {
      ...this.salaryForm.value,
      grossSalary: this.grossSalary,
      netSalary: this.netSalary
    };

    this.salaryService.createSalaryStructure(salary).subscribe(
      (result) => {
        this.isLoading = false;
        alert('Salary structure saved successfully');
      },
      (error) => {
        this.isLoading = false;
        alert('Error saving salary structure');
      }
    );
  }
}
