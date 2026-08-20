import { Search, X } from 'lucide-react';
import { Select } from '../ui';
import type { PipelineStage } from '../../types';

interface CandidateFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  stageFilter: PipelineStage | '';
  onStageChange: (value: PipelineStage | '') => void;
  stages: PipelineStage[];
  hasActiveFilters: boolean;
  onClear: () => void;
}

export function CandidateFilters({
  searchQuery,
  onSearchChange,
  stageFilter,
  onStageChange,
  stages,
  hasActiveFilters,
  onClear,
}: CandidateFiltersProps) {
  return (
    <div className="flex flex-col gap-3 px-1 pt-2 md:flex-row md:items-end">
      <div className="min-w-0 flex-1 md:max-w-md">
        <label htmlFor="candidate-search" className="mb-1.5 block text-xs font-semibold text-text-secondary">
          Search candidates
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="candidate-search"
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Name, candidate ID, phone, email, or position"
            aria-describedby="candidate-search-help"
            className="min-h-11 w-full rounded-lg border border-border bg-surface pl-9 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <span id="candidate-search-help" className="sr-only">
            Search by name, candidate ID, phone, email, or position
          </span>
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear candidate search"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <div className="w-full md:w-48">
        <label htmlFor="candidate-stage-filter" className="mb-1.5 block text-xs font-semibold text-text-secondary">
          Pipeline stage
        </label>
        <Select
          id="candidate-stage-filter"
          value={stageFilter}
          onChange={(event) => onStageChange(event.target.value as PipelineStage | '')}
          className="h-11 rounded-lg bg-surface text-sm text-text-primary"
        >
          <option value="">All stages</option>
          {stages.map((stage) => <option key={stage} value={stage}>{stage.replace(/_/g, ' ')}</option>)}
        </Select>
      </div>
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="min-h-11 shrink-0 rounded-lg px-2 text-sm font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
