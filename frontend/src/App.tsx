import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './auth';
import { ErrorBoundary } from './components/guards/ErrorBoundary';
import { router } from './routes';
import { Toaster } from 'sonner';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

function App() {
  return (
    <ErrorBoundary>
      <Toaster
        position="bottom-right"
        theme="light"
        closeButton
        expand={false}
        duration={3500}
        visibleToasts={4}
        gap={10}
        offset={20}
        mobileOffset={{ bottom: 16, right: 16, left: 16 }}
        icons={{
          success: <CheckCircle2 className="w-[18px] h-[18px] text-emerald-600 shrink-0" strokeWidth={2.2} />,
          error: <AlertCircle className="w-[18px] h-[18px] text-red-600 shrink-0" strokeWidth={2.2} />,
          warning: <AlertTriangle className="w-[18px] h-[18px] text-amber-600 shrink-0" strokeWidth={2.2} />,
          info: <Info className="w-[18px] h-[18px] text-sky-600 shrink-0" strokeWidth={2.2} />,
          loading: <Loader2 className="w-[18px] h-[18px] text-zinc-500 animate-spin shrink-0" strokeWidth={2.2} />,
        }}
        toastOptions={{
          style: {
            fontFamily: 'var(--font-sans)',
            borderRadius: '12px',
          },
        }}
      />
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
