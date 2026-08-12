import { useCallback, useEffect, useState } from 'react';
import { getCandidates } from '../../api/candidates';
import type { Candidate, PipelineStage } from '../../types';

export function useCandidatesList(initialPage = 1, initialLimit = 50) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<PipelineStage | ''>('');

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCandidates(page, limit, searchQuery || undefined, stageFilter || undefined);
      setCandidates(res.data);
      setTotalCount(res.total_count);
    } catch {
      setCandidates([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery, stageFilter]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    candidates,
    totalCount,
    loading,
    page,
    setPage,
    searchQuery,
    setSearchQuery,
    stageFilter,
    setStageFilter,
    limit,
    refetch,
  };
}
