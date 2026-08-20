import { FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useResumeViewer } from './ResumeViewer';

interface ResumeButtonProps {
  candidateId: string;
  candidateName: string;
  hasResume?: boolean;
  variant?: 'icon' | 'pill';
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export function ResumeButton({
  candidateId,
  candidateName,
  hasResume = true,
  variant = 'pill',
  className,
  onClick,
}: ResumeButtonProps) {
  const { openResume } = useResumeViewer();

  if (!hasResume) return null;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    openResume(candidateId, candidateName);
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        title="View Resume"
        className={cn(
          'flex items-center justify-center p-1.5 bg-blue-50 text-blue-700 border border-blue-200/90 hover:bg-blue-600 hover:text-white transition-all rounded-md shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20',
          className,
        )}
        onClick={handleClick}
      >
        <FileText className="w-4 h-4" strokeWidth={2.2} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-bold rounded-md bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30',
        className,
      )}
      onClick={handleClick}
    >
      <FileText className="w-3.5 h-3.5" strokeWidth={2.2} /> Resume
    </button>
  );
}
