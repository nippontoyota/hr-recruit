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
          position="bottom-right" 
          richColors
          closeButton
          expand={false}
          duration={4000}
          toastOptions={{
            style: {
              fontFamily: 'var(--font-sans)',
              padding: '16px 20px',
              borderRadius: '16px',
              boxShadow: '0 20px 40px -15px rgba(0,0,0,0.2)',
              fontWeight: 700,
              border: 'none'
            }
          }}
        />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
