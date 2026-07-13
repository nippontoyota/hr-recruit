import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth';
import { NAV_ITEMS } from '../../lib/navigation';
import { cn } from '../../lib/utils';
import type { UserRole } from '../../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';

export const Sidebar = ({ 
  isOpen, 
  setOpen,
  isCollapsed = false,
  setIsCollapsed
}: { 
  isOpen: boolean; 
  setOpen: (o: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (c: boolean) => void;
}) => {
  const { role, user, logout } = useAuth();
  const location = useLocation();

  if (!role) return null;

  const allowedNavItems = NAV_ITEMS.filter((item) => item.roles.includes(role as UserRole));

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 bg-surface border-r border-border transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          isCollapsed ? 'w-16' : 'w-56'
        )}
      >
        {/* Logo & Toggle area */}
        <div className={cn(
          "flex items-center h-14 border-b border-border shrink-0 bg-background transition-all",
          isCollapsed ? "justify-center" : "justify-between px-4"
        )}>

          
          {setIsCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex text-text-secondary h-8 w-8 shrink-0 hover:bg-border/50"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 space-y-1 overflow-y-auto overflow-x-hidden">
          {allowedNavItems.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center text-sm font-semibold rounded-md transition-all mx-2',
                  isCollapsed ? 'justify-center py-3' : 'gap-3 px-4 py-2',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:bg-background hover:text-text-primary'
                )}
                onClick={() => setOpen(false)}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-primary' : 'text-text-secondary')} />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Info Bottom */}
        <div className="border-t border-border shrink-0 flex flex-col bg-surface p-4">
          {!isCollapsed ? (
            <>
              <div className="flex flex-col space-y-1 mb-4">
                <span className="text-sm font-semibold text-text-primary truncate tracking-tight">{user?.full_name}</span>
                <span className="text-xs text-text-secondary truncate">{user?.email}</span>
              </div>
              <Button variant="ghost" className="w-full justify-start text-danger hover:bg-danger/10 hover:text-danger" onClick={logout}>
                Log out
              </Button>
            </>
          ) : (
            <div className="w-8 h-8 rounded-[10px] bg-primary/10 text-primary flex items-center justify-center font-bold text-xs cursor-pointer" onClick={logout} title="Log out">
              {user?.full_name.charAt(0)}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
