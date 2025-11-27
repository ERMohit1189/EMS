import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { VendorRegisterComponent } from './features/vendor/vendor-register/vendor-register.component';
import { VendorListComponent } from './features/vendor/vendor-list/vendor-list.component';
import { SiteRegisterComponent } from './features/site/site-register/site-register.component';
import { ExcelImportComponent } from './features/vendor/excel-import/excel-import.component';
import { EmployeeRegisterComponent } from './features/employee/employee-register/employee-register.component';
import { EmployeeListComponent } from './features/employee/employee-list/employee-list.component';
import { SalaryStructureComponent } from './features/employee/salary-structure/salary-structure.component';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'vendor/register', component: VendorRegisterComponent },
  { path: 'vendor/list', component: VendorListComponent },
  { path: 'vendor/sites', component: SiteRegisterComponent },
  { path: 'vendor/excel-import', component: ExcelImportComponent },
  { path: 'employee/register', component: EmployeeRegisterComponent },
  { path: 'employee/list', component: EmployeeListComponent },
  { path: 'employee/salary', component: SalaryStructureComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
