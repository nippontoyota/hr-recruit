import type { PipelineStage } from '../types';

export type CandidateSortField =
  | 'full_name'
  | 'position_applied_for'
  | 'current_stage'
  | 'offer_status'
  | 'branch_location'
  | 'source'
  | 'created_at'
  | 'pre_form_sent_at';

export interface CandidateListQueryState {
  search: string;
  stages: PipelineStage[];
  offerStatuses: string[];
  branches: string[];
  sources: string[];
  position: string;
  nextActions: string[];
  createdDate: string;
  sentDate: string;
  sortBy: CandidateSortField;
  sortDirection: 'asc' | 'desc';
}

export const emptyCandidateListQuery = (): CandidateListQueryState => ({
  search: '', stages: [], offerStatuses: [], branches: [], sources: [], position: '', nextActions: [],
  createdDate: '', sentDate: '', sortBy: 'created_at', sortDirection: 'desc',
});

export function candidateQueryParams(query: CandidateListQueryState, page: number, limit: number): URLSearchParams {
  const params = new URLSearchParams({ page: String(page), limit: String(limit), sort_by: query.sortBy, sort_direction: query.sortDirection });
  if (query.search.trim()) params.set('search', query.search.trim());
  query.stages.forEach((value) => params.append('stage', value));
  query.offerStatuses.forEach((value) => params.append('offer_status', value));
  query.branches.forEach((value) => params.append('branch', value));
  query.sources.forEach((value) => params.append('source', value));
  query.nextActions.forEach((value) => params.append('next_action', value));
  if (query.position.trim()) params.set('position', query.position.trim());
  if (query.createdDate) params.set('created_date', query.createdDate);
  if (query.sentDate) params.set('sent_date', query.sentDate);
  return params;
}

export function cycleSort(query: CandidateListQueryState, field: CandidateSortField): CandidateListQueryState {
  if (query.sortBy !== field) return { ...query, sortBy: field, sortDirection: 'asc' };
  return { ...query, sortDirection: query.sortDirection === 'asc' ? 'desc' : 'asc' };
}
