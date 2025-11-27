import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SiteService } from '../../../core/services/site.service';
import { VendorService } from '../../../core/services/vendor.service';
import { Site } from '../../../core/models/site.model';
import { Vendor } from '../../../core/models/vendor.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-site-register',
  templateUrl: './site-register.component.html',
  styleUrls: ['./site-register.component.scss']
})
export class SiteRegisterComponent implements OnInit {
  siteForm: FormGroup;
  vendors$: Observable<Vendor[]>;
  isLoading = false;
  antennaSizes = ['0.6m', '1.2m', '1.8m', '2.4m'];

  constructor(
    private fb: FormBuilder,
    private siteService: SiteService,
    private vendorService: VendorService,
    private router: Router
  ) {
    this.siteForm = this.createForm();
    this.vendors$ = this.vendorService.vendors$;
  }

  ngOnInit(): void {
  }

  createForm(): FormGroup {
    return this.fb.group({
      vendorId: ['', Validators.required],
      siteId: ['', [Validators.required, Validators.minLength(2)]],
      planId: ['', [Validators.required, Validators.minLength(2)]],
      antennaSize: ['', Validators.required],
      incDate: ['', Validators.required],
      state: ['', Validators.required],
      region: ['', Validators.required],
      zone: ['', Validators.required],
      inside: [false],
      formNo: ['', Validators.required],
      siteAmount: [0, Validators.required],
      vendorAmount: [0, Validators.required],
      softAtRemark: ['']
    });
  }

  onSubmit(): void {
    if (this.siteForm.invalid) return;

    this.isLoading = true;
    const site: Site = {
      ...this.siteForm.value,
      status: 'Pending',
      phyAtRemark: 'Pending',
      atpRemark: 'Pending'
    };

    this.siteService.registerSite(site).subscribe(
      (result) => {
        this.siteService.addLocalSite(site);
        this.isLoading = false;
        this.router.navigate(['/vendor/list']);
      },
      (error) => {
        this.isLoading = false;
        alert('Error registering site');
      }
    );
  }

  cancel(): void {
    this.router.navigate(['/dashboard']);
  }
}
