import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { Button } from '../ui/Button';
import { AlertTriangle } from 'lucide-react';

export function ErrorBoundary() {
  const error = useRouteError();
  
  let errorMessage = "An unexpected error occurred.";
  if (isRouteErrorResponse(error)) {
    errorMessage = error.data?.message || error.statusText;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-surface border border-border/80 rounded-2xl p-8 shadow-lg text-center space-y-6">
        <div className="w-16 h-16 bg-danger/10 text-danger rounded-2xl flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Something went wrong</h1>
          <p className="text-sm text-text-secondary bg-background p-3 rounded-lg font-mono text-left overflow-auto max-h-48">
            {errorMessage}
          </p>
        </div>
        <Button onClick={() => window.location.href = '/'} className="w-full" variant="primary">
          Reload Application
        </Button>
      </div>
    </div>
  );
}
