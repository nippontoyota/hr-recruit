import { cn } from '../../lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const LoadingSpinner = ({ size = 'md', className }: LoadingSpinnerProps) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <div className={cn('relative inline-block', sizes[size], className)}>
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute left-[46%] top-[0%] w-[8%] h-[24%] bg-foreground/60 rounded-full animate-spinner-fade"
          style={{
            transform: `rotate(${i * 30}deg)`,
            transformOrigin: '50% 208%',
            animationDelay: `${-1.2 + i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
};
