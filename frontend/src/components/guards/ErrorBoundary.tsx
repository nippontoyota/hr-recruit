import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button, EmptyState } from '../ui';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render-time errors and displays a recovery UI instead of white-screening.
 * Wrap around top-level routes or critical component subtrees.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to an error reporting service in production
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <EmptyState
            icon={<AlertTriangle className="w-12 h-12 text-warning" />}
            title="Something went wrong"
            description={
              this.state.error?.message ||
              'An unexpected error occurred. Please try again.'
            }
            action={
              <Button variant="secondary" onClick={this.handleReset}>
                Try Again
              </Button>
            }
            className="max-w-md w-full"
          />
        </div>
      );
    }

    return this.props.children;
  }
}
