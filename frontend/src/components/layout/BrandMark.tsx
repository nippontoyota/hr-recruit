import { cn } from '../../lib/utils';

interface BrandMarkProps {
  inverted?: boolean;
  compact?: boolean;
  subtitle?: string;
}

export function BrandMark({ inverted = false, compact = false, subtitle = 'Recruitment' }: BrandMarkProps) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <img
        src="/nippon-toyota-logo.png"
        alt=""
        className={cn('w-auto shrink-0 object-contain', compact ? 'h-7' : 'h-8')}
      />
      <div className="min-w-0">
        <p
          className={cn(
            'truncate font-semibold tracking-tight',
            compact ? 'text-sm' : 'text-[15px] leading-5',
            inverted ? 'text-white' : 'text-text-primary',
          )}
        >
          Nippon Toyota
        </p>
        {!compact && (
          <p className={cn('text-xs leading-4', inverted ? 'text-white/80' : 'text-text-secondary')}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
