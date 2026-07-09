import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const LoadingSpinner = ({ size = 'md', className }: LoadingSpinnerProps) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <div className={cn('flex justify-center items-center', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizes[size])} />
    </div>
  );
};
