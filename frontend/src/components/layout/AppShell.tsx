import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const AppShell = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar - responsive behavior handled inside */}
      <Sidebar isOpen={sidebarOpen} setOpen={setSidebarOpen} />
      
      {/* Main content wrapper */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
