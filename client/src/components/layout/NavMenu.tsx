import { useState } from 'react';
import { useLocation } from 'wouter';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MenuItem {
  title: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string;
  submenu?: MenuItem[];
}

interface NavMenuProps {
  items: MenuItem[];
  title?: string;
}

export function NavMenu({ items, title }: NavMenuProps) {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev =>
      prev.includes(title)
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  const menuContent = (
    <nav className="space-y-2">
      {items.map((item) => {
        const isActive = location === item.href;
        const isExpanded = expandedItems.includes(item.title);
        const hasSubmenu = item.submenu && item.submenu.length > 0;

        return (
          <div key={item.title}>
            <div
              className={cn(
                'flex items-center justify-between px-4 py-2 rounded-lg cursor-pointer transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'hover:bg-muted text-foreground'
              )}
              onClick={() => {
                if (hasSubmenu) {
                  toggleExpanded(item.title);
                } else {
                  setLocation(item.href);
                }
              }}
              data-testid={`navmenu-item-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="flex items-center gap-3 flex-1">
                {item.icon && <span className="h-5 w-5">{item.icon}</span>}
                <span>{item.title}</span>
                {item.badge && (
                  <span className="ml-auto text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </div>
              {hasSubmenu && (
                <span
                  className={cn(
                    'transition-transform',
                    isExpanded ? 'rotate-180' : ''
                  )}
                >
                  ▼
                </span>
              )}
            </div>

            {hasSubmenu && isExpanded && (
              <div className="ml-4 space-y-1 border-l-2 border-muted pl-2 mt-1">
                {item.submenu!.map((subitem) => (
                  <div
                    key={subitem.title}
                    onClick={() => setLocation(subitem.href)}
                    className={cn(
                      'px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm',
                      location === subitem.href
                        ? 'bg-primary/20 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                    data-testid={`navmenu-subitem-${subitem.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {subitem.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile menu */}
      <div className="lg:hidden">
        <Button variant="ghost" size="icon" data-testid="button-open-mobile-menu">
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {/* Desktop menu - typically used as dropdown or in sidebar */}
      <div className="hidden lg:block">{menuContent}</div>
    </>
  );
}

export function CompactNavMenu({ items }: NavMenuProps) {
  const [, setLocation] = useLocation();
  const [location] = useLocation();

  return (
    <nav className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Button
          key={item.title}
          variant={location === item.href ? 'default' : 'outline'}
          size="sm"
          onClick={() => setLocation(item.href)}
          className="gap-2"
          data-testid={`button-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {item.icon}
          {item.title}
          {item.badge && (
            <span className="ml-1 text-xs font-semibold">{item.badge}</span>
          )}
        </Button>
      ))}
    </nav>
  );
}
