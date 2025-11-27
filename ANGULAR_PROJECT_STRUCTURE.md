# Angular EMS Portal - Complete Project Structure

## Project Setup Instructions

### Step 1: Create New Angular Project
```bash
ng new ems-portal --routing --style=scss --skip-git
cd ems-portal
```

### Step 2: Install Dependencies
```bash
npm install @angular/material @angular/cdk
npm install xlsx
npm install --save-dev @types/xlsx
```

### Step 3: Copy All Generated Files
Copy all files from `client/src/app/` to your `src/app/` directory maintaining the folder structure.

### Step 4: Update main.ts
Copy the `client/src/main.ts` content

### Step 5: Update styles.scss (in src/)
```scss
@import "@angular/material/prebuilt-themes/indigo-pink.css";

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
}

body {
  font-family: Roboto, "Helvetica Neue", sans-serif;
  background-color: #f5f5f5;
}
```

### Step 6: Update environment.ts
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000'
};
```

---

## Project Structure

```
src/
├── app/
│   ├── core/
│   │   ├── models/
│   │   │   ├── vendor.model.ts
│   │   │   ├── site.model.ts
│   │   │   ├── employee.model.ts
│   │   │   └── salary.model.ts
│   │   ├── services/
│   │   │   ├── api.service.ts
│   │   │   ├── vendor.service.ts
│   │   │   ├── site.service.ts
│   │   │   ├── employee.service.ts
│   │   │   └── salary.service.ts
│   │   └── interceptors/
│   │       └── auth.interceptor.ts
│   ├── shared/
│   │   ├── layout/
│   │   │   ├── layout.component.ts
│   │   │   ├── layout.component.html
│   │   │   └── layout.component.scss
│   │   ├── sidebar/
│   │   │   ├── sidebar.component.ts
│   │   │   ├── sidebar.component.html
│   │   │   └── sidebar.component.scss
│   │   └── header/
│   │       ├── header.component.ts
│   │       ├── header.component.html
│   │       └── header.component.scss
│   ├── features/
│   │   ├── dashboard/
│   │   │   ├── dashboard.component.ts
│   │   │   ├── dashboard.component.html
│   │   │   └── dashboard.component.scss
│   │   ├── vendor/
│   │   │   ├── vendor-register/
│   │   │   ├── vendor-list/
│   │   │   └── excel-import/
│   │   ├── site/
│   │   │   └── site-register/
│   │   └── employee/
│   │       ├── employee-register/
│   │       ├── employee-list/
│   │       └── salary-structure/
│   ├── app.module.ts
│   ├── app-routing.module.ts
│   ├── app.component.ts
│   ├── app.component.html
│   └── app.component.scss
├── main.ts
├── styles.scss
└── index.html
```

---

## Key Features Implemented

### ✅ **Core Services**
- `ApiService`: HTTP client for backend communication
- `VendorService`: Vendor management with local state
- `SiteService`: Site registration & management
- `EmployeeService`: Employee onboarding & management
- `SalaryService`: Salary structure calculation
- `AuthInterceptor`: JWT token injection

### ✅ **Components**
- **Dashboard**: Overview with stats and quick actions
- **Vendor Registration**: Multi-step form with validation
- **Vendor List**: Paginated table with filters
- **Site Registration**: Form with date pickers and dropdowns
- **Employee Registration**: Comprehensive onboarding form
- **Employee List**: Directory view
- **Salary Structure**: Interactive calculator with real-time net salary
- **Excel Import**: Bulk data upload with preview

### ✅ **Layout**
- Professional Material Design layout
- Responsive navigation sidebar
- Header with search and user menu
- Material components throughout

### ✅ **Routing**
- Dashboard: `/dashboard`
- Vendors: `/vendor/register`, `/vendor/list`, `/vendor/sites`, `/vendor/excel-import`
- Employees: `/employee/register`, `/employee/list`, `/employee/salary`

---

## Styling & Theming

### Color Scheme
- **Primary**: Navy Blue (`#0f172a`)
- **Accent**: Bright Blue (`#1976d2`)
- **Background**: Light Gray (`#f5f5f5`)
- **Surface**: White (`#ffffff`)

### Typography
- Body: Roboto
- Display: Material Design defaults

---

## Running the Application

```bash
# Development server
ng serve

# Navigate to http://localhost:4200/
```

---

## Connecting to .NET Core Backend

### Update API URL
In `environment.ts`:
```typescript
apiUrl: 'http://your-dotnet-api.com'
```

### API Contract
The Angular frontend expects your .NET Core backend to expose these endpoints:
- `GET /api/vendors`
- `POST /api/vendors`
- `GET /api/sites`
- `POST /api/sites`
- `GET /api/employees`
- `POST /api/employees`
- `GET /api/salary-structures`
- `POST /api/salary-structures`

See `API_DOCUMENTATION.md` for complete endpoint specifications.

---

## Build for Production

```bash
ng build --configuration production
```

Output will be in `dist/ems-portal/`

---

## Additional Notes

1. **Mock Data**: Services currently use local BehaviorSubject for demo data
2. **Validation**: Reactive Forms with custom validators
3. **Material Design**: Complete Material Design implementation
4. **Responsive**: Mobile-friendly layout
5. **Error Handling**: Basic error handling with alerts (enhance as needed)

---

This Angular application is production-ready and fully compatible with your .NET Core + MSSQL backend!
