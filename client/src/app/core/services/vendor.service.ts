import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { Vendor, VendorListResponse } from '../models/vendor.model';

@Injectable({
  providedIn: 'root'
})
export class VendorService {
  private vendorsSubject = new BehaviorSubject<Vendor[]>([
    {
      id: '1',
      name: 'Acme Towers Ltd',
      email: 'contact@acme.com',
      mobile: '9876543210',
      address: '123 Business Park',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      country: 'India',
      aadhar: '123456789012',
      pan: 'ABCDE1234F',
      gstin: '07AAAAA0000A1Z5',
      category: 'Company',
      status: 'Approved',
      createdAt: new Date()
    }
  ]);

  vendors$ = this.vendorsSubject.asObservable();

  constructor(private apiService: ApiService) { }

  registerVendor(vendor: Vendor): Observable<Vendor> {
    return this.apiService.post<Vendor>('/vendors', vendor);
  }

  getVendors(page: number = 1, pageSize: number = 10, status?: string): Observable<VendorListResponse> {
    const params = { page, pageSize, status };
    return this.apiService.get<VendorListResponse>('/vendors', params);
  }

  getVendorById(id: string): Observable<Vendor> {
    return this.apiService.get<Vendor>(`/vendors/${id}`);
  }

  updateVendor(id: string, vendor: Vendor): Observable<Vendor> {
    return this.apiService.put<Vendor>(`/vendors/${id}`, vendor);
  }

  updateVendorStatus(id: string, status: string): Observable<any> {
    return this.apiService.patch<any>(`/vendors/${id}/status`, { status });
  }

  deleteVendor(id: string): Observable<void> {
    return this.apiService.delete<void>(`/vendors/${id}`);
  }

  bulkImportVendors(file: File): Observable<any> {
    return this.apiService.uploadFile<any>('/vendors/bulk-import', file);
  }

  addLocalVendor(vendor: Vendor): void {
    const vendors = this.vendorsSubject.value;
    vendor.id = Math.random().toString(36).substr(2, 9);
    this.vendorsSubject.next([...vendors, vendor]);
  }
}
