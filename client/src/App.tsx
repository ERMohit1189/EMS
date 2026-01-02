import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { ProgressBar } from "@/components/ProgressBar";
import { Loader } from "@/components/Loader";
import { useLoadingState } from "@/hooks/useLoadingState";
import { Layout } from "@/components/layout/Layout";
import { useEffect, useState, lazy, Suspense } from "react";
import GlobalPerformanceIndicator from "@/components/GlobalPerformanceIndicator";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import JoyrideTour from "@/components/JoyrideTour";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Eager load login pages for instant display
import Login from "@/pages/Login";
import VendorLogin from "@/pages/VendorLogin";
import VendorSignUp from "@/pages/VendorSignUp";
import EmployeeLogin from "@/pages/EmployeeLogin";

// Lazy load other pages for code splitting
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const VendorRegistration = lazy(() => import("@/pages/vendor/VendorRegistration"));
const VendorList = lazy(() => import("@/pages/vendor/VendorList"));
const VendorEdit = lazy(() => import("@/pages/vendor/VendorEdit"));
const VendorCredentials = lazy(() => import("@/pages/vendor/VendorCredentials"));

const PaymentMaster = lazy(() => import("@/pages/vendor/PaymentMaster"));
const CircleMaster = lazy(() => import("@/pages/vendor/CircleMaster"));
const POGeneration = lazy(() => import("@/pages/vendor/POGeneration"));
const POPrint = lazy(() => import("@/pages/vendor/POPrint"));
const PrintSalary = lazy(() => import("@/pages/PrintSalary"));
const InvoiceGeneration = lazy(() => import("@/pages/vendor/InvoiceGeneration"));
const InvoicePrint = lazy(() => import("@/pages/vendor/InvoicePrint"));
const EmployeeRegistration = lazy(() => import("@/pages/employee/EmployeeRegistration"));
const EmployeeEdit = lazy(() => import("@/pages/employee/EmployeeEdit"));
const EmployeeList = lazy(() => import("@/pages/employee/EmployeeList"));
const EmployeeCredentials = lazy(() => import("@/pages/employee/EmployeeCredentials"));
const MyProfile = lazy(() => import("@/pages/employee/MyProfile"));
const EmployeeSalary = lazy(() => import("@/pages/employee/EmployeeSalary"));
const EmployeeSalaryHistory = lazy(() => import("@/pages/employee/EmployeeSalaryHistory"));
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
const SalaryGeneration = lazy(() => import("@/pages/admin/SalaryGeneration"));
const SalaryReportsMonthly = lazy(() => import("@/pages/admin/SalaryReportsMonthly"));
const DepartmentMaster = lazy(() => import("@/pages/employee/DepartmentMaster"));
const DesignationMaster = lazy(() => import("@/pages/employee/DesignationMaster"));
const Attendance = lazy(() => import("@/pages/employee/Attendance"));
const MonthlyAttendance = lazy(() => import("@/pages/employee/MonthlyAttendance"));
const LeaveApply = lazy(() => import("@/pages/employee/LeaveApply"));
const LeaveHistory = lazy(() => import("@/pages/employee/LeaveHistory"));
const LeaveApprovals = lazy(() => import("@/pages/employee/LeaveApprovals"));
const Allowances = lazy(() => import("@/pages/employee/Allowances"));
const ExportHeaders = lazy(() => import("@/pages/vendor/ExportHeaders"));
const Settings = lazy(() => import("@/pages/Settings"));
const EmailSettings = lazy(() => import("@/pages/admin/EmailSettings"));
const VendorRates = lazy(() => import("@/pages/vendor/VendorRates"));
const EmployeeDashboard = lazy(() => import("@/pages/EmployeeDashboard"));
const VendorDashboard = lazy(() => import("@/pages/VendorDashboard"));
const VendorPOReport = lazy(() => import("@/pages/vendor/VendorPOReport"));
const VendorInvoiceReport = lazy(() => import("@/pages/vendor/VendorInvoiceReport"));
const VendorSiteReport = lazy(() => import("@/pages/vendor/VendorSiteReport"));
const VendorProfile = lazy(() => import("@/pages/vendor/VendorProfile"));
const VendorChangePassword = lazy(() => import("@/pages/vendor/VendorChangePassword"));
const ReportBuilder = lazy(() => import("@/pages/vendor/ReportBuilder"));
const VendorForgotPassword = lazy(() => import("@/pages/vendor/VendorForgotPassword"));
const Teams = lazy(() => import("@/pages/admin/Teams"));
const AllowanceApproval = lazy(() => import("@/pages/admin/AllowanceApproval"));
const ApprovalHistory = lazy(() => import("@/pages/admin/ApprovalHistory"));
const HolidayMaster = lazy(() => import("@/pages/admin/HolidayMaster"));
const LeaveAllotment = lazy(() => import("@/pages/admin/LeaveAllotment"));
const AttendanceReport = lazy(() => import("@/pages/admin/AttendanceReport"));
const BulkAttendanceMarking = lazy(() => import("@/pages/admin/BulkAttendanceMarking"));
const ReportsDashboard = lazy(() => import("@/pages/ReportsDashboard"));
const DatabaseStatus = lazy(() => import("@/pages/DatabaseStatus"));
const HelpCenter = lazy(() => import("@/pages/HelpCenter"));
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
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const isLoading = useLoadingState();

  useEffect(() => {
    // Check server session to determine if user is authenticated
    // IMPORTANT: Do NOT auto-login from localStorage alone
    // Only respect server session to prevent stale client-side state

    async function checkServerSession() {
      try {
        // Check if this is a new browser session (browser was closed and reopened)
        const browserSessionId = sessionStorage.getItem('browserSessionId');
        const isNewBrowserSession = !browserSessionId;

        if (isNewBrowserSession) {
          // New browser session detected - generate new session ID and continue to validate server session
          const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          sessionStorage.setItem('browserSessionId', newSessionId);
          console.log('[App] New browser session detected. SessionID:', newSessionId);
          // Do NOT forcefully clear server session on a new browser session — just continue to check the server session
        }

        // Existing browser session - check if server session is still valid
        // Use JWT token from localStorage instead of cookies
        const token = localStorage.getItem('token');
        const { getApiBaseUrl } = await import('@/lib/api');
        const response = await fetch(`${getApiBaseUrl()}/api/session`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const data = await response.json();

        console.log('[App] Session check result:', data);

        if (data.authenticated) {
          // Server confirms user is authenticated
          setIsLoggedIn(true);

          if (data.userType === 'employee') {
            setIsEmployee(true);
            const normalizedSessionRole = (data.employeeRole || '').toLowerCase();
            setIsSuperadmin(normalizedSessionRole === 'superadmin');
            // Update localStorage with session data
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('employeeEmail', data.employeeEmail || '');
            localStorage.setItem('employeeId', data.employeeId || '');
            localStorage.setItem('employeeCode', data.employeeCode || '');
            localStorage.setItem('employeeRole', data.employeeRole || '');
            // Also set employeeName and user object so pages relying on `user` update immediately
            localStorage.setItem('employeeName', data.employeeName || '');
            // Persist reporting person flag so UI and pages can check it synchronously
            localStorage.setItem('isReportingPerson', data.isReportingPerson ? 'true' : 'false');
            try {
              const userObj = { email: data.employeeEmail || '', name: data.employeeName || '', role: data.employeeRole || '' };
              localStorage.setItem('user', JSON.stringify(userObj));
            } catch (e) {
              console.warn('[App] Failed to serialize user object to localStorage', e);
            }
            // Notify client components that login/session info is available
            try { window.dispatchEvent(new Event('login')); } catch (e) { /* ignore */ }
          } else if (data.userType === 'vendor') {
            setIsEmployee(false);
            setIsSuperadmin(false);
            // Update localStorage with session data
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('vendorId', data.vendorId || '');
            localStorage.setItem('vendorEmail', data.vendorEmail || '');
            localStorage.setItem('vendorName', data.vendorName || '');
            localStorage.setItem('vendorRole', data.vendorRole || '');
            try {
              const userObj = { email: data.vendorEmail || '', name: data.vendorName || '', role: data.vendorRole || '' };
              localStorage.setItem('user', JSON.stringify(userObj));
            } catch (e) {
              console.warn('[App] Failed to serialize vendor user object to localStorage', e);
            }
            try { window.dispatchEvent(new Event('login')); } catch (e) { /* ignore */ }
          }
        } else {
          // Server says not authenticated - clear ALL session data
          console.log('[App] Not authenticated - clearing session data');
          setIsLoggedIn(false);
          setIsEmployee(false);
          setIsSuperadmin(false);

          // Clear all session-related data but preserve Remember Me credentials and lastLoginType
          const rememberEmail = localStorage.getItem('rememberMe_email');
          const rememberPassword = localStorage.getItem('rememberMe_password');
          const vendorRememberEmail = localStorage.getItem('vendorRememberMe_email');
          const vendorRememberPassword = localStorage.getItem('vendorRememberMe_password');
          const lastLoginType = localStorage.getItem('lastLoginType');

          localStorage.clear();

          // Restore Remember Me credentials and lastLoginType if they existed
          if (rememberEmail) localStorage.setItem('rememberMe_email', rememberEmail);
          if (rememberPassword) localStorage.setItem('rememberMe_password', rememberPassword);
          if (vendorRememberEmail) localStorage.setItem('vendorRememberMe_email', vendorRememberEmail);
          if (vendorRememberPassword) localStorage.setItem('vendorRememberMe_password', vendorRememberPassword);
          if (lastLoginType) localStorage.setItem('lastLoginType', lastLoginType);

          // Don't auto-redirect - let the user see the login page they requested
        }
      } catch (error) {
        console.error('[App] Session check failed:', error);
        // On error, assume not logged in to be safe
        setIsLoggedIn(false);
        setIsEmployee(false);
        setIsSuperadmin(false);
      } finally {
        setLoading(false);
      }
    }

    checkServerSession();
  }, []); // Empty dependency array - only run on mount

  // Second useEffect for event listeners
  useEffect(() => {
    // Listen for logout events
    const handleLogout = () => {
      // Get user type BEFORE clearing data
      const employeeRole = localStorage.getItem('employeeRole');
      const employeeEmail = localStorage.getItem('employeeEmail');
      const vendorId = localStorage.getItem('vendorId');
      const employeeName = localStorage.getItem('employeeName');
      
      console.log('[App] ========== LOGOUT PROCESS ==========');
      console.log('[App] Logout triggered');
      console.log('[App] Role:', employeeRole);
      console.log('[App] Employee Email:', employeeEmail);
      console.log('[App] Vendor ID:', vendorId);
      console.log('[App] Time:', new Date().toLocaleString());
      
      // Determine redirect path BEFORE clearing data
      let redirectPath = '/login'; // Default
      const normalizedEmployeeRole = employeeRole ? employeeRole.toLowerCase() : '';

      // Check vendor first
      if (vendorId) {
        redirectPath = '/vendor-login';
        console.log('[App] REDIRECTING TO: /vendor-login (Vendor)');
      }
      // Check employee (including superadmin employees)
      else if (employeeEmail) {
        // All employees including superadmin go to employee login
        redirectPath = '/employee-login';
        console.log('[App] REDIRECTING TO: /employee-login (' + (normalizedEmployeeRole === 'superadmin' ? 'Superadmin' : 'Employee') + ')');
      }
      // Fallback: check if role exists (even if email is missing)
      else if (employeeRole) {
        redirectPath = '/employee-login';
        console.log('[App] REDIRECTING TO: /employee-login (Employee - fallback by role)');
      }
      
      console.log('[App] Final redirect path:', redirectPath);

      // Preserve Remember Me credentials, lastLoginType, and Quick Guide flag before clearing
      const rememberEmail = localStorage.getItem('rememberMe_email');
      const rememberPassword = localStorage.getItem('rememberMe_password');
      const vendorRememberEmail = localStorage.getItem('vendorRememberMe_email');
      const vendorRememberPassword = localStorage.getItem('vendorRememberMe_password');
      const lastLoginType = localStorage.getItem('lastLoginType');
      const seenQuickGuide = localStorage.getItem('seenQuickGuide');

      // Clear ALL session data from localStorage
      localStorage.clear();

      // Restore Remember Me credentials, lastLoginType, and Quick Guide flag if they existed
      if (rememberEmail) localStorage.setItem('rememberMe_email', rememberEmail);
      if (rememberPassword) localStorage.setItem('rememberMe_password', rememberPassword);
      if (vendorRememberEmail) localStorage.setItem('vendorRememberMe_email', vendorRememberEmail);
      if (vendorRememberPassword) localStorage.setItem('vendorRememberMe_password', vendorRememberPassword);
      if (lastLoginType) localStorage.setItem('lastLoginType', lastLoginType);
      if (seenQuickGuide) localStorage.setItem('seenQuickGuide', seenQuickGuide);

      // Clear session storage to prevent URL preservation after logout
      sessionStorage.clear();

      setIsLoggedIn(false);
      setIsEmployee(false);
      setIsSuperadmin(false);
      console.log('[App] Session data cleared. Remember Me credentials: PRESERVED');
      console.log('[App] ====================================');
      setRedirectTo(redirectPath);
    };

    // Listen for login events
    const handleLogin = () => {
      setIsLoggedIn(true);
      const employeeEmail = localStorage.getItem('employeeEmail');
      const employeeRole = localStorage.getItem('employeeRole');
      const normalizedRole = employeeRole ? employeeRole.toLowerCase() : '';
      setIsEmployee(!!employeeEmail);
      setIsSuperadmin(normalizedRole === 'superadmin');
      console.log('[App] Login event - isEmployee:', !!employeeEmail, 'isSuperadmin:', normalizedRole === 'superadmin');

      // Refresh reporting-person flag from server to ensure immediate UI availability
      (async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch('/api/session', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          if (res.ok) {
            const json = await res.json();
            localStorage.setItem('isReportingPerson', json.isReportingPerson ? 'true' : 'false');
          }
        } catch (e) {
          console.warn('[App] Failed to refresh session reporting flag', e);
        }
      })();
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

  // Redirect /login to /employee-login
  useEffect(() => {
    if (location === '/login' || location === '/login/') {
      console.log('[App] Redirecting /login to /employee-login');
      setLocation('/employee-login');
    }
  }, [location, setLocation]);

  // Handle redirects after logout
  useEffect(() => {
    if (redirectTo && !isLoggedIn) {
      console.log('[App] Executing redirect to:', redirectTo);
      setLocation(redirectTo);
      setRedirectTo(null);
    }
  }, [redirectTo, isLoggedIn, setLocation]);

  // If user isn't logged in and tries to access a protected route, redirect here.
  useEffect(() => {
    // Don't redirect while we're still checking the session
    if (loading) return;

    if (!isLoggedIn) {
      const isLoginPage = ['/login', '/vendor-login', '/employee-login', '/vendor-signup', '/vendor/forgot-password', '/employee/privacy-policy', '/vendor/privacy-policy'].includes(location);
      if (!isLoginPage && !redirectTo) {
        const lastLoginType = localStorage.getItem('lastLoginType');
        if (lastLoginType === 'employee') setRedirectTo('/employee-login');
        else if (lastLoginType === 'vendor') setRedirectTo('/vendor-login');
        else setRedirectTo('/login');
      }
    }
  }, [isLoggedIn, location, loading]); // Removed redirectTo from dependencies to prevent loop

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

    // Redirect logic is now handled in useEffect above to prevent infinite loops
    // DO NOT call setRedirectTo here during render

    return (
      <>
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/vendor-login" component={VendorLogin} />
          <Route path="/vendor-signup" component={VendorSignUp} />
          <Route path="/vendor/forgot-password" component={VendorForgotPassword} />
          <Route path="/employee-login" component={EmployeeLogin} />
          <Route path="/employee/privacy-policy" component={EmployeePrivacyPolicy} />
          <Route path="/vendor/privacy-policy" component={VendorPrivacyPolicy} />
          <Route component={EmployeeLogin} />
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
      <JoyrideTour />
      <Suspense fallback={<PageLoader />}>
        <Switch>
          {/* Login Routes */}
          <Route path="/login" component={Login} />
          <Route path="/vendor-login" component={VendorLogin} />
          <Route path="/vendor-signup" component={VendorSignUp} />
          <Route path="/vendor/forgot-password" component={VendorForgotPassword} />
          <Route path="/employee-login" component={EmployeeLogin} />
          
          {/* Privacy Policy Routes */}
          <Route path="/employee/privacy-policy" component={EmployeePrivacyPolicy} />
          <Route path="/vendor/privacy-policy" component={VendorPrivacyPolicy} />

          {/* Print Routes - No Layout */}
          <Route path="/vendor/po/print/:id" component={POPrint} />
        <Route path="/vendor/invoice/print/:id" component={InvoicePrint} />
          <Route path="/print-salary" component={PrintSalary} />
          
          {/* All other routes with Layout */}
          <Route>
            <Layout isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn}>
              <Suspense fallback={<PageLoader />}>
                <Switch>
                  {/* Dashboard Routes */}
                  <Route path="/employee/dashboard" component={EmployeeDashboard} />
                  <Route path="/">
                    {(() => {
                      const role = localStorage.getItem('employeeRole');
                      const vendorId = localStorage.getItem('vendorId');
                      const employeeEmail = localStorage.getItem('employeeEmail');
                      const normalizedRole = role ? role.toLowerCase() : '';

                      // Admin roles should go to admin dashboard
                      // Only superadmin goes to main dashboard
                      if (normalizedRole === 'superadmin') {
                        return <Dashboard />;
                      }
                      // Admin and regular employees go to employee dashboard
                      if (employeeEmail && !vendorId) {
                        return <EmployeeDashboard />;
                      }
                      // Vendors go to vendor dashboard
                      if (vendorId) {
                        return <VendorDashboard />;
                      }
                      // Default fallback
                      return <Dashboard />;
                    })()}
                  </Route>
                  
                  {/* Vendor Routes */}
                  <Route path="/vendor/dashboard">
                    <ProtectedRoute requiredUserType="vendor">
                      <VendorDashboard />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/vendor/profile">
                    <ProtectedRoute requiredUserType="vendor">
                      <VendorProfile />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/vendor/change-password">
                    <ProtectedRoute requiredUserType="vendor">
                      <VendorChangePassword />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/vendor/register">
                    <ProtectedRoute requiredUserType="vendor">
                      <VendorRegistration />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/vendor/list">
                    <ProtectedRoute requiredUserType="vendor">
                      <VendorList />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/vendor/edit/:id">
                    <ProtectedRoute requiredUserType="vendor">
                      <VendorEdit />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/vendor/credentials">
                    <ProtectedRoute requiredUserType="vendor">
                      <VendorCredentials />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/vendor/payment-master">
                    <ProtectedRoute requiredUserType="vendor">
                      <PaymentMaster />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/vendor/rates">
                    <ProtectedRoute requiredUserType="vendor">
                      <VendorRates />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/vendor/circle-master">
                    <ProtectedRoute requiredUserType="vendor">
                      <CircleMaster />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/vendor/sites">
                    <ProtectedRoute requiredUserType="vendor">
                      <SiteList />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/vendor/sites/status">
                    <ProtectedRoute requiredUserType="vendor">
                      <SiteStatus />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/vendor/export-headers">
                    <ProtectedRoute requiredUserType="admin">
                      <ExportHeaders />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/export-settings">
                    <ProtectedRoute requiredUserType="admin">
                      <ExportHeaders />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/vendor/site/register">
                    <ProtectedRoute requiredUserType="vendor">
                      <SiteRegistration />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/vendor/site/manage">
                    <ProtectedRoute requiredUserType="vendor">
                      <SiteManagement />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/vendor/site/edit/:id">
                    <ProtectedRoute requiredUserType="vendor">
                      <SiteEdit />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/vendor/excel-import">
                    <ProtectedRoute requiredUserType="vendor">
                      <ExcelImport />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/vendor/po">
                    <ProtectedRoute requiredUserType="vendor">
                      <POGeneration />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/vendor/invoices">
                    <ProtectedRoute requiredUserType="vendor">
                      <InvoiceGeneration />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/vendor/report-builder">
                    <ReportBuilder />
                  </Route>

                  {/* Vendor Report Routes */}
                  <Route path="/reports/vendor-po">
                    <ProtectedRoute requiredUserType="vendor">
                      <VendorPOReport />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/reports/vendor-invoice">
                    <ProtectedRoute requiredUserType="vendor">
                      <VendorInvoiceReport />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/reports/vendor-site">
                    <ProtectedRoute requiredUserType="vendor">
                      <VendorSiteReport />
                    </ProtectedRoute>
                  </Route>
                  
                  {/* Settings Route */}
                  <Route path="/settings" component={Settings} />
                  
                  {/* Employee Routes */}
                  <Route path="/employee/register">
                    <ProtectedRoute requiredUserType="employee">
                      <EmployeeRegistration />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/employee/edit/:id">
                    <ProtectedRoute requiredUserType="employee">
                      <EmployeeEdit />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/employee/list">
                    <ProtectedRoute requiredUserType="employee">
                      <EmployeeList />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/employee/credentials">
                    <ProtectedRoute requiredUserType="employee">
                      <EmployeeCredentials />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/employee/my-profile">
                    <ProtectedRoute requiredUserType="employee">
                      <MyProfile />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/employee/salary">
                    <ProtectedRoute requiredUserType="employee">
                      <EmployeeSalary />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/employee/salary-history">
                    <ProtectedRoute requiredUserType="employee">
                      <EmployeeSalaryHistory />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/employee/change-password">
                    <ProtectedRoute requiredUserType="employee">
                      <ChangePassword />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/employee/salary-report">
                    <ProtectedRoute requiredUserType="employee">
                      <SalaryReport />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/admin/salary-generation">
                    <ProtectedRoute requiredUserType="admin">
                      <SalaryGeneration />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/admin/salary-reports">
                    <ProtectedRoute requiredUserType="admin">
                      <SalaryReportsMonthly />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/employee/department-master">
                    <ProtectedRoute requiredUserType="admin">
                      <DepartmentMaster />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/employee/designation-master">
                    <ProtectedRoute requiredUserType="admin">
                      <DesignationMaster />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/employee/attendance">
                    <ProtectedRoute requiredUserType="employee">
                      <Attendance />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/employee/monthly-attendance">
                    <ProtectedRoute requiredUserType="admin">
                      <MonthlyAttendance />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/employee/leave-apply">
                    <ProtectedRoute requiredUserType="employee">
                      <LeaveApply />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/employee/leave-history">
                    <ProtectedRoute requiredUserType="employee">
                      <LeaveHistory />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/employee/leave-approvals">
                    <ProtectedRoute requiredUserType="admin">
                      <LeaveApprovals />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/admin/bulk-attendance">
                    <ProtectedRoute requiredUserType="admin">
                      <BulkAttendanceMarking />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/employee/allowances">
                    <ProtectedRoute requiredUserType="employee">
                      <Allowances />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/employee/salary-structure">
                    <ProtectedRoute requiredUserType="employee">
                      <SalaryStructure />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/employee/privacy-policy">
                    <EmployeePrivacyPolicy />
                  </Route>
                  
                  {/* Admin Routes */}
                  <Route path="/admin/teams">
                    <ProtectedRoute requiredUserType="admin">
                      <Teams />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/admin/allowance-approvals">
                    <ProtectedRoute requiredUserType="admin">
                      <AllowanceApproval />
                    </ProtectedRoute>
                  </Route>
                  {/* Allow reporting-person users to access the same page under a /user path */}
                  <Route path="/user/allowance-approvals">
                    <ProtectedRoute requiredUserType="employee">
                      <AllowanceApproval />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/admin/approval-history">
                    <ProtectedRoute requiredUserType="admin">
                      <ApprovalHistory />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/admin/holiday-master">
                    <ProtectedRoute requiredUserType="admin">
                      <HolidayMaster />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/admin/leave-allotment">
                    <ProtectedRoute requiredUserType="admin">
                      <LeaveAllotment />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/admin/attendance-report">
                    <ProtectedRoute requiredUserType="admin">
                      <AttendanceReport />
                    </ProtectedRoute>
                  </Route>
                  {/* Email Settings (Superadmin only) */}
                  <Route path="/admin/email-settings">
                    <ProtectedRoute requiredUserType="superadmin">
                      <EmailSettings />
                    </ProtectedRoute>
                  </Route>

                  {/* Vendor Privacy Policy */}
                  <Route path="/vendor/privacy-policy" component={VendorPrivacyPolicy} />
                  
                  {/* Reports */}
                  <Route path="/reports" component={ReportsDashboard} />

                                  {/* Help Center route disabled until documentation is reworked */}
                                  {/* <Route path="/help" component={HelpCenter} /> */}

                  {/* Database Status */}
                  <Route path="/database-status" component={DatabaseStatus} />

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
