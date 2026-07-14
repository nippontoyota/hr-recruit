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
  setIsCollapsed,
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
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 bg-sidebar border-r border-border transform transition-[width,transform] duration-200 ease-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          isCollapsed ? 'w-[4.5rem]' : 'w-60'
        )}
      >
        <div
          className={cn(
            'flex items-center h-14 border-b border-border shrink-0 bg-sidebar',
            isCollapsed ? 'justify-center' : 'justify-between px-4'
          )}
        >
          {!isCollapsed && (
            <span className="font-bold text-text-primary whitespace-nowrap overflow-hidden text-ellipsis">
              Recruitment CRM
            </span>
          )}
          {setIsCollapsed && !isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex text-text-secondary h-8 w-8 shrink-0"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {setIsCollapsed && isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex text-text-secondary h-8 w-8 shrink-0"
              onClick={() => setIsCollapsed(false)}
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden" aria-label="Main navigation">
          {!isCollapsed && (
            <p className="px-4 mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
              Workspace
            </p>
          )}
          <div className="space-y-0.5 px-2">
            {allowedNavItems.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href !== '/' && location.pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center text-sm font-medium rounded-lg transition-colors',
                    isCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                  )}
                  onClick={() => setOpen(false)}
                  title={isCollapsed ? item.name : undefined}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-primary')} />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-border shrink-0 p-3 bg-sidebar">
          {!isCollapsed ? (
            <>
              <div className="px-2 py-2 mb-2 rounded-lg bg-surface border border-border">
                <p className="text-sm font-medium text-text-primary truncate">{user?.full_name}</p>
                <p className="text-xs text-text-secondary truncate mt-0.5">{user?.email}</p>
                {role && (
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-primary mt-1.5">
                    {role.replace(/_/g, ' ')}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start text-danger hover:bg-danger/10 hover:text-danger h-9"
                onClick={logout}
              >
                Log out
              </Button>
            </>
          ) : (
            <button
              type="button"
              className="w-9 h-9 mx-auto rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs"
              onClick={logout}
              title="Log out"
              aria-label="Log out"
            >
              {user?.full_name.charAt(0)}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
