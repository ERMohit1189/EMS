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

interface SidebarProps {
  isLoggedIn?: boolean;
  setIsLoggedIn?: (value: boolean) => void;
}

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/',
  },
  {
    title: 'All Vendors',
    icon: Users,
    href: '/vendor/list',
  },
  {
    title: 'Site Management',
    icon: Building2,
    href: '/vendor/sites',
  },
  {
    title: 'Site Status',
    icon: ClipboardCheck,
    href: '/vendor/sites/status',
  },
  {
    title: 'Excel Upload',
    icon: Upload,
    href: '/vendor/excel-import',
  },
  {
    title: 'Payment Master',
    icon: Wallet,
    href: '/vendor/payment-master',
  },
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
];

export function Sidebar({ isLoggedIn, setIsLoggedIn }: SidebarProps) {
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    setIsLoggedIn?.(false);
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
        <nav className="grid gap-1 px-2">
          {menuItems.map((item, index) => (
            <Link key={index} href={item.href}>
              <div
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  location === item.href
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </div>
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-sidebar-border p-4 space-y-2">
      </div>
    </div>
  );
}
