import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'md' | 'lg' | 'xl' | '2xl';
  children: React.ReactNode;
}

export const SlideOver = ({ isOpen, onClose, title, size = 'md', children }: SlideOverProps) => {
  const sizeClasses = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-gray-900/50 transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className={cn("w-screen transform transition-transform ease-in-out duration-300", sizeClasses[size])}>
          <div className="flex h-full flex-col bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-medium text-text-primary">{title}</h2>
              <Button variant="ghost" size="sm" onClick={onClose} className="p-2 -mr-2 text-text-secondary">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="relative flex-1 overflow-y-auto px-6 py-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
