import { useLocation } from 'wouter';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Breadcrumb() {
  const [location] = useLocation();
  
  // Parse location into breadcrumb segments
  const segments = location.split('/').filter(Boolean);
  
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    ...segments.map((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/');
      const label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return { label, href };
    }),
  ];

  return (
    <nav className="flex items-center gap-1 md:gap-2 px-2 md:px-6 py-2 md:py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 text-xs md:text-sm font-medium overflow-x-auto" data-testid="nav-breadcrumb">
      <a href="/" className="text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 whitespace-nowrap flex-shrink-0">
        <Home className="h-3 md:h-4 w-3 md:w-4 flex-shrink-0" />
        <span className="hidden sm:inline">Home</span>
      </a>
      {breadcrumbs.slice(1).map((crumb, index) => (
        <div key={crumb.href} className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          <ChevronRight className="h-3 md:h-4 w-3 md:w-4 text-blue-400 flex-shrink-0" />
          <a
            href={crumb.href}
            className={cn(
              "transition-colors py-1 px-1 md:px-2 rounded whitespace-nowrap text-xs md:text-sm",
              index === breadcrumbs.length - 2
                ? "text-blue-900 font-semibold bg-white/50"
                : "text-blue-600 hover:text-blue-700 hover:bg-white/30"
            )}
            data-testid={`breadcrumb-${crumb.label.toLowerCase()}`}
          >
            {crumb.label}
          </a>
        </div>
      ))}
    </nav>
  );
}

export function QuickAccessMenu() {
  const [location] = useLocation();
  
  // Determine role based on location and localStorage
  const isEmployee = localStorage.getItem('employeeEmail') !== null;
  const employeeRole = (localStorage.getItem('employeeRole') || '').toLowerCase().trim();
  const isSuperAdmin = isEmployee && employeeRole === 'superadmin';
  const isVendor = localStorage.getItem('vendorId') !== null;
  
  const employeeQuickLinks = [
    { label: '📋 Attendance', href: '/employee/attendance' },
    { label: '📅 Monthly Attendance', href: '/employee/monthly-attendance' },
    { label: '💰 Salary', href: '/employee/salary-report' },
    { label: '🏠 Dashboard', href: '/employee/dashboard' },
  ];
  
  const vendorQuickLinks = [
    { label: '🏠 Dashboard', href: '/vendor/dashboard' },
    { label: '📄 PO Generation', href: '/vendor/po' },
    { label: '🧾 Invoice Generation', href: '/vendor/invoices' },
  ];
  
  const adminQuickLinks = [
    { label: '🏠 Dashboard', href: '/' },
    { label: '👥 Employees', href: '/employee/list' },
    { label: '📅 Bulk Attendance', href: '/admin/bulk-attendance' },
    { label: '🏪 Vendors', href: '/vendor/list' },
  ];
  
  const quickLinks = isEmployee
    ? (isSuperAdmin ? employeeQuickLinks.filter(l => l.href !== '/employee/dashboard') : employeeQuickLinks)
    : isVendor
    ? vendorQuickLinks
    : adminQuickLinks;
  
  return (
    <div className="hidden md:flex items-center gap-0.5 px-3 py-2 bg-white/50 rounded-lg border border-blue-100" data-testid="nav-quick-access">
      {quickLinks.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className={cn(
            "px-3 py-2 rounded-md text-sm font-medium transition-all",
            location === link.href
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-700 hover:bg-blue-100 hover:text-blue-900"
          )}
          data-testid={`link-quickaccess-${link.label.toLowerCase()}`}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
