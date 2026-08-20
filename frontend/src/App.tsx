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
          theme="light"
          richColors
          closeButton
          expand={false}
          duration={4000}
          toastOptions={{
            style: {
              fontFamily: 'var(--font-sans)',
              padding: '12px 16px',
              borderRadius: '10px',
              boxShadow: 'var(--shadow-md)',
              fontWeight: 500,
              border: '1px solid var(--border)',
            },
          }}
        />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
