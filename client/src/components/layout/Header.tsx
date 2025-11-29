import { Bell, Search, User, Settings, Menu } from 'lucide-react';
import { useLocation } from 'wouter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QuickAccessMenu } from './Navigation';

interface HeaderProps {
  onMenuClick?: () => void;
  sidebarOpen?: boolean;
}

export function Header({ onMenuClick, sidebarOpen }: HeaderProps) {
  const [, setLocation] = useLocation();
  const employeeName = localStorage.getItem('employeeName') || localStorage.getItem('vendorName') || 'User';

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    localStorage.removeItem('employeeEmail');
    localStorage.removeItem('employeeName');
    localStorage.removeItem('employeeId');
    localStorage.removeItem('vendorName');
    window.dispatchEvent(new Event('logout'));
    setLocation('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center gap-2 md:gap-4 border-b bg-gradient-to-r from-white to-blue-50 px-3 md:px-6 shadow-md">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
        data-testid="button-mobile-menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex flex-1 items-center gap-2 md:gap-4">
        <div className="relative w-full max-w-md hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-full bg-muted pl-9 md:w-[300px] lg:w-[400px] text-sm"
            data-testid="input-search"
          />
        </div>
      </div>

      <div className="hidden md:block">
        <QuickAccessMenu />
      </div>
      
      <div className="flex items-center gap-1 md:gap-2 md:border-l md:pl-4">
        <Button variant="ghost" size="icon" className="relative h-9 w-9 md:h-10 md:w-10" data-testid="button-notifications">
          <Bell className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive"></span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/settings')}
          className="h-9 w-9 md:h-10 md:w-10"
          data-testid="button-settings"
        >
          <Settings className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 md:h-10 md:w-10" data-testid="button-user-menu">
              <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                {employeeName.charAt(0).toUpperCase()}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel data-testid="text-account-label" className="text-sm">{employeeName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setLocation('/settings')} data-testid="menu-item-settings" className="text-sm">
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive text-sm" onClick={handleLogout} data-testid="menu-item-logout">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
