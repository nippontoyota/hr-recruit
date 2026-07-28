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
      'bg-blue-50 text-blue-700 border-blue-200',
      'bg-cyan-50 text-cyan-700 border-cyan-200',
      'bg-sky-50 text-sky-700 border-sky-200',
      'bg-indigo-50 text-indigo-700 border-indigo-200',
      'bg-violet-50 text-violet-700 border-violet-200',
      'bg-purple-50 text-purple-700 border-purple-200',
      'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
      'bg-pink-50 text-pink-700 border-pink-200',
      'bg-rose-50 text-rose-700 border-rose-200',
      'bg-red-50 text-red-700 border-red-200',
      'bg-orange-50 text-orange-700 border-orange-200',
      'bg-amber-50 text-amber-700 border-amber-200',
      'bg-lime-50 text-lime-700 border-lime-200',
      'bg-green-50 text-green-700 border-green-200',
      'bg-emerald-50 text-emerald-700 border-emerald-200',
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
                <span className="text-sm font-semibold text-text-primary">Recruitment</span>
              </div>

              <div className="flex items-center justify-end gap-4 ml-auto">
                {role === 'LOCAL_HR' && user?.branch_location ? (
                  <span className={`px-2.5 py-1 border rounded-md text-[10px] font-bold uppercase tracking-widest hidden sm:inline-block ${getBranchColor(user.branch_location)}`}>
                    {user.branch_location}
                  </span>
                ) : role && (
                  <span className="px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-md text-[10px] font-bold uppercase tracking-widest hidden sm:inline-block">
                    {role.replace(/_/g, ' ')}
                  </span>
                )}
                <button
                  onClick={logout}
                  className="px-3 py-1.5 bg-danger/10 text-danger hover:bg-danger hover:text-white rounded-md transition-colors text-xs font-bold uppercase tracking-wider"
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
                  : 'p-4 sm:p-6 lg:p-8 w-full h-full max-w-7xl mx-auto'
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
