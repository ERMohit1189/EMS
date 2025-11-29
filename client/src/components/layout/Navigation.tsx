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
    <nav className="flex items-center gap-2 px-6 py-3 bg-muted/30 border-b text-sm">
      <a href="/" className="text-muted-foreground hover:text-foreground transition-colors">
        <Home className="h-4 w-4" />
      </a>
      {breadcrumbs.slice(1).map((crumb, index) => (
        <div key={crumb.href} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <a
            href={crumb.href}
            className={cn(
              "transition-colors",
              index === breadcrumbs.length - 2
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
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
  
  // Determine role based on location
  const isEmployee = location.includes('/employee') || localStorage.getItem('employeeEmail');
  const isVendor = location.includes('/vendor');
  
  const employeeQuickLinks = [
    { label: 'Attendance', href: '/employee/attendance' },
    { label: 'Salary', href: '/employee/salary-report' },
    { label: 'Dashboard', href: '/employee/dashboard' },
  ];
  
  const vendorQuickLinks = [
    { label: 'Sites', href: '/vendor/list' },
    { label: 'Site Status', href: '/vendor/sites/status' },
    { label: 'PO Generation', href: '/vendor/po' },
  ];
  
  const adminQuickLinks = [
    { label: 'Dashboard', href: '/' },
    { label: 'Employees', href: '/employee/list' },
    { label: 'Vendors', href: '/vendor/list' },
  ];
  
  const quickLinks = isEmployee ? employeeQuickLinks : isVendor ? vendorQuickLinks : adminQuickLinks;
  
  return (
    <div className="hidden lg:flex items-center gap-1 px-6">
      {quickLinks.map((link, index) => (
        <div key={link.href} className="flex items-center gap-1">
          <a
            href={link.href}
            className={cn(
              "px-3 py-2 rounded-md text-sm font-medium transition-colors",
              location === link.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            data-testid={`link-quickaccess-${link.label.toLowerCase()}`}
          >
            {link.label}
          </a>
          {index < quickLinks.length - 1 && <span className="text-muted-foreground">•</span>}
        </div>
      ))}
    </div>
  );
}
