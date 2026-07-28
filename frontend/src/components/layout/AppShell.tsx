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
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm uppercase shrink-0">
                    {user?.full_name.charAt(0) || 'U'}
                  </div>
                  <div className="hidden md:block min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate max-w-[200px] leading-tight">
                      {user?.full_name}
                    </p>
                    <p className="text-[11px] text-text-secondary truncate max-w-[200px] leading-tight mt-0.5">
                      {user?.email}
                    </p>
                    {role && (
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wide mt-1">
                        {role.replace(/_/g, ' ')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="h-8 w-px bg-border mx-1 hidden md:block"></div>
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
