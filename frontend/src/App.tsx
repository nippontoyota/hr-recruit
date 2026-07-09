import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './auth';
import { ErrorBoundary } from './components/guards/ErrorBoundary';
import { router } from './routes';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
