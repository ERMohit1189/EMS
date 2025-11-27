import { Component, OnInit } from '@angular/core';
import { VendorService } from '../../../core/services/vendor.service';
import { Vendor } from '../../../core/models/vendor.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-vendor-list',
  templateUrl: './vendor-list.component.html',
  styleUrls: ['./vendor-list.component.scss']
})
export class VendorListComponent implements OnInit {
  vendors: Vendor[] = [];
  displayedColumns: string[] = ['name', 'email', 'city', 'category', 'status', 'mobile', 'action'];
  isLoading = false;
  pageSize = 10;
  currentPage = 1;

  constructor(private vendorService: VendorService, private router: Router) {}

  ngOnInit(): void {
    this.loadVendors();
  }

  loadVendors(): void {
    this.isLoading = true;
    this.vendorService.getVendors(this.currentPage, this.pageSize).subscribe(
      (response) => {
        this.vendors = response.data;
        this.isLoading = false;
      },
      (error) => {
        this.isLoading = false;
        alert('Error loading vendors');
      }
    );
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadVendors();
  }

  viewVendor(id?: string): void {
    if (id) {
      this.router.navigate(['/vendor', id]);
    }
  }

  addVendor(): void {
    this.router.navigate(['/vendor/register']);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Approved':
        return 'green';
      case 'Rejected':
        return 'red';
      default:
        return 'orange';
    }
  }
}
