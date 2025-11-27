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
    title: 'Employees',
    icon: HardHat,
    href: '/employee/list',
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
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-sidebar-border p-4 space-y-2">
        <a href="https://replit.com" target="_blank" rel="noopener noreferrer">
          <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-blue-600 text-white transition-colors hover:bg-blue-700">
            <Upload className="h-4 w-4" />
            Publish
          </button>
        </a>
        <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
