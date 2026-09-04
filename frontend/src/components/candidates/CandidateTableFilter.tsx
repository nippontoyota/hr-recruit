import { Filter, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover';
import { cn } from '../../lib/utils';

interface CandidateTableFilterProps {
  label: string;
  values: string[];
  options?: Array<{ value: string; label: string }>;
  textValue?: string;
  dateValue?: string;
  onChange: (values: string[]) => void;
  onTextChange?: (value: string) => void;
  onDateChange?: (value: string) => void;
}

export function CandidateTableFilter({ label, values, options, textValue = '', dateValue = '', onChange, onTextChange, onDateChange }: CandidateTableFilterProps) {
  const [open, setOpen] = useState(false);
  const active = values.length > 0 || Boolean(textValue || dateValue);
  const toggle = (value: string) => onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" onClick={(event) => event.stopPropagation()} className={cn('ml-1 inline-flex rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground', active && 'text-primary')} aria-label={`Filter ${label}`}>
          {active ? <SlidersHorizontal className="h-3.5 w-3.5" /> : <Filter className="h-3.5 w-3.5" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" onClick={(event) => event.stopPropagation()} className="w-64 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-text-primary">Filter {label}</p>
          {active && <button type="button" onClick={() => { onChange([]); onTextChange?.(''); onDateChange?.(''); }} className="text-xs text-muted-foreground hover:text-foreground"><X className="mr-1 inline h-3 w-3" />Clear</button>}
        </div>
        {options && <div className="max-h-56 space-y-1 overflow-y-auto">
          {options.map((option) => <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 text-xs hover:bg-muted">
            <input type="checkbox" checked={values.includes(option.value)} onChange={() => toggle(option.value)} className="accent-[var(--color-primary)]" />
            <span>{option.label}</span>
          </label>)}
        </div>}
        {onTextChange && <input autoFocus={!options} value={textValue} onChange={(event) => onTextChange(event.target.value)} placeholder={`Search ${label.toLowerCase()}`} className="h-9 w-full rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary" />}
        {onDateChange && <input value={dateValue} onChange={(event) => onDateChange(event.target.value)} placeholder="DD-MM-YYYY" inputMode="numeric" className="h-9 w-full rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary" />}
        <button type="button" onClick={() => setOpen(false)} className="w-full rounded bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Apply</button>
      </PopoverContent>
    </Popover>
  );
}
