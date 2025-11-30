import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Briefcase, Activity, Calendar, DollarSign, Mail, Zap, Shield } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { performanceMonitor } from '@/lib/performanceMonitor';

export default function EmployeeDashboard() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [perfMetrics, setPerfMetrics] = useState<any>(null);
  const employeeRole = localStorage.getItem('employeeRole');
  const isUserEmployee = employeeRole === 'user';

  useEffect(() => {
    // Load user profile
    const employeeId = localStorage.getItem('employeeId');
    const employeeName = localStorage.getItem('employeeName');
    const employeeEmail = localStorage.getItem('employeeEmail');
    const employeeDepartment = localStorage.getItem('employeeDepartment');
    const employeeDesignation = localStorage.getItem('employeeDesignation');

    if (employeeId) {
      setUserProfile({
        id: employeeId,
        name: employeeName,
        email: employeeEmail,
        department: employeeDepartment || 'Not Assigned',
        designation: employeeDesignation || 'Not Specified',
      });
    }
    
    // Capture performance metrics immediately on next tick
    setTimeout(() => {
      try {
        const metrics = performanceMonitor.getMetrics();
        const assessment = performanceMonitor.getAssessment(metrics);
        setPerfMetrics({ metrics, assessment });
      } catch (e) {
        console.error('Error capturing metrics:', e);
      }
    }, 0);
  }, []);

  // User role employees see restricted menu
  const menuItems = isUserEmployee ? [
    { title: 'My Profile', icon: User, href: '/employee/my-profile', color: 'text-blue-500' },
    { title: 'Salary Structure', icon: DollarSign, href: '/employee/salary', color: 'text-emerald-500' },
    { title: 'Attendance', icon: Calendar, href: '/employee/attendance', color: 'text-orange-500' },
    { title: 'Allowances', icon: Activity, href: '/employee/allowances', color: 'text-purple-500' },
  ] : [
    { title: 'My Profile', icon: User, href: '/employee/list', color: 'text-blue-500' },
    { title: 'Salary Structure', icon: DollarSign, href: '/employee/salary', color: 'text-emerald-500' },
    { title: 'Attendance', icon: Calendar, href: '/employee/attendance', color: 'text-orange-500' },
    { title: 'Allowances', icon: Activity, href: '/employee/allowances', color: 'text-purple-500' },
    { title: 'Settings', icon: Briefcase, href: '/settings', color: 'text-indigo-500' },
  ];

  const perfCard = useMemo(() => {
    if (!perfMetrics) return null;
    const { metrics, assessment } = perfMetrics;
    if (assessment.score === 'Fair' || assessment.score === 'Excellent' || assessment.score === 'Good') return null;
    return (
      <Card className="border-l-4 border-l-blue-600 shadow-md bg-gradient-to-r from-blue-50 to-cyan-50" data-testid="card-performance-metrics">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center bg-opacity-10 ${assessment.color}`}>
                  <Zap className={`h-6 w-6 ${assessment.color}`} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Page Load Performance</h3>
                  <p className={`text-sm font-semibold ${assessment.color}`}>{assessment.score}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-4">{assessment.message}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-slate-600">Total Load Time</p>
                  <p className="text-lg font-bold text-slate-900" data-testid="metric-page-load-time">{metrics.pageLoadTime}ms</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-slate-600">DOM Interactive</p>
                  <p className="text-lg font-bold text-slate-900">{metrics.domInteractive}ms</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-slate-600">Resources Loaded</p>
                  <p className="text-lg font-bold text-slate-900">{metrics.resourceCount}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-slate-600">Total Size</p>
                  <p className="text-lg font-bold text-slate-900">{metrics.totalResourceSize}KB</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }, [perfMetrics]);

  return (
    <div className="space-y-6 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-lg p-6">
      {/* Performance Metrics Card */}
      {perfCard}

      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg p-8 text-white shadow-lg">
        <div>
          <h2 className="text-4xl font-bold tracking-tight mb-2">Welcome to Employee Portal</h2>
          <p className="text-green-100">Manage your employee information and documents</p>
        </div>
      </div>

      {/* User Profile Card */}
      {userProfile && (
        <Card className="border-l-4 border-l-green-600 shadow-md bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-green-600/20 flex items-center justify-center">
                    <User className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900" data-testid="text-employee-name">{userProfile.name}</h3>
                    <p className="text-sm text-slate-600">{userProfile.designation}</p>
                  </div>
                </div>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-600">Email</p>
                      <p className="text-sm font-medium text-slate-900" data-testid="text-employee-email">{userProfile.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-600">Department</p>
                      <p className="text-sm font-medium text-slate-900">{userProfile.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-600">Role</p>
                      <Badge variant="default" className={`text-xs ${employeeRole === 'admin' ? 'bg-purple-600' : 'bg-blue-600'}`} data-testid="badge-employee-role">
                        {employeeRole?.toUpperCase() || 'USER'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-600">Status</p>
                      <Badge variant="default" className="text-xs bg-green-600">
                        Active
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {menuItems.map((item) => (
          <Link key={item.title} href={item.href}>
            <Card className="hover:shadow-xl hover:border-green-600 cursor-pointer transition-all duration-300 h-full border-t-4 border-t-transparent hover:border-t-green-600">
              <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${item.color} bg-opacity-10`}>
                  <item.icon className={`h-6 w-6 ${item.color}`} />
                </div>
                <h3 className="font-semibold text-slate-900 text-sm">{item.title}</h3>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Important Links Card - Only for non-user employees */}
      {!isUserEmployee && (
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-lg">
            <CardTitle className="text-lg">Important Information</CardTitle>
            <CardDescription>Quick access to important documents and policies</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Link href="/employee/privacy-policy">
                <div className="p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                  <h4 className="font-semibold text-slate-900 mb-1">Privacy Policy</h4>
                  <p className="text-sm text-slate-600">Read our privacy policy and data protection practices</p>
                </div>
              </Link>
              <Link href="/settings">
                <div className="p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                  <h4 className="font-semibold text-slate-900 mb-1">Settings</h4>
                  <p className="text-sm text-slate-600">Manage your account preferences and contact details</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
