import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../auth';
import { ResumeViewerProvider } from '../candidates/ResumeViewer';
import { NAV_ITEMS } from '../../lib/navigation';
import type { UserRole } from '../../types';
import { cn } from '../../lib/utils';

export const AppShell = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, role, logout } = useAuth();

  const location = useLocation();
  const isCandidateProfile = location.pathname.match(/^\/candidates\/[a-zA-Z0-9_-]+$/);

  const getBranchColor = (branch: string | null | undefined) => {
    if (!branch) return 'bg-gray-100 text-gray-700 border-gray-200';
    const colorList = [
      'bg-blue-600 text-white border-blue-700 shadow-sm',
      'bg-cyan-600 text-white border-cyan-700 shadow-sm',
      'bg-sky-600 text-white border-sky-700 shadow-sm',
      'bg-indigo-600 text-white border-indigo-700 shadow-sm',
      'bg-violet-600 text-white border-violet-700 shadow-sm',
      'bg-purple-600 text-white border-purple-700 shadow-sm',
      'bg-fuchsia-600 text-white border-fuchsia-700 shadow-sm',
      'bg-pink-600 text-white border-pink-700 shadow-sm',
      'bg-rose-600 text-white border-rose-700 shadow-sm',
      'bg-red-600 text-white border-red-700 shadow-sm',
      'bg-orange-600 text-white border-orange-700 shadow-sm',
      'bg-amber-600 text-white border-amber-700 shadow-sm',
      'bg-lime-600 text-white border-lime-700 shadow-sm',
      'bg-green-600 text-white border-green-700 shadow-sm',
      'bg-emerald-600 text-white border-emerald-700 shadow-sm',
    ];
    let hash = 0;
    for (let i = 0; i < branch.length; i++) {
      hash = branch.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colorList[Math.abs(hash) % colorList.length];
  };

  const allowedNavItems = role ? NAV_ITEMS.filter((item) => item.roles.includes(role as UserRole)) : [];

  return (
    <ResumeViewerProvider>
      <div className="flex h-screen w-full bg-background overflow-hidden font-sans flex-col">
        {!isCandidateProfile && (
          <header className="sticky top-0 z-[var(--z-sticky)] flex items-center justify-between h-14 border-b border-border bg-surface px-4 lg:px-6 shrink-0">
            {/* Logo / Mobile Menu */}
            <div className="flex items-center gap-4 w-1/4">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1 -ml-1 text-text-secondary hover:text-text-primary rounded-lg hover:bg-muted transition-colors md:hidden"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <span className="text-base font-accent font-extrabold text-text-primary tracking-tight hidden md:block">
                Recruitment CRM
              </span>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex flex-1 justify-center items-center gap-2">
              {allowedNavItems.map((item) => {
                const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-2 px-4 py-1.5 text-sm font-accent font-bold rounded-full transition-all duration-200',
                      isActive
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                    )}
                  >
                    <Icon strokeWidth={2.5} className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Profile & Actions */}
            <div className="flex items-center justify-end gap-3 w-1/4">
              {role === 'LOCAL_HR' && user?.branch_location ? (
                <span className={`px-2 py-1 border rounded-lg shadow-sm text-[10px] font-accent font-bold uppercase tracking-widest hidden sm:inline-block ${getBranchColor(user.branch_location)}`}>
                  {user.branch_location}
                </span>
              ) : role && (
                <span className="px-2 py-1 bg-slate-800 text-white border border-slate-900 shadow-sm rounded-lg text-[10px] font-accent font-bold uppercase tracking-widest hidden sm:inline-block">
                  {role.replace(/_/g, ' ')}
                </span>
              )}
              <button
                onClick={logout}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white border border-red-700 shadow-sm rounded-lg transition-colors text-xs font-accent font-bold uppercase tracking-wider"
                title="Log out"
              >
                Log out
              </button>
            </div>
          </header>
        )}

        {/* Mobile Navigation Menu Dropdown */}
        <AnimatePresence>
          {!isCandidateProfile && mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-b border-border bg-surface overflow-hidden z-[var(--z-sticky)] shadow-md"
            >
              <nav className="flex flex-col p-2 space-y-1">
                {allowedNavItems.map((item) => {
                  const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 text-sm font-accent font-semibold rounded-xl transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-text-secondary hover:bg-muted hover:text-text-primary'
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

        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-background">
          <div
            className={
              isCandidateProfile
                ? 'w-full min-h-full flex'
                : 'p-4 sm:p-6 lg:p-8 w-full h-full mx-auto'
            }
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full flex flex-col"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </ResumeViewerProvider>
  );
};
