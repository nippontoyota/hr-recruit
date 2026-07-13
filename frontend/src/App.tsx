import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './auth';
import { ErrorBoundary } from './components/guards/ErrorBoundary';
import { router } from './routes';
import { Toaster } from 'sonner';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster 
          position="top-right" 
          richColors
          toastOptions={{
            style: {
              fontFamily: 'var(--font-sans)',
            }
          }}
        />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
