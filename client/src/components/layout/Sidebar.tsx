import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  HardHat,
  Wallet,
  ClipboardCheck,
  BarChart3,
  Settings,
  LogOut,
  Upload
} from 'lucide-react';
import logo from '@assets/generated_images/abstract_geometric_logo_for_ems_portal.png';

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/',
  },
  {
    title: 'Vendor Management',
    icon: Users,
    submenu: [
      { title: 'Registration', href: '/vendor/register' },
      { title: 'All Vendors', href: '/vendor/list' },
      { title: 'Site Management', href: '/vendor/sites' },
      { title: 'Excel Import', href: '/vendor/excel-import' },
      { title: 'Payment Master', href: '/vendor/payment-master' },
      { title: 'Circle Master', href: '/vendor/circle-master' },
      { title: 'PO Generation', href: '/vendor/po' },
      { title: 'Invoices', href: '/vendor/invoices' },
    ],
  },
  {
    title: 'Employee Management',
    icon: HardHat,
    submenu: [
      { title: 'Registration', href: '/employee/register' },
      { title: 'All Employees', href: '/employee/list' },
      { title: 'Salary Structure', href: '/employee/salary' },
      { title: 'Attendance', href: '/employee/attendance' },
      { title: 'Allowances', href: '/employee/allowances' },
    ],
  },
  {
    title: 'Reports',
    icon: BarChart3,
    href: '/reports',
  },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <img src={logo} alt="EMS Logo" className="h-8 w-8 rounded-sm" />
        <span className="text-lg font-bold tracking-tight">EMS Portal</span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="grid gap-1 px-2">
          {menuItems.map((item, index) => (
            <div key={index} className="mb-1">
              {item.submenu ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70">
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </div>
                  <div className="ml-4 space-y-1 border-l border-sidebar-border pl-2">
                    {item.submenu.map((subItem) => (
                      <Link key={subItem.href} href={subItem.href}>
                        <a
                          className={cn(
                            'block rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                            location === subItem.href
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                              : 'text-sidebar-foreground/60'
                          )}
                        >
                          {subItem.title}
                        </a>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link href={item.href}>
                  <a
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      location === item.href
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </a>
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-sidebar-border p-4">
        <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
