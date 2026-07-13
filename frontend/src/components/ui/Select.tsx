import React, { useState, useRef, useEffect, forwardRef, isValidElement } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLDivElement, SelectProps>(
  ({ className, error, children, value, onChange, disabled, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Extract options from children
    const options: { value: string; label: React.ReactNode; disabled?: boolean }[] = [];
    React.Children.forEach(children, (child) => {
      if (isValidElement(child) && child.type === 'option') {
        const props = child.props as { value?: string; disabled?: boolean; children?: React.ReactNode };
        options.push({
          value: props.value ?? props.children?.toString() ?? '',
          label: props.children,
          disabled: props.disabled,
        });
      }
    });

    const selectedOption = options.find((opt) => opt.value === value) || options[0];

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue: string) => {
      setIsOpen(false);
      if (onChange) {
        // Create a synthetic-like event to satisfy standard onChange handlers
        onChange({
          target: { value: optionValue },
          currentTarget: { value: optionValue },
          preventDefault: () => {},
          stopPropagation: () => {}
        } as any);
      }
    };

    return (
      <div className="relative w-full" ref={containerRef}>
        {/* Hidden native select for form submissions and accessibility if needed */}
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="hidden"
          {...props}
        >
          {children}
        </select>

        <div
          ref={ref as any}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-[10px] border border-border bg-surface px-3 py-1 text-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
            error && "border-danger text-danger focus:ring-danger",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <span className="truncate flex-1 text-left">{selectedOption?.label || 'Select...'}</span>
          <ChevronDown className={cn("h-4 w-4 opacity-70 transition-transform flex-shrink-0 ml-2", isOpen && "rotate-180")} />
        </div>

        {isOpen && !disabled && (
          <div className="absolute z-[9999] mt-1 max-h-60 w-full overflow-auto rounded-[10px] border border-border bg-surface shadow-md">
            {options.filter(opt => opt.value !== '').map((option, index) => (
              <div
                key={index}
                className={cn(
                  "cursor-pointer px-3 py-2 text-sm transition-colors text-left",
                  option.disabled ? "opacity-50 cursor-not-allowed bg-muted/20" : "hover:bg-muted",
                  value === option.value && "bg-primary/10 text-primary font-bold"
                )}
                onClick={() => {
                  if (!option.disabled) {
                    handleSelect(option.value);
                  }
                }}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';
