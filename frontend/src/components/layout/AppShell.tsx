import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';
import { useAuth } from '../../auth';
import { ResumeViewerProvider } from '../candidates/ResumeViewer';

export const AppShell = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
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

  return (
    <ResumeViewerProvider>
      <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
        <Sidebar
          isOpen={sidebarOpen}
          setOpen={setSidebarOpen}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {!isCandidateProfile && (
            <header className="sticky top-0 z-[var(--z-sticky)] flex items-center justify-between h-14 border-b border-border bg-surface px-4 lg:px-6 shrink-0">
              <div className="flex items-center gap-3 lg:hidden">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 -ml-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-muted transition-colors"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <span className="text-sm font-accent font-semibold text-text-primary">Recruitment</span>
              </div>

              <div className="flex items-center justify-end gap-4 ml-auto">
                {role === 'LOCAL_HR' && user?.branch_location ? (
                  <span className={`px-2 py-1 border rounded shadow-sm text-[10px] font-accent font-bold uppercase tracking-widest hidden sm:inline-block ${getBranchColor(user.branch_location)}`}>
                    {user.branch_location}
                  </span>
                ) : role && (
                  <span className="px-2 py-1 bg-slate-800 text-white border border-slate-900 shadow-sm rounded text-[10px] font-accent font-bold uppercase tracking-widest hidden sm:inline-block">
                    {role.replace(/_/g, ' ')}
                  </span>
                )}
                <button
                  onClick={logout}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white border border-red-700 shadow-sm rounded transition-colors text-[10px] font-accent font-bold uppercase tracking-wider"
                  title="Log out"
                >
                  Log out
                </button>
              </div>
            </header>
          )}

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
                  className="w-full h-full"
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </ResumeViewerProvider>
  );
};
