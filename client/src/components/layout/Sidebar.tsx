import { useState } from 'react';
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
  Settings as SettingsIcon,
  LogOut,
  Upload,
  Key,
  ChevronDown,
  Calendar
} from 'lucide-react';
import logo from '@assets/generated_images/abstract_geometric_logo_for_ems_portal.png';

interface SidebarProps {
  isLoggedIn?: boolean;
  setIsLoggedIn?: (value: boolean) => void;
}

const menuGroups = [
  {
    group: 'Main',
    items: [
      {
        title: 'Dashboard',
        icon: LayoutDashboard,
        href: '/',
      },
    ],
  },
  {
    group: 'Vendor Management',
    items: [
      {
        title: 'All Vendors',
        icon: Users,
        href: '/vendor/list',
      },
      {
        title: 'Vendor Credentials',
        icon: Key,
        href: '/vendor/credentials',
      },
    ],
  },
  {
    group: 'Employee Management',
    items: [
      {
        title: 'Attendance',
        icon: Calendar,
        href: '/employee/attendance',
      },
      {
        title: 'All Employees',
        icon: HardHat,
        href: '/employee/list',
      },
      {
        title: 'Register Employee',
        icon: Users,
        href: '/employee/register',
      },
      {
        title: 'Employee Credentials',
        icon: Key,
        href: '/employee/credentials',
      },
      {
        title: 'Salary Structure',
        icon: BarChart3,
        href: '/employee/salary',
      },
      {
        title: 'Salary Report',
        icon: BarChart3,
        href: '/employee/salary-report',
      },
      {
        title: 'Department Master',
        icon: Building2,
        href: '/employee/department-master',
      },
      {
        title: 'Designation Master',
        icon: FileText,
        href: '/employee/designation-master',
      },
    ],
  },
  {
    group: 'Site Operations',
    items: [
      {
        title: 'Excel Upload',
        icon: Upload,
        href: '/vendor/excel-import',
      },
      {
        title: 'Site Management',
        icon: Building2,
        href: '/vendor/sites',
      },
      {
        title: 'Payment Master',
        icon: Wallet,
        href: '/vendor/payment-master',
      },
      {
        title: 'Site Status',
        icon: ClipboardCheck,
        href: '/vendor/sites/status',
      },
    ],
  },
  {
    group: 'Finance',
    items: [
      {
        title: 'PO Generation',
        icon: FileText,
        href: '/vendor/po',
      },
      {
        title: 'Invoice Generation',
        icon: FileText,
        href: '/vendor/invoices',
      },
    ],
  },
  {
    group: 'Settings',
    items: [
      {
        title: 'App Settings',
        icon: SettingsIcon,
        href: '/settings',
      },
      {
        title: 'Export Settings',
        icon: SettingsIcon,
        href: '/vendor/export-headers',
      },
    ],
  },
];

export function Sidebar({ isLoggedIn, setIsLoggedIn }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Main: true,
    'Vendor Management': false,
    'Employee Management': true,
    'Site Operations': false,
    Finance: false,
    Settings: false,
  });
  
  // Check if user is logged in as employee
  const isEmployee = typeof window !== 'undefined' && localStorage.getItem('employeeId') !== null;

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const handleLogout = () => {
    console.log('[Sidebar] Logout clicked');
    // Dispatch logout event to App component
    window.dispatchEvent(new Event('logout'));
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <img src={logo} alt="EMS Logo" className="h-8 w-8 rounded-sm" />
        <span className="text-lg font-bold tracking-tight">EMS Portal</span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-2 px-2">
          {/* Employee Dashboard Link - Only for Logged In Employees */}
          {isEmployee && (
            <div className="mb-4 pb-4 border-b border-sidebar-border">
              <Link href="/employee/dashboard">
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    (location === '/employee/dashboard' || location === '/')
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'text-sidebar-foreground/70 bg-green-50'
                  )}
                  data-testid="link-employee-dashboard"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  My Dashboard
                </div>
              </Link>
            </div>
          )}
          
          {menuGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              <button
                onClick={() => toggleGroup(group.group)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider hover:text-sidebar-foreground/90 transition-colors"
              >
                <span>{group.group}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    expandedGroups[group.group] ? 'rotate-0' : '-rotate-90'
                  )}
                />
              </button>
              {expandedGroups[group.group] && (
                <div className="grid gap-1 mt-1">
                  {group.items.map((item, itemIndex) => (
                    <Link key={itemIndex} href={item.href}>
                      <div
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                          location === item.href
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                            : 'text-sidebar-foreground/70'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.title}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-sidebar-border p-4 space-y-2">
      </div>
    </div>
  );
}
