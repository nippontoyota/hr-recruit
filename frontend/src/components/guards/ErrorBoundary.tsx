import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button, EmptyState } from '../ui';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
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
                Try again
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
