import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { VendorService } from '../../../core/services/vendor.service';
import { Vendor } from '../../../core/models/vendor.model';

@Component({
  selector: 'app-vendor-register',
  templateUrl: './vendor-register.component.html',
  styleUrls: ['./vendor-register.component.scss']
})
export class VendorRegisterComponent {
  vendorForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private vendorService: VendorService,
    private router: Router
  ) {
    this.vendorForm = this.createForm();
  }

  createForm(): FormGroup {
    return this.fb.group({
      category: ['Individual', Validators.required],
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      mobile: ['', [Validators.required, Validators.minLength(10)]],
      address: ['', [Validators.required, Validators.minLength(5)]],
      city: ['', [Validators.required, Validators.minLength(2)]],
      state: ['', [Validators.required, Validators.minLength(2)]],
      pincode: ['', [Validators.required, Validators.minLength(6)]],
      country: ['India'],
      aadhar: ['', [Validators.required, Validators.minLength(12)]],
      pan: ['', [Validators.required, Validators.minLength(10)]],
      gstin: [''],
      moa: ['']
    });
  }

  onSubmit(): void {
    if (this.vendorForm.invalid) return;

    this.isLoading = true;
    const vendor: Vendor = {
      ...this.vendorForm.value,
      status: 'Pending'
    };

    this.vendorService.registerVendor(vendor).subscribe(
      (result) => {
        this.vendorService.addLocalVendor(vendor);
        this.isLoading = false;
        this.router.navigate(['/vendor/list']);
      },
      (error) => {
        this.isLoading = false;
        alert('Error registering vendor');
      }
    );
  }

  cancel(): void {
    this.router.navigate(['/dashboard']);
  }

  getErrorMessage(fieldName: string): string {
    const field = this.vendorForm.get(fieldName);
    if (field?.hasError('required')) {
      return `${fieldName} is required`;
    }
    if (field?.hasError('minlength')) {
      return `${fieldName} is too short`;
    }
    if (field?.hasError('email')) {
      return 'Invalid email format';
    }
    return '';
  }
}
