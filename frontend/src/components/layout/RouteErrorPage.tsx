import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { Button } from '../ui/Button';
import { AlertTriangle } from 'lucide-react';

export function RouteErrorPage() {
  const error = useRouteError();

  let errorMessage = 'An unexpected error occurred.';
  if (isRouteErrorResponse(error)) {
    errorMessage = error.data?.message || error.statusText;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-surface border border-border rounded-xl p-8 shadow-sm text-center space-y-6">
        <div className="w-14 h-14 bg-danger/10 text-danger rounded-xl flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-text-primary mb-2">Something went wrong</h1>
          <p className="text-sm text-text-secondary bg-content p-3 rounded-lg font-mono text-left overflow-auto max-h-48">
            {errorMessage}
          </p>
        </div>
        <Button onClick={() => { window.location.href = '/'; }} className="w-full">
          Reload application
        </Button>
      </div>
    </div>
  );
}
