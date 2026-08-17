import React, { useState, useRef, useMemo, forwardRef, isValidElement } from 'react';
import type { SelectHTMLAttributes, KeyboardEvent } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown, Search } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './Popover';

const SEARCH_MIN_OPTIONS = 6;

function optionLabelText(label: React.ReactNode): string {
  if (label == null || typeof label === 'boolean') return '';
  if (typeof label === 'string' || typeof label === 'number') return String(label);
  if (Array.isArray(label)) return label.map(optionLabelText).join(' ');
  if (isValidElement(label)) {
    return optionLabelText((label.props as { children?: React.ReactNode }).children);
  }
  return '';
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  searchable?: boolean;
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  ({ className, error, children, value, onChange, disabled, searchable, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);

    const options = useMemo(() => {
      const next: { value: string; label: React.ReactNode; disabled?: boolean }[] = [];
      React.Children.forEach(children, (child) => {
        if (isValidElement(child) && child.type === 'option') {
          const optionProps = child.props as { value?: string; disabled?: boolean; children?: React.ReactNode };
          next.push({
            value: optionProps.value ?? optionProps.children?.toString() ?? '',
            label: optionProps.children,
            disabled: optionProps.disabled,
          });
        }
      });
      return next;
    }, [children]);

    const selectedOption = options.find((opt) => opt.value === value) || options[0];
    const listOptions = options.filter((opt) => !(opt.value === '' && opt.disabled));
    const choosableCount = options.filter((opt) => opt.value !== '' && !opt.disabled).length;
    const showSearch = searchable ?? choosableCount >= SEARCH_MIN_OPTIONS;

    const normalizedQuery = query.trim().toLowerCase();
    const filtered =
      !showSearch || !normalizedQuery
        ? listOptions
        : listOptions.filter((opt) => {
            const text = `${optionLabelText(opt.label)} ${opt.value}`.toLowerCase();
            return text.includes(normalizedQuery);
          });

    const handleSelect = (optionValue: string) => {
      setIsOpen(false);
      setQuery('');
      if (onChange) {
        onChange({
          target: { value: optionValue },
          currentTarget: { value: optionValue },
          preventDefault: () => {},
          stopPropagation: () => {},
        } as React.ChangeEvent<HTMLSelectElement>);
      }
    };

    const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const first = filtered.find((opt) => !opt.disabled);
        if (first) handleSelect(first.value);
      }
      if (e.key === 'Escape' && query) {
        e.preventDefault();
        e.stopPropagation();
        setQuery('');
      }
    };

    return (
      <div className="w-full">
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="hidden"
          tabIndex={-1}
          aria-hidden
          {...props}
        >
          {children}
        </select>

        <Popover
          open={isOpen}
          onOpenChange={(open) => {
            if (disabled) return;
            setIsOpen(open);
            if (!open) setQuery('');
          }}
          modal
        >
          <PopoverTrigger asChild>
            <button
              ref={ref}
              type="button"
              disabled={disabled}
              id={props.id}
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              aria-label={props['aria-label']}
              aria-labelledby={props['aria-labelledby']}
              aria-describedby={props['aria-describedby']}
              className={cn(
                'flex min-h-11 w-full items-center justify-between rounded-lg border border-border bg-surface px-3 py-1 text-sm transition-[border-color,box-shadow] duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary',
                error && 'border-danger text-danger focus:ring-danger',
                disabled && 'cursor-not-allowed opacity-50',
                className
              )}
            >
              <span className="truncate flex-1 text-left">{selectedOption?.label || 'Select...'}</span>
              <ChevronDown className={cn('h-4 w-4 opacity-70 transition-transform flex-shrink-0 ml-2', isOpen && 'rotate-180')} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="bottom"
            sideOffset={4}
            collisionPadding={8}
            onOpenAutoFocus={(e) => {
              if (showSearch) {
                e.preventDefault();
                requestAnimationFrame(() => searchRef.current?.focus());
              }
            }}
            className={cn(
              'flex max-h-72 flex-col overflow-hidden rounded-lg border border-border bg-surface p-0 shadow-md',
              'w-[var(--radix-popover-trigger-width)]',
              showSearch && 'min-w-[16rem]'
            )}
          >
            {showSearch && (
              <div className="shrink-0 border-b border-border p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search..."
                    aria-label="Search options"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25"
                  />
                </div>
              </div>
            )}
            <div className="custom-scrollbar min-h-0 flex-1 overflow-auto overscroll-contain">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">No matches</div>
              ) : (
                filtered.map((option, index) => (
                  <div
                    key={`${option.value}-${index}`}
                    role="option"
                    aria-selected={value === option.value}
                    tabIndex={option.disabled ? -1 : 0}
                    onKeyDown={(event) => {
                      if ((event.key === 'Enter' || event.key === ' ') && !option.disabled) {
                        event.preventDefault();
                        handleSelect(option.value);
                      }
                    }}
                    className={cn(
                      'cursor-pointer px-3 py-2 text-left text-sm transition-colors',
                      option.disabled ? 'cursor-not-allowed bg-muted/20 opacity-50' : 'hover:bg-muted',
                      value === option.value && 'bg-primary/10 font-bold text-primary'
                    )}
                    onClick={() => {
                      if (!option.disabled) handleSelect(option.value);
                    }}
                  >
                    {option.label}
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);
Select.displayName = 'Select';
