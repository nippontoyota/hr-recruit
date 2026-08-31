import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Menu, X, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../auth';
import { ResumeViewerProvider } from '../candidates/ResumeViewer';
import { NAV_ITEMS } from '../../lib/navigation';
import type { UserRole } from '../../types';
import { cn } from '../../lib/utils';

export const AdminDemoShell = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, role, logout } = useAuth();

  const location = useLocation();
  const isCandidateProfile = location.pathname.match(/^\/candidates\/[a-zA-Z0-9_-]+$/);

  const getBranchColor = (branch: string | null | undefined) => {
    if (!branch) return 'bg-gray-100 text-gray-700 border-gray-200';
    const colorList = [
      'bg-blue-500 text-white border-blue-600 shadow-sm',
      'bg-cyan-500 text-white border-cyan-600 shadow-sm',
      'bg-sky-500 text-white border-sky-600 shadow-sm',
      'bg-indigo-500 text-white border-indigo-600 shadow-sm',
      'bg-violet-500 text-white border-violet-600 shadow-sm',
      'bg-purple-500 text-white border-purple-600 shadow-sm',
      'bg-fuchsia-500 text-white border-fuchsia-600 shadow-sm',
      'bg-pink-500 text-white border-pink-600 shadow-sm',
      'bg-rose-500 text-white border-rose-600 shadow-sm',
      'bg-red-500 text-white border-red-600 shadow-sm',
      'bg-orange-500 text-white border-orange-600 shadow-sm',
      'bg-amber-500 text-white border-amber-600 shadow-sm',
      'bg-lime-500 text-white border-lime-600 shadow-sm',
      'bg-green-500 text-white border-green-600 shadow-sm',
      'bg-emerald-500 text-white border-emerald-600 shadow-sm',
    ];
    let hash = 0;
    for (let i = 0; i < branch.length; i++) {
      hash = branch.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colorList[Math.abs(hash) % colorList.length];
  };

  const allowedNavItems = role ? NAV_ITEMS.filter((item) => item.roles.includes(role as UserRole)).map(item => ({
    ...item,
    href: item.href.replace("/admin/", "/demo-admin/").replace("/candidates", "/demo-admin/pipeline")
  })) : [];

  return (
    <ResumeViewerProvider>
      <div className="flex h-screen w-full bg-background overflow-hidden font-sans flex-col">
        {!isCandidateProfile && (
          <header className="sticky top-0 z-[var(--z-sticky)] flex items-center justify-between h-14 bg-surface px-4 lg:px-6 shrink-0">
            {/* Logo / Mobile Menu */}
            <div className="flex items-center gap-4 flex-1">
              {/* Mobile menu toggle removed for Admin */}
              {role === 'ADMIN' ? (
                location.pathname !== '/demo-admin/dashboard' && (
                  <Link 
                    to="/demo-admin/dashboard"
                    className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    <ChevronLeft size={16} className="mr-1" /> Back to Workspace
                  </Link>
                )
              ) : (
                <span className="text-base font-accent font-extrabold text-text-primary tracking-tight hidden md:block">
                  Nippon Recruitment CRM
                </span>
              )}
            </div>

            {/* Desktop Navigation Links */}
            {/* Navbar removed for Admin as requested */}

            {/* Profile & Actions */}
            <div className="flex items-center justify-end gap-3 w-1/4">
              {role === 'LOCAL_HR' && user?.branch_location ? (
                <span className={`px-3 py-1.5 border rounded shadow-md text-[11px] font-accent font-black uppercase tracking-widest hidden sm:inline-block ${getBranchColor(user.branch_location)}`}>
                  {user.branch_location}
                </span>
              ) : role && (
                <span className="px-3 py-1.5 bg-indigo-500 text-white border border-indigo-600 shadow-md rounded text-[11px] font-accent font-black uppercase tracking-widest hidden sm:inline-block">
                  {role.replace(/_/g, ' ')}
                </span>
              )}
              <button
                onClick={logout}
                className="px-4 py-1.5 bg-red-500 hover:bg-red-400 text-white border border-red-600 shadow-md hover:shadow-lg hover:-translate-y-0.5 rounded transition-all duration-200 text-[11px] font-accent font-black uppercase tracking-widest"
                title="Log out"
              >
                Log out
              </button>
            </div>
          </header>
        )}

        {/* Mobile Navigation Menu Dropdown */}
        {/* Mobile menu removed for Admin as requested */}

        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-background">
          <div
            className={
              isCandidateProfile
                ? 'w-full min-h-full flex'
                : 'p-2 sm:p-4 w-full h-full mx-auto'
            }
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
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
