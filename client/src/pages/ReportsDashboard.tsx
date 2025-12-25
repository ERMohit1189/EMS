import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { FileText, BarChart3, Users, DollarSign, MapPin, CheckCircle2, AlertCircle } from "lucide-react";

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  roles: string[];
  category: string;
}

const REPORTS: ReportCard[] = [
  // Vendor Reports
  {
    id: "vendor-po",
    title: "Purchase Orders",
    description: "View and manage all purchase orders with filtering by date and site",
    icon: <FileText className="w-8 h-8" />,
    path: "/reports/vendor-po",
    roles: ["vendor", "superadmin"],
    category: "Vendor Operations",
  },
  {
    id: "vendor-invoice",
    title: "Invoices",
    description: "Track invoice status, amounts, and payment details",
    icon: <DollarSign className="w-8 h-8" />,
    path: "/reports/vendor-invoice",
    roles: ["vendor", "superadmin"],
    category: "Financial",
  },
  {
    id: "vendor-site",
    title: "Site Performance",
    description: "Monitor site status, Physical/Soft AT completion, and vendor amounts",
    icon: <MapPin className="w-8 h-8" />,
    path: "/reports/vendor-site",
    roles: ["vendor", "superadmin"],
    category: "Operations",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  "Vendor Operations": "bg-blue-100 text-blue-800",
  "Financial": "bg-green-100 text-green-800",
  "Operations": "bg-purple-100 text-purple-800",
  "HR & Payroll": "bg-orange-100 text-orange-800",
  "Compliance": "bg-red-100 text-red-800",
};

export default function ReportsDashboard() {
  const [, setLocation] = useLocation();

  // Get user role from localStorage
  const employeeRole = localStorage.getItem("employeeRole")?.toLowerCase() || "user";
  const vendorId = localStorage.getItem("vendorId");
  const userRole = vendorId ? "vendor" : (employeeRole === "superadmin" || employeeRole === "admin" ? "superadmin" : "employee");

  // Filter reports based on user role
  const availableReports = REPORTS.filter((report) =>
    report.roles.includes(userRole)
  );

  // Group reports by category
  const reportsByCategory = availableReports.reduce((acc, report) => {
    if (!acc[report.category]) {
      acc[report.category] = [];
    }
    acc[report.category].push(report);
    return acc;
  }, {} as Record<string, ReportCard[]>);

  const handleReportClick = (path: string) => {
    setLocation(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Reports Dashboard</h1>
          <p className="text-slate-600">
            Access and analyze business data with comprehensive reports
          </p>
        </div>

        {/* User Role Badge */}
        <div className="mb-6 flex items-center gap-2">
          <span className="text-sm text-slate-600">Role:</span>
          <Badge variant="secondary" className="capitalize">
            {userRole}
          </Badge>
        </div>

        {/* Reports by Category */}
        {Object.keys(reportsByCategory).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(reportsByCategory).map(([category, reports]) => (
              <div key={category}>
                <div className="mb-4">
                  <h2 className="text-2xl font-semibold text-slate-800">{category}</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {reports.length} {reports.length === 1 ? "report" : "reports"} available
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reports.map((report) => (
                    <Card
                      key={report.id}
                      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105"
                      onClick={() => handleReportClick(report.path)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{report.title}</CardTitle>
                            <CardDescription className="mt-2">
                              {report.description}
                            </CardDescription>
                          </div>
                          <div className="text-slate-400 flex-shrink-0">
                            {report.icon}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <Badge className={CATEGORY_COLORS[report.category] || "bg-gray-100 text-gray-800"}>
                            {report.category}
                          </Badge>
                          <span className="text-sm text-slate-500">
                            <CheckCircle2 className="w-4 h-4 inline mr-1" />
                            Available
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-12 h-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Reports Available</h3>
              <p className="text-slate-600 text-center max-w-md">
                Your user role ({userRole}) doesn't have access to any reports yet. Please contact your administrator if you believe this is incorrect.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="mt-12 bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">About Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Export Options</h4>
              <p className="text-sm text-slate-600">
                Export data to Excel, PDF, or other formats for further analysis
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Real-time Data</h4>
              <p className="text-sm text-slate-600">
                All reports display current data from the system database
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Filtering & Sorting</h4>
              <p className="text-sm text-slate-600">
                Filter and sort reports by various criteria for better insights
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
