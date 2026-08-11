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
          theme="dark"
          richColors
          closeButton
          expand={false}
          duration={4000}
          toastOptions={{
            style: {
              fontFamily: 'var(--font-sans)',
              padding: '16px 20px',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
              fontWeight: 600,
              border: '1px solid rgba(255, 255, 255, 0.1)',
            },
            className: 'backdrop-blur-xl bg-opacity-95'
          }}
        />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
