import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { ProgressBar } from "@/components/ProgressBar";
import { Loader } from "@/components/Loader";
import { useLoadingState } from "@/hooks/useLoadingState";
import { Layout } from "@/components/layout/Layout";
import { useEffect, useState, lazy, Suspense } from "react";
import { getStoredApiUrl } from "@/lib/api";
import GlobalPerformanceIndicator from "@/components/GlobalPerformanceIndicator";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

// Eager load login pages for instant display
import Login from "@/pages/Login";
import VendorLogin from "@/pages/VendorLogin";
import EmployeeLogin from "@/pages/EmployeeLogin";

// Lazy load other pages for code splitting
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const ApiConfig = lazy(() => import("@/pages/ApiConfig"));
const VendorRegistration = lazy(() => import("@/pages/vendor/VendorRegistration"));
const VendorList = lazy(() => import("@/pages/vendor/VendorList"));
const VendorEdit = lazy(() => import("@/pages/vendor/VendorEdit"));
const VendorCredentials = lazy(() => import("@/pages/vendor/VendorCredentials"));
const PaymentMaster = lazy(() => import("@/pages/vendor/PaymentMaster"));
const CircleMaster = lazy(() => import("@/pages/vendor/CircleMaster"));
const POGeneration = lazy(() => import("@/pages/vendor/POGeneration"));
const POPrint = lazy(() => import("@/pages/vendor/POPrint"));
const InvoiceGeneration = lazy(() => import("@/pages/vendor/InvoiceGeneration"));
const EmployeeRegistration = lazy(() => import("@/pages/employee/EmployeeRegistration"));
const EmployeeEdit = lazy(() => import("@/pages/employee/EmployeeEdit"));
const EmployeeList = lazy(() => import("@/pages/employee/EmployeeList"));
const EmployeeCredentials = lazy(() => import("@/pages/employee/EmployeeCredentials"));
const MyProfile = lazy(() => import("@/pages/employee/MyProfile"));
const EmployeeSalary = lazy(() => import("@/pages/employee/EmployeeSalary"));
const ChangePassword = lazy(() => import("@/pages/employee/ChangePassword"));
// Eager load privacy policies for instant access
import EmployeePrivacyPolicy from "@/pages/employee/PrivacyPolicy";
import VendorPrivacyPolicy from "@/pages/vendor/PrivacyPolicy";
const SiteRegistration = lazy(() => import("@/pages/vendor/SiteRegistration"));
const SiteList = lazy(() => import("@/pages/vendor/SiteList"));
const SiteEdit = lazy(() => import("@/pages/vendor/SiteEdit"));
const SiteStatus = lazy(() => import("@/pages/vendor/SiteStatus"));
const SiteManagement = lazy(() => import("@/pages/vendor/SiteManagement"));
const ExcelImport = lazy(() => import("@/pages/vendor/ExcelImport"));
const SalaryStructure = lazy(() => import("@/pages/employee/SalaryStructure"));
const SalaryReport = lazy(() => import("@/pages/employee/SalaryReport"));
const DepartmentMaster = lazy(() => import("@/pages/employee/DepartmentMaster"));
const DesignationMaster = lazy(() => import("@/pages/employee/DesignationMaster"));
const Attendance = lazy(() => import("@/pages/employee/Attendance"));
const Allowances = lazy(() => import("@/pages/employee/Allowances"));
const ExportHeaders = lazy(() => import("@/pages/vendor/ExportHeaders"));
const Settings = lazy(() => import("@/pages/Settings"));
const EmployeeDashboard = lazy(() => import("@/pages/EmployeeDashboard"));
const Teams = lazy(() => import("@/pages/admin/Teams"));
const AllowanceApproval = lazy(() => import("@/pages/admin/AllowanceApproval"));
const ApprovalHistory = lazy(() => import("@/pages/admin/ApprovalHistory"));
const NotFound = lazy(() => import("@/pages/not-found"));

const PageLoader = () => <div className="flex items-center justify-center h-screen"><Loader /></div>;

const Placeholder = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
    <h2 className="text-2xl font-bold mb-2">{title}</h2>
    <p>This module is under construction.</p>
  </div>
);

function App() {
  const [location, setLocation] = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEmployee, setIsEmployee] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const isLoading = useLoadingState();

  useEffect(() => {
    // Check if user is logged in
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loggedIn);
    
    // Check if user is an employee (has employeeEmail in localStorage)
    const employeeEmail = localStorage.getItem('employeeEmail');
    setIsEmployee(!!employeeEmail);
    
    console.log('[App] Login check - isLoggedIn:', loggedIn, 'isEmployee:', !!employeeEmail, 'location:', location);
    
    // Preserve current URL on app restart - store it before page reload
    // Only for logged in users, and not on login pages
    if (loggedIn && location && !location.startsWith('/login') && !location.startsWith('/employee-login')) {
      // Store current location so we can restore it if page reloads
      sessionStorage.setItem('lastValidLocation', location);
    } else if (!loggedIn) {
      // Clear stored location if user is not logged in
      sessionStorage.removeItem('lastValidLocation');
    }
    
    // If on root path and logged in as employee, restore from session or go to dashboard
    if (loggedIn && !!employeeEmail && location === '/') {
      const lastLocation = sessionStorage.getItem('lastValidLocation');
      if (lastLocation && lastLocation !== '/' && !lastLocation.startsWith('/login')) {
        setLocation(lastLocation);
      } else {
        setLocation('/employee/dashboard');
      }
    }
    
    setLoading(false);

    // Listen for logout events
    const handleLogout = () => {
      // Check if this was an employee logout BEFORE clearing data
      // Use employeeEmail as the check since that's what determines if someone is an employee
      const isEmployeeLogout = localStorage.getItem('employeeEmail') !== null;
      const employeeName = localStorage.getItem('employeeName');
      const employeeEmail = localStorage.getItem('employeeEmail');
      
      console.log('[App] ========== LOGOUT PROCESS ==========');
      console.log('[App] Logout triggered - isEmployeeLogout:', isEmployeeLogout);
      console.log('[App] Employee:', employeeName, '<' + employeeEmail + '>');
      console.log('[App] Time:', new Date().toLocaleString());
      
      // Clear session data from localStorage (but keep Remember Me credentials if user had them checked)
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('employeeId');
      localStorage.removeItem('employeeEmail');
      localStorage.removeItem('employeeName');
      localStorage.removeItem('employeeDepartment');
      localStorage.removeItem('employeeDesignation');
      // Clear session storage to prevent URL preservation after logout
      sessionStorage.removeItem('lastValidLocation');
      // NOTE: NOT clearing rememberMe_email and rememberMe_password - they stay saved
      
      setIsLoggedIn(false);
      setIsEmployee(false);
      console.log('[App] Session data cleared. Remember Me credentials: PRESERVED');
      
      // Set redirect destination
      if (isEmployeeLogout) {
        console.log('[App] REDIRECTING TO: /employee-login');
        console.log('[App] ====================================');
        setRedirectTo('/employee-login');
      } else {
        console.log('[App] REDIRECTING TO: /login');
        console.log('[App] ====================================');
        setRedirectTo('/login');
      }
    };

    // Listen for login events
    const handleLogin = () => {
      setIsLoggedIn(true);
      const employeeEmail = localStorage.getItem('employeeEmail');
      setIsEmployee(!!employeeEmail);
      console.log('[App] Login event - isEmployee:', !!employeeEmail);
    };

    // Listen for login events (storage changes)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'isLoggedIn') {
        const newLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        setIsLoggedIn(newLoggedIn);
      }
    };

    window.addEventListener('logout', handleLogout);
    window.addEventListener('login', handleLogin);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('logout', handleLogout);
      window.removeEventListener('login', handleLogin);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [setLocation]);

  // Handle redirects after logout
  useEffect(() => {
    if (redirectTo && !isLoggedIn) {
      console.log('[App] Executing redirect to:', redirectTo);
      setLocation(redirectTo);
      setRedirectTo(null);
    }
  }, [redirectTo, isLoggedIn, setLocation]);

  // Show loading while checking auth
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // Skip ApiConfig page - using static config file instead
  // Users can manually edit client/src/config/api.config.ts to change the API URL

  // If not logged in and not on login page, show login screens
  if (!isLoggedIn) {
    console.log('[App] User not logged in. Current location:', location);
    console.log('[App] Rendering login screens block');
    return (
      <>
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/vendor-login" component={VendorLogin} />
          <Route path="/employee-login" component={EmployeeLogin} />
          <Route path="/employee/privacy-policy" component={EmployeePrivacyPolicy} />
          <Route path="/vendor/privacy-policy" component={VendorPrivacyPolicy} />
          <Route component={Login} />
        </Switch>
        <Toaster />
      </>
    );
  }

  return (
    <>
      <ProgressBar isLoading={isLoading} />
      <Loader />
      <GlobalPerformanceIndicator />
      <Suspense fallback={<PageLoader />}>
        <Switch>
          {/* API Config Route */}
          <Route path="/api-config" component={ApiConfig} />
          
          {/* Login Routes */}
          <Route path="/login" component={Login} />
          <Route path="/vendor-login" component={VendorLogin} />
          <Route path="/employee-login" component={EmployeeLogin} />
          
          {/* Privacy Policy Routes */}
          <Route path="/employee/privacy-policy" component={EmployeePrivacyPolicy} />
          <Route path="/vendor/privacy-policy" component={VendorPrivacyPolicy} />

          {/* Print Routes - No Layout */}
          <Route path="/vendor/po/print/:id" component={POPrint} />
          
          {/* All other routes with Layout */}
          <Route>
            <Layout isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn}>
              <Suspense fallback={<PageLoader />}>
                <Switch>
                  {/* Dashboard Routes */}
                  <Route path="/employee/dashboard" component={EmployeeDashboard} />
                  <Route path="/">
                    {isEmployee ? <EmployeeDashboard /> : <Dashboard />}
                  </Route>
                  
                  {/* Vendor Routes */}
                  <Route path="/vendor/register" component={VendorRegistration} />
                  <Route path="/vendor/list" component={VendorList} />
                  <Route path="/vendor/edit/:id" component={VendorEdit} />
                  <Route path="/vendor/credentials" component={VendorCredentials} />
                  <Route path="/vendor/payment-master" component={PaymentMaster} />
                  <Route path="/vendor/circle-master" component={CircleMaster} />
                  <Route path="/vendor/sites" component={SiteList} />
                  <Route path="/vendor/sites/status" component={SiteStatus} />
                  <Route path="/vendor/export-headers" component={ExportHeaders} />
                  <Route path="/vendor/site/register" component={SiteRegistration} />
                  <Route path="/vendor/site/manage" component={SiteManagement} />
                  <Route path="/vendor/site/edit/:id" component={SiteEdit} />
                  <Route path="/vendor/excel-import" component={ExcelImport} />
                  <Route path="/vendor/po" component={POGeneration} />
                  <Route path="/vendor/invoices" component={InvoiceGeneration} />
                  
                  {/* Settings Route */}
                  <Route path="/settings" component={Settings} />
                  
                  {/* Employee Routes */}
                  <Route path="/employee/register" component={EmployeeRegistration} />
                  <Route path="/employee/edit/:id" component={EmployeeEdit} />
                  <Route path="/employee/list" component={EmployeeList} />
                  <Route path="/employee/credentials" component={EmployeeCredentials} />
                  <Route path="/employee/my-profile" component={MyProfile} />
                  <Route path="/employee/salary" component={EmployeeSalary} />
                  <Route path="/employee/change-password" component={ChangePassword} />
                  <Route path="/employee/salary-report" component={SalaryReport} />
                  <Route path="/employee/department-master" component={DepartmentMaster} />
                  <Route path="/employee/designation-master" component={DesignationMaster} />
                  <Route path="/employee/attendance" component={Attendance} />
                  <Route path="/employee/allowances" component={Allowances} />
                  <Route path="/employee/salary-structure" component={SalaryStructure} />
                  <Route path="/employee/privacy-policy" component={EmployeePrivacyPolicy} />
                  
                  {/* Admin Routes */}
                  <Route path="/admin/teams" component={Teams} />
                  <Route path="/admin/allowance-approvals" component={AllowanceApproval} />
                  <Route path="/admin/approval-history" component={ApprovalHistory} />
                  
                  {/* Vendor Privacy Policy */}
                  <Route path="/vendor/privacy-policy" component={VendorPrivacyPolicy} />
                  
                  {/* Reports */}
                  <Route path="/reports" component={() => <Placeholder title="Reports" />} />
                  
                  <Route component={NotFound} />
                </Switch>
              </Suspense>
            </Layout>
          </Route>
        </Switch>
      </Suspense>
      <Toaster />
      <PWAInstallPrompt />
    </>
  );
}

export default App;
