import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { ProgressBar } from "@/components/ProgressBar";
import { Loader } from "@/components/Loader";
import { useLoadingState } from "@/hooks/useLoadingState";
import { Layout } from "@/components/layout/Layout";
import { useEffect, useState } from "react";
import { getStoredApiUrl } from "@/lib/api";
import Login from "@/pages/Login";
import VendorLogin from "@/pages/VendorLogin";
import EmployeeLogin from "@/pages/EmployeeLogin";
import Dashboard from "@/pages/Dashboard";
import ApiConfig from "@/pages/ApiConfig";
import VendorRegistration from "@/pages/vendor/VendorRegistration";
import VendorList from "@/pages/vendor/VendorList";
import VendorEdit from "@/pages/vendor/VendorEdit";
import VendorCredentials from "@/pages/vendor/VendorCredentials";
import PaymentMaster from "@/pages/vendor/PaymentMaster";
import CircleMaster from "@/pages/vendor/CircleMaster";
import POGeneration from "@/pages/vendor/POGeneration";
import POPrint from "@/pages/vendor/POPrint";
import InvoiceGeneration from "@/pages/vendor/InvoiceGeneration";
import EmployeeRegistration from "@/pages/employee/EmployeeRegistration";
import EmployeeEdit from "@/pages/employee/EmployeeEdit";
import EmployeeList from "@/pages/employee/EmployeeList";
import EmployeeCredentials from "@/pages/employee/EmployeeCredentials";
import EmployeePrivacyPolicy from "@/pages/employee/PrivacyPolicy";
import VendorPrivacyPolicy from "@/pages/vendor/PrivacyPolicy";
import SiteRegistration from "@/pages/vendor/SiteRegistration";
import SiteList from "@/pages/vendor/SiteList";
import SiteEdit from "@/pages/vendor/SiteEdit";
import SiteStatus from "@/pages/vendor/SiteStatus";
import SiteManagement from "@/pages/vendor/SiteManagement";
import ExcelImport from "@/pages/vendor/ExcelImport";
import SalaryStructure from "@/pages/employee/SalaryStructure";
import DepartmentMaster from "@/pages/employee/DepartmentMaster";
import DesignationMaster from "@/pages/employee/DesignationMaster";
import ExportHeaders from "@/pages/vendor/ExportHeaders";
import Settings from "@/pages/Settings";
import EmployeeDashboard from "@/pages/EmployeeDashboard";
import NotFound from "@/pages/not-found";

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
  const isLoading = useLoadingState();

  useEffect(() => {
    // Check if user is logged in
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loggedIn);
    
    // Check if user is an employee (has employeeEmail in localStorage)
    const employeeEmail = localStorage.getItem('employeeEmail');
    setIsEmployee(!!employeeEmail);
    
    // If employee is on root path, redirect to employee dashboard
    if (loggedIn && !!employeeEmail && location === '/') {
      setLocation('/employee/dashboard');
    }
    
    console.log('[App] Login check - isLoggedIn:', loggedIn, 'isEmployee:', !!employeeEmail);
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
      // NOTE: NOT clearing rememberMe_email and rememberMe_password - they stay saved
      
      setIsLoggedIn(false);
      setIsEmployee(false);
      console.log('[App] Session data cleared. Remember Me credentials: PRESERVED');
      
      // Redirect to appropriate login page based on what we determined earlier
      if (isEmployeeLogout) {
        console.log('[App] REDIRECTING TO: /employee-login');
        console.log('[App] ====================================');
        setLocation('/employee-login');
      } else {
        console.log('[App] REDIRECTING TO: /login');
        console.log('[App] ====================================');
        setLocation('/login');
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

  // Show loading while checking auth
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // If on Plesk (not localhost) and no API URL configured, show config page
  const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  if (isProduction && !getStoredApiUrl() && location !== '/api-config' && location !== '/login') {
    return (
      <>
        <Switch>
          <Route path="/api-config" component={ApiConfig} />
          <Route component={ApiConfig} />
        </Switch>
        <Toaster />
      </>
    );
  }

  // If not logged in and not on login page, redirect to login
  if (!isLoggedIn && location !== '/login' && location !== '/api-config' && location !== '/employee/privacy-policy' && location !== '/vendor/privacy-policy') {
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
              <Route path="/employee/salary" component={SalaryStructure} />
              <Route path="/employee/department-master" component={DepartmentMaster} />
              <Route path="/employee/designation-master" component={DesignationMaster} />
              <Route path="/employee/attendance" component={() => <Placeholder title="Attendance" />} />
              <Route path="/employee/allowances" component={() => <Placeholder title="Allowances" />} />
              <Route path="/employee/privacy-policy" component={EmployeePrivacyPolicy} />
              
              {/* Vendor Privacy Policy */}
              <Route path="/vendor/privacy-policy" component={VendorPrivacyPolicy} />
              
              {/* Reports */}
              <Route path="/reports" component={() => <Placeholder title="Reports" />} />
              
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </Route>
      </Switch>
      <Toaster />
    </>
  );
}

export default App;
