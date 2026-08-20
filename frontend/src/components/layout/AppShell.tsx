import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../auth';
import { ResumeViewerProvider } from '../candidates/ResumeViewer';
import { NAV_ITEMS } from '../../lib/navigation';
import type { UserRole } from '../../types';
import { cn } from '../../lib/utils';
import { BrandMark } from './BrandMark';
import { Button } from '../ui';

function formatRole(role: string) {
  if (role === 'LOCAL_HR') return 'Local HR';
  if (role === 'HO_HR') return 'Head Office HR';
  if (role === 'ADMIN') return 'Admin';
  return role.replace(/_/g, ' ');
}

export const AppShell = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const { user, role, logout } = useAuth();

  const location = useLocation();
  const isCandidateProfile = location.pathname.match(/^\/candidates\/[a-zA-Z0-9_-]+$/);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const allowedNavItems = role ? NAV_ITEMS.filter((item) => item.roles.includes(role as UserRole)) : [];
  const identityLabel = [
    user?.full_name,
    role === 'LOCAL_HR' ? user?.branch_location : role ? formatRole(role) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <ResumeViewerProvider>
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-background font-sans">
        {!isCandidateProfile && (
          <header className="sticky top-0 z-[var(--z-sticky)] flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4 lg:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {allowedNavItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((open) => !open)}
                  className="flex h-11 w-11 items-center justify-center -ml-1 rounded-lg text-text-secondary transition-colors duration-150 hover:bg-muted hover:text-text-primary md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                  aria-expanded={mobileMenuOpen}
                  aria-controls="mobile-navigation"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
                </button>
              )}
              <div className="min-w-0">
                <BrandMark compact />
              </div>
            </div>

            {allowedNavItems.length > 0 && (
              <nav aria-label="Primary navigation" className="hidden flex-1 items-center justify-center md:flex">
                <div className="flex items-center gap-0.5 rounded-full border border-border bg-muted/70 p-1">
                  {allowedNavItems.map((item) => {
                    const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'relative z-10 flex min-h-9 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                          isActive ? 'text-white' : 'text-text-secondary hover:bg-surface hover:text-text-primary',
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="active-nav-pill"
                            className="absolute inset-0 -z-10 rounded-full bg-primary"
                            transition={reduceMotion ? { duration: 0 } : { type: 'spring', duration: 0.28, bounce: 0.12 }}
                          />
                        )}
                        <Icon strokeWidth={isActive ? 2.25 : 2} className="relative z-10 h-4 w-4" />
                        <span className="relative z-10">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </nav>
            )}

            <div className="flex w-auto min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
              {identityLabel && (
                <p className="hidden min-w-0 truncate text-sm text-text-secondary sm:block" title={identityLabel}>
                  {identityLabel}
                </p>
              )}
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => void logout()}
                aria-label="Log out"
                className="shrink-0"
              >
                Log out
              </Button>
            </div>
          </header>
        )}

        <AnimatePresence>
          {!isCandidateProfile && mobileMenuOpen && allowedNavItems.length > 0 && (
            <motion.div
              id="mobile-navigation"
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              className="z-[var(--z-sticky)] overflow-hidden border-b border-border bg-surface md:hidden"
            >
              <nav aria-label="Mobile navigation" className="flex flex-col p-2">
                {allowedNavItems.map((item) => {
                  const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex min-h-11 items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-text-secondary hover:bg-muted hover:text-text-primary',
                      )}
                    >
                      <Icon strokeWidth={2} className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="custom-scrollbar relative flex-1 overflow-y-auto bg-background focus:outline-none">
          <div className={isCandidateProfile ? 'flex min-h-full w-full' : 'mx-auto h-full w-full p-3 sm:p-5'}>
            <div className="flex h-full w-full flex-col">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </ResumeViewerProvider>
  );
};
