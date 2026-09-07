import { cn } from '../../lib/utils';
import { getBrandConfig } from '../../lib/branding';

interface BrandMarkProps {
  inverted?: boolean;
  compact?: boolean;
  subtitle?: string;
  brand?: string | null;
}

export function BrandMark({ inverted = false, compact = false, subtitle, brand }: BrandMarkProps) {
  const config = getBrandConfig(brand);
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <img
        src={config.logo}
        alt={`${config.name} logo`}
        className={cn('w-auto shrink-0 object-contain', compact ? 'h-7' : 'h-8', config.key === 'RIVER' && 'rounded-sm bg-white px-1')}
      />
      <div className="min-w-0">
        <p
          className={cn(
            'truncate font-semibold tracking-tight',
            compact ? 'text-sm' : 'text-[15px] leading-5',
            inverted ? 'text-white' : 'text-text-primary',
          )}
        >
          {config.name}
        </p>
        {!compact && (
          <p className={cn('text-xs leading-4', inverted ? 'text-white/80' : 'text-text-secondary')}>
            {subtitle || config.subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
