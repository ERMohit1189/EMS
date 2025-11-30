import { useState, useEffect, useMemo } from 'react';
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
  Calendar,
  UsersRound
} from 'lucide-react';
import logo from '@assets/generated_images/abstract_geometric_logo_for_ems_portal.png';

interface SidebarProps {
  isLoggedIn?: boolean;
  setIsLoggedIn?: (value: boolean) => void;
}

const adminMenuGroups = [
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
      {
        title: 'Teams',
        icon: UsersRound,
        href: '/admin/teams',
      },
      {
        title: 'Allowance Approvals',
        icon: ClipboardCheck,
        href: '/admin/allowance-approvals',
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

const userEmployeeMenuGroups = [
  {
    group: 'Employee',
    items: [
      {
        title: 'My Profile',
        icon: Users,
        href: '/employee/my-profile',
      },
      {
        title: 'Salary Structure',
        icon: BarChart3,
        href: '/employee/salary',
      },
      {
        title: 'Attendance',
        icon: Calendar,
        href: '/employee/attendance',
      },
      {
        title: 'Allowances',
        icon: Wallet,
        href: '/employee/allowances',
      },
    ],
  },
  {
    group: 'Approvals',
    items: [
      {
        title: 'Allowance Approvals',
        icon: ClipboardCheck,
        href: '/admin/allowance-approvals',
      },
      {
        title: 'Approval History',
        icon: BarChart3,
        href: '/admin/approval-history',
      },
    ],
  },
  {
    group: 'Account',
    items: [
      {
        title: 'Change Password',
        icon: Key,
        href: '/employee/change-password',
      },
    ],
  },
];

export function Sidebar({ isLoggedIn, setIsLoggedIn }: SidebarProps) {
  const [location] = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  
  // Check if user is logged in as employee
  const isEmployee = typeof window !== 'undefined' && localStorage.getItem('employeeId') !== null;
  const employeeRole = typeof window !== 'undefined' ? localStorage.getItem('employeeRole') : null;
  const isUserEmployee = isEmployee && employeeRole === 'user';
  const isReportingPersonValue = typeof window !== 'undefined' ? localStorage.getItem('isReportingPerson') : null;
  const isReportingPerson = isReportingPersonValue === 'true';
  
  // Memoize menuGroups to prevent infinite loop
  const menuGroups = useMemo(() => {
    let groups = isUserEmployee ? userEmployeeMenuGroups : adminMenuGroups;
    
    // Filter out Approvals group if not a reporting person
    if (isUserEmployee && !isReportingPerson) {
      groups = groups.filter(group => group.group !== 'Approvals');
    }
    
    return groups;
  }, [isUserEmployee, isReportingPerson]);
  
  // Initialize expanded groups based on menu groups
  useEffect(() => {
    const initialExpandedGroups: Record<string, boolean> = {};
    menuGroups.forEach(group => {
      initialExpandedGroups[group.group] = true;
    });
    setExpandedGroups(initialExpandedGroups);
  }, [isUserEmployee, isReportingPerson]);

  // Auto-expand/collapse groups based on current route
  useEffect(() => {
    const getGroupForRoute = (route: string): string | null => {
      if (isUserEmployee) {
        // For user employees
        if (route.startsWith('/settings')) return 'Settings';
        if (route.startsWith('/admin/allowance-approvals') || route.startsWith('/admin/approval-history')) return 'Approvals';
        if (route.startsWith('/employee')) return 'Employee';
        return 'Employee';
      } else {
        // For admin
        if (route === '/') return 'Main';
        if (route.startsWith('/settings') || route.includes('export-headers')) return 'Settings';
        if (route.startsWith('/vendor/po') || route.startsWith('/vendor/invoices')) return 'Finance';
        if (route.startsWith('/employee') || route.startsWith('/admin/teams') || route.startsWith('/admin/allowance-approvals') || route.startsWith('/admin/approval-history')) return 'Employee Management';
        if (route.startsWith('/vendor')) {
          if (route.includes('credentials')) return 'Vendor Management';
          if (route.includes('sites') || route.includes('payment-master') || route.includes('excel-import')) return 'Site Operations';
          return 'Vendor Management';
        }
        return null;
      }
    };

    const activeGroup = getGroupForRoute(location);
    
    setExpandedGroups(prev => {
      const newExpandedGroups: Record<string, boolean> = {};
      menuGroups.forEach(group => {
        newExpandedGroups[group.group] = group.group === activeGroup;
      });
      return newExpandedGroups;
    });
  }, [location, isUserEmployee]);

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
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-green-500 hover:text-white cursor-pointer',
                    (location === '/employee/dashboard' || location === '/')
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-green-400 text-white shadow-sm'
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
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer',
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
