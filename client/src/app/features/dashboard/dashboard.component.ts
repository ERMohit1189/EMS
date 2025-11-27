import { Component, OnInit } from '@angular/core';
import { VendorService } from '../../core/services/vendor.service';
import { SiteService } from '../../core/services/site.service';
import { EmployeeService } from '../../core/services/employee.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  vendors$ = this.vendorService.vendors$;
  sites$ = this.siteService.sites$;
  employees$ = this.employeeService.employees$;

  stats = [
    { title: 'Total Vendors', value: 42, icon: 'people', color: 'primary' },
    { title: 'Active Sites', value: 110, icon: 'location_on', color: 'success' },
    { title: 'Total Employees', value: 85, icon: 'work', color: 'warning' },
    { title: 'Pending POs', value: 12, icon: 'receipt', color: 'info' }
  ];

  constructor(
    private vendorService: VendorService,
    private siteService: SiteService,
    private employeeService: EmployeeService
  ) {}

  ngOnInit(): void {
    // Load initial data
  }
}
