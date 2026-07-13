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
          'p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors rounded-[10px] focus:outline-none',
          className,
        )}
        onClick={handleClick}
      >
        <FileText className="w-4 h-4" strokeWidth={2} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        'flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-muted transition-colors text-foreground cursor-pointer shadow-sm h-9',
        className,
      )}
      onClick={handleClick}
    >
      <FileText className="w-4 h-4" /> Resume
    </button>
  );
}
