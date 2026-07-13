import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Menu, Search, Bell } from 'lucide-react';
import { useAuth } from '../../auth';
import { AddCandidateForm } from '../candidates/AddCandidateForm';
import { ResumeViewerProvider } from '../candidates/ResumeViewer';

export const AppShell = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const [showAddCandidate, setShowAddCandidate] = useState(false);
  
  const location = useLocation();
  const isCandidateProfile = location.pathname.match(/^\/candidates\/[a-zA-Z0-9_-]+$/);

  return (
    <ResumeViewerProvider>
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        setOpen={setSidebarOpen} 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
      />
      
      {/* Main content wrapper */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-background">
        {/* Unified Top Header */}
        {!isCandidateProfile && (
          <div className="sticky top-0 z-30 flex items-center justify-between h-14 border-b border-border bg-surface px-4 lg:px-6">
            <div className="flex items-center lg:hidden">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="p-2 -ml-2 text-text-secondary hover:text-text-primary focus:outline-none"
              >
                <Menu className="h-5 w-5" />
              </button>
              <span className="ml-3 text-sm font-bold tracking-tighter text-text-primary">NT COMMAND CENTER</span>
            </div>
            
            <div className="hidden lg:flex flex-1 items-center max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Search candidates, phone, position..."
                  className="w-full h-8 pl-9 pr-4 bg-background border border-border rounded-[10px] text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-text-secondary/60"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 lg:gap-4 ml-auto">
              <div className="hidden md:block w-[120px]"></div>
              <button className="relative p-1.5 text-text-secondary hover:text-text-primary transition-colors rounded-[10px] hover:bg-muted">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-danger rounded-full border border-surface"></span>
              </button>

              <div className="h-5 w-px bg-border mx-1 hidden sm:block"></div>

              <div className="flex items-center gap-2 cursor-pointer p-1 rounded-[10px] hover:bg-muted transition-colors" onClick={logout}>
                <div className="w-7 h-7 rounded-[10px] bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                  {user?.full_name.charAt(0) || 'U'}
                </div>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-background">
          <div className={isCandidateProfile ? "w-full min-h-full flex" : "p-4 sm:p-6 lg:p-8 w-full h-full max-w-7xl mx-auto"}>
            <Outlet />
          </div>
        </main>
      </div>

      <AddCandidateForm 
        isOpen={showAddCandidate} 
        onClose={() => setShowAddCandidate(false)} 
        onSuccess={() => setShowAddCandidate(false)} 
      />
    </div>
    </ResumeViewerProvider>
  );
};
