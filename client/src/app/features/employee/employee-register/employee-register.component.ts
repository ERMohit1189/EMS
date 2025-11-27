import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { EmployeeService } from '../../../core/services/employee.service';
import { Employee } from '../../../core/models/employee.model';

@Component({
  selector: 'app-employee-register',
  templateUrl: './employee-register.component.html',
  styleUrls: ['./employee-register.component.scss']
})
export class EmployeeRegisterComponent {
  employeeForm: FormGroup;
  isLoading = false;
  bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private router: Router
  ) {
    this.employeeForm = this.createForm();
  }

  createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      dob: ['', Validators.required],
      fatherName: ['', Validators.required],
      mobile: ['', [Validators.required, Validators.minLength(10)]],
      alternateNo: [''],
      address: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      country: ['India'],
      designation: ['', Validators.required],
      doj: ['', Validators.required],
      aadhar: ['', Validators.required],
      pan: ['', Validators.required],
      bloodGroup: ['O+', Validators.required],
      maritalStatus: ['Single', Validators.required],
      nominee: ['', Validators.required],
      ppeKit: [false],
      kitNo: ['']
    });
  }

  onSubmit(): void {
    if (this.employeeForm.invalid) return;

    this.isLoading = true;
    const employee: Employee = this.employeeForm.value;

    this.employeeService.registerEmployee(employee).subscribe(
      (result) => {
        this.employeeService.addLocalEmployee(employee);
        this.isLoading = false;
        this.router.navigate(['/employee/list']);
      },
      (error) => {
        this.isLoading = false;
        alert('Error registering employee');
      }
    );
  }

  cancel(): void {
    this.router.navigate(['/dashboard']);
  }
}
