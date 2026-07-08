import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth';
import { NAV_ITEMS } from '../../lib/navigation';
import { cn } from '../../lib/utils';
import type { UserRole } from '../../types';
import { LogOut } from 'lucide-react';
import { Button } from '../ui/Button';

export const Sidebar = ({ isOpen, setOpen }: { isOpen: boolean; setOpen: (o: boolean) => void }) => {
  const { role, user, logout } = useAuth();
  const location = useLocation();

  if (!role) return null;

  const allowedNavItems = NAV_ITEMS.filter((item) => item.roles.includes(role as UserRole));

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo area */}
        <div className="flex items-center justify-center h-16 border-b border-gray-200 px-6 shrink-0">
          <span className="text-lg font-bold text-gray-900 tracking-tight">Nippon Toyota</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {allowedNavItems.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-red-50 text-primary'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                )}
                onClick={() => setOpen(false)}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Info Bottom */}
        <div className="p-4 border-t border-gray-200 shrink-0 flex items-center justify-between">
          <div className="flex flex-col space-y-1 overflow-hidden pr-2">
            <span className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 self-start">
              {role.replace(/_/g, ' ')}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-gray-500 p-2 shrink-0">
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Logout</span>
          </Button>
        </div>
      </div>
    </>
  );
};
