import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';
import { useAuth } from '../../auth';
import { ResumeViewerProvider } from '../candidates/ResumeViewer';

export const AppShell = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, role } = useAuth();

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

              <div className="flex items-center justify-end gap-2 ml-auto">
                <div
                  className="flex items-center gap-2 p-1.5 rounded-lg text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs uppercase shrink-0">
                    {user?.full_name.charAt(0) || 'U'}
                  </div>
                  <div className="hidden md:block min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate max-w-[140px]">
                      {user?.full_name}
                    </p>
                    {role && (
                      <p className="text-[10px] text-text-secondary uppercase tracking-wide">
                        {role.replace(/_/g, ' ')}
                      </p>
                    )}
                  </div>
                </div>
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
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </ResumeViewerProvider>
  );
};
