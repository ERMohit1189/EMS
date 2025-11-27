# Angular Frontend Setup Guide for EMS Portal

This guide provides step-by-step instructions and code templates for building the Angular frontend.

---

## **Project Setup**

### **Step 1: Create Angular Project**
```bash
ng new ems-portal --routing --style=scss
cd ems-portal
npm install
```

### **Step 2: Install Dependencies**
```bash
npm install @angular/material @angular/cdk
npm install xlsx
npm install primeng primeicons
npm install rxjs
npm install ngx-pagination
npm install ng2-smart-table
```

### **Step 3: Project Structure**
```
src/
├── app/
│   ├── core/
│   │   ├── models/
│   │   │   ├── vendor.model.ts
│   │   │   ├── site.model.ts
│   │   │   ├── employee.model.ts
│   │   │   ├── salary.model.ts
│   │   │   └── api-response.model.ts
│   │   ├── services/
│   │   │   ├── vendor.service.ts
│   │   │   ├── site.service.ts
│   │   │   ├── employee.service.ts
│   │   │   ├── salary.service.ts
│   │   │   ├── auth.service.ts
│   │   │   └── api.service.ts
│   │   └── interceptors/
│   │       └── auth.interceptor.ts
│   ├── shared/
│   │   ├── components/
│   │   │   ├── header/
│   │   │   ├── sidebar/
│   │   │   └── footer/
│   │   └── pipes/
│   ├── features/
│   │   ├── dashboard/
│   │   ├── vendor/
│   │   │   ├── vendor-register/
│   │   │   ├── vendor-list/
│   │   │   ├── vendor-detail/
│   │   │   └── excel-import/
│   │   ├── site/
│   │   ├── employee/
│   │   └── salary/
│   ├── app.component.ts
│   └── app.module.ts
├── assets/
├── styles.scss
└── main.ts
```

---

## **Core Models**

### **vendor.model.ts**
```typescript
export interface Vendor {
  id?: string;
  name: string;
  email: string;
  mobile: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  aadhar: string;
  pan: string;
  gstin?: string;
  moa?: string;
  category: 'Individual' | 'Company';
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface VendorListResponse {
  data: Vendor[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}
```

### **site.model.ts**
```typescript
export interface Site {
  id?: string;
  siteId: string;
  vendorId: string;
  vendorName?: string;
  planId: string;
  antennaSize: string;
  incDate: string;
  state: string;
  region: string;
  zone: string;
  inside: boolean;
  formNo: string;
  siteAmount: number;
  vendorAmount: number;
  status: 'Pending' | 'Active' | 'Inactive';
  softAtRemark?: string;
  phyAtRemark?: string;
  atpRemark?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SiteListResponse {
  data: Site[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}
```

### **employee.model.ts**
```typescript
export interface Employee {
  id?: string;
  name: string;
  dob: string;
  fatherName: string;
  mobile: string;
  alternateNo?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  designation: string;
  doj: string;
  aadhar: string;
  pan: string;
  bloodGroup: string;
  maritalStatus: 'Single' | 'Married';
  nominee: string;
  ppeKit: boolean;
  kitNo?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EmployeeListResponse {
  data: Employee[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}
```

### **salary.model.ts**
```typescript
export interface SalaryStructure {
  id?: string;
  employeeId: string;
  basicSalary: number;
  hra: number;
  da: number;
  lta: number;
  conveyance: number;
  medical: number;
  bonuses: number;
  otherBenefits: number;
  pf: number;
  professionalTax: number;
  incomeTax: number;
  epf: number;
  esic: number;
  grossSalary?: number;
  netSalary?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
```

---

## **Core Services**

### **api.service.ts**
```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) { }

  get<T>(endpoint: string, params?: any): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, { params: httpParams });
  }

  post<T>(endpoint: string, data: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, data);
  }

  put<T>(endpoint: string, data: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, data);
  }

  patch<T>(endpoint: string, data: any): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${endpoint}`, data);
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`);
  }

  uploadFile<T>(endpoint: string, file: File): Observable<T> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, formData);
  }
}
```

### **vendor.service.ts**
```typescript
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Vendor, VendorListResponse } from '../models/vendor.model';

@Injectable({
  providedIn: 'root'
})
export class VendorService {

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

  exportVendors(): Observable<Blob> {
    return this.apiService.get<Blob>('/vendors/export?format=excel');
  }
}
```

### **site.service.ts**
```typescript
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Site, SiteListResponse } from '../models/site.model';

@Injectable({
  providedIn: 'root'
})
export class SiteService {

  constructor(private apiService: ApiService) { }

  registerSite(site: Site): Observable<Site> {
    return this.apiService.post<Site>('/sites', site);
  }

  getSites(page: number = 1, pageSize: number = 10, status?: string, vendorId?: string): Observable<SiteListResponse> {
    const params = { page, pageSize, status, vendorId };
    return this.apiService.get<SiteListResponse>('/sites', params);
  }

  getSiteById(id: string): Observable<Site> {
    return this.apiService.get<Site>(`/sites/${id}`);
  }

  updateSite(id: string, site: Site): Observable<Site> {
    return this.apiService.put<Site>(`/sites/${id}`, site);
  }

  updateSiteStatus(id: string, status: string, remark: string): Observable<any> {
    return this.apiService.patch<any>(`/sites/${id}/status`, { status, remark });
  }

  deleteSite(id: string): Observable<void> {
    return this.apiService.delete<void>(`/sites/${id}`);
  }

  bulkImportSites(file: File): Observable<any> {
    return this.apiService.uploadFile<any>('/sites/bulk-import', file);
  }
}
```

### **employee.service.ts**
```typescript
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Employee, EmployeeListResponse } from '../models/employee.model';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {

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
}
```

### **salary.service.ts**
```typescript
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
```

---

## **Auth Interceptor**

### **auth.interceptor.ts**
```typescript
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();
    
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(req);
  }
}
```

---

## **App Module Setup**

### **app.module.ts**
```typescript
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

// Material Imports
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatProgressSpinnerModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

---

## **Environment Configuration**

### **environment.ts**
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000'
};
```

### **environment.prod.ts**
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-api-domain.com'
};
```

---

## **Component Template Examples**

### **vendor-register.component.html**
```html
<div class="container">
  <h2>Vendor Registration</h2>
  
  <form [formGroup]="vendorForm" (ngSubmit)="onSubmit()">
    
    <mat-form-field class="full-width">
      <mat-label>Vendor Name</mat-label>
      <input matInput formControlName="name" required>
      <mat-error *ngIf="vendorForm.get('name')?.hasError('required')">
        Name is required
      </mat-error>
    </mat-form-field>

    <mat-form-field class="full-width">
      <mat-label>Email</mat-label>
      <input matInput formControlName="email" type="email" required>
      <mat-error>Invalid email</mat-error>
    </mat-form-field>

    <mat-form-field class="full-width">
      <mat-label>Mobile</mat-label>
      <input matInput formControlName="mobile" required>
    </mat-form-field>

    <button mat-raised-button color="primary" type="submit" [disabled]="!vendorForm.valid">
      Register Vendor
    </button>
  </form>
</div>
```

---

This provides the complete Angular setup! You can now build components and connect them to your .NET Core backend.
