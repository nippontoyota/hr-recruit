import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getCandidates, getCandidateWorkStates } from '../../api/candidates';
import type { Candidate, PipelineStage } from '../../types';
import { extractError, isAbortError } from '../../lib/utils';
import { emptyCandidateListQuery, type CandidateListQueryState } from '../../lib/candidateListQuery';

const CANDIDATE_LIST_CACHE_TTL_MS = 60_000;
const CANDIDATE_LIST_CACHE_PREFIX = 'candidate-list-cache:v1:';

type CandidateListCache = {
  data: Candidate[];
  totalCount: number;
  cachedAt: number;
};

function candidateListCacheKey(
  page: number,
  limit: number,
  query: CandidateListQueryState,
  stageFilter: PipelineStage | '',
): string {
  let userId = 'anonymous';
  try {
    const storedUser = localStorage.getItem('user');
    const parsed = storedUser ? JSON.parse(storedUser) as { id?: string } : null;
    userId = parsed?.id || userId;
  } catch {
    // A missing or malformed local user should never block the live request.
  }
  return `${CANDIDATE_LIST_CACHE_PREFIX}${userId}:${JSON.stringify({
    page,
    limit,
    query,
    stageFilter,
  })}`;
}

function readCandidateListCache(key: string): CandidateListCache | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CandidateListCache;
    if (!Array.isArray(cached.data) || typeof cached.totalCount !== 'number' || typeof cached.cachedAt !== 'number') {
      sessionStorage.removeItem(key);
      return null;
    }
    if (Date.now() - cached.cachedAt > CANDIDATE_LIST_CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return cached;
  } catch {
    return null;
  }
}

function writeCandidateListCache(key: string, data: Candidate[], totalCount: number) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, totalCount, cachedAt: Date.now() } satisfies CandidateListCache));
  } catch {
    // Cache is an optional latency optimization; quota/security errors are harmless.
  }
}

export function useCandidatesList(initialPage = 1, initialLimit = 50) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadedRef = useRef(false);
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<PipelineStage | ''>('');
  const [advancedQuery, setAdvancedQuery] = useState<CandidateListQueryState>(emptyCandidateListQuery);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  const refetch = useCallback(async (signal?: AbortSignal) => {
    const requestQuery = {
      ...advancedQuery,
      search: debouncedSearch,
      stages: stageFilter ? [stageFilter] : advancedQuery.stages,
    };
    const cacheKey = candidateListCacheKey(page, limit, requestQuery, stageFilter);
    const cached = readCandidateListCache(cacheKey);
    if (cached) {
      setCandidates(cached.data);
      setTotalCount(cached.totalCount);
      setLoadError(null);
      loadedRef.current = true;
    }
    if (!loadedRef.current) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await getCandidates(page, limit, requestQuery, signal, false);
      if (signal?.aborted) return;
      setCandidates(res.data);
      setTotalCount(res.total_count);
      setLoadError(null);
      writeCandidateListCache(cacheKey, res.data, res.total_count);
      loadedRef.current = true;
      void getCandidateWorkStates(res.data.map((candidate) => candidate.id), signal)
        .then((workStates) => {
          if (signal?.aborted) return;
          const merged = res.data.map((candidate) => ({
            ...candidate,
            work_state: workStates[candidate.id] ?? candidate.work_state,
          }));
          setCandidates(merged);
          writeCandidateListCache(cacheKey, merged, res.total_count);
        })
        .catch((err) => {
          if (!signal?.aborted && !isAbortError(err)) {
            // Queue metadata is supplementary; the candidate list remains usable.
          }
        });
    } catch (err) {
      if (signal?.aborted || isAbortError(err)) return;
      const message = extractError(err, 'Failed to load candidates');
      if (!message) return;
      setLoadError(message);
      if (!loadedRef.current) {
        setCandidates([]);
        setTotalCount(0);
      }
      toast.error(message);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [page, limit, debouncedSearch, stageFilter, advancedQuery]);

  useEffect(() => {
    const controller = new AbortController();
    void refetch(controller.signal);
    return () => controller.abort();
  }, [refetch]);

  return {
    candidates,
    totalCount,
    loading,
    refreshing,
    loadError,
    page,
    setPage,
    searchQuery,
    setSearchQuery,
    stageFilter,
    setStageFilter,
    advancedQuery,
    setAdvancedQuery,
    activeFilterCount: [searchQuery, stageFilter, advancedQuery.stages.length, advancedQuery.offerStatuses.length, advancedQuery.branches.length, advancedQuery.sources.length, advancedQuery.position, advancedQuery.nextActions.length, advancedQuery.createdDate, advancedQuery.sentDate].filter(Boolean).length,
    limit,
    refetch,
  };
}
