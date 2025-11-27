import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import VendorRegistration from "@/pages/vendor/VendorRegistration";
import VendorList from "@/pages/vendor/VendorList";
import EmployeeRegistration from "@/pages/employee/EmployeeRegistration";
import EmployeeList from "@/pages/employee/EmployeeList";
import SiteRegistration from "@/pages/vendor/SiteRegistration";
import SalaryStructure from "@/pages/employee/SalaryStructure";
import NotFound from "@/pages/not-found";

const Placeholder = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
    <h2 className="text-2xl font-bold mb-2">{title}</h2>
    <p>This module is under construction.</p>
  </div>
);

function App() {
  return (
    <>
      <Layout>
        <Switch>
          <Route path="/" component={Dashboard} />
          
          {/* Vendor Routes */}
          <Route path="/vendor/register" component={VendorRegistration} />
          <Route path="/vendor/list" component={VendorList} />
          <Route path="/vendor/sites" component={SiteRegistration} />
          <Route path="/vendor/po" component={() => <Placeholder title="PO Generation" />} />
          <Route path="/vendor/invoices" component={() => <Placeholder title="Invoice Generation" />} />
          
          {/* Employee Routes */}
          <Route path="/employee/register" component={EmployeeRegistration} />
          <Route path="/employee/list" component={EmployeeList} />
          <Route path="/employee/salary" component={SalaryStructure} />
          <Route path="/employee/attendance" component={() => <Placeholder title="Attendance" />} />
          <Route path="/employee/allowances" component={() => <Placeholder title="Allowances" />} />
          
          {/* Reports */}
          <Route path="/reports" component={() => <Placeholder title="Reports" />} />
          
          <Route component={NotFound} />
        </Switch>
      </Layout>
      <Toaster />
    </>
  );
}

export default App;
