import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCandidatesList } from '../../hooks/api/useCandidates';
import { getBottlenecks } from '../../api/admin';
import { LoadingSpinner, Badge } from '../../components/ui';
import { Search, ChevronLeft, Building2, MapPin, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import { getStageBadgeVariant, stageLabel } from '../../lib/stages';
import type { PipelineStage } from '../../types';
import { motion } from 'framer-motion';

function formatDaysStalled(updatedAtStr: string): { text: string, isCritical: boolean } {
  if (!updatedAtStr) return { text: 'Unknown', isCritical: false };
  const updatedDate = new Date(updatedAtStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - updatedDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return {
    text: diffDays === 0 ? 'Updated today' : diffDays === 1 ? '1 day' : `${diffDays} days`,
    isCritical: diffDays >= 3
  };
}

type FilterMode = 'ALL' | 'ON_HOLD' | 'INTERVIEWS';

export default function AdminBottlenecksList() {
  const navigate = useNavigate();
  
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');

  const [localSearch, setLocalSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('ALL');

  const fetchBottlenecks = async () => {
    setLoading(true);
    try {
      const res = await getBottlenecks(page, limit, searchQuery, filterMode);
      setCandidates(res.data);
      setTotalCount(res.total_count);
    } catch (e) {
      console.error(e);
      setCandidates([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBottlenecks();
  }, [page, limit, searchQuery, filterMode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
    setPage(1);
  };
  
  const totalPages = Math.ceil(totalCount / limit) || 1;

  const filteredCandidates = candidates;

  return (
    <div className="p-6 w-full space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg">
              <AlertTriangle size={20} strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">Needs Attention</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1 font-medium">Candidates stalled in interviews or explicitly placed on hold.</p>
        </div>
      </div>

      {/* Toolbar & Data Table Container */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col">
        
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-3 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
          {/* Segmented Control */}
          <div className="flex p-0.5 bg-gray-200/50 rounded-lg border border-gray-200/50">
            {(['ALL', 'INTERVIEWS', 'ON_HOLD'] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`relative px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  filterMode === mode ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {filterMode === mode && (
                  <motion.div
                    layoutId="bottleneckTab"
                    className="absolute inset-0 bg-white rounded-md shadow-sm border border-gray-200/50"
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">
                  {mode === 'ALL' ? 'All Issues' : mode === 'INTERVIEWS' ? 'Pending Interviews' : 'On Hold'}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium bg-white placeholder-gray-400 text-gray-900 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors shadow-sm"
              placeholder="Search stalled candidates..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </form>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Candidate Info</th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Responsible Branch</th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Stuck Stage</th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-rose-500 uppercase tracking-wider">Time In Stage (SLA)</th>
                <th scope="col" className="px-6 py-4 text-right text-[11px] font-black text-gray-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {loading && candidates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex justify-center"><LoadingSpinner size="lg" /></div>
                  </td>
                </tr>
              ) : filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-gray-400 font-medium">
                    No bottleneck candidates found. The pipeline is flowing smoothly!
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((candidate) => {
                  const staleness = formatDaysStalled(candidate.updated_at);
                  return (
                    <tr key={candidate.id} className={`hover:bg-gray-50/80 transition-colors group ${staleness.isCritical ? 'bg-rose-50/30' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center border font-bold ${staleness.isCritical ? 'bg-rose-100 border-rose-200 text-rose-700' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>
                            {candidate.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-gray-900">{candidate.full_name}</div>
                            <div className="text-xs font-medium text-gray-500 mt-0.5">{candidate.email || candidate.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                          <MapPin size={14} className="text-gray-400" /> {candidate.branch_location || 'Head Office'}
                        </div>
                        <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mt-1">
                          <Building2 size={12} className="text-gray-400" /> {candidate.department || 'Unspecified'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getStageBadgeVariant(candidate.current_stage)}>
                          {stageLabel(candidate.current_stage)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold ${staleness.isCritical ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'}`}>
                          <Clock size={14} />
                          {staleness.text}
                        </div>
                        {staleness.isCritical && (
                          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-500 mt-1.5 ml-1">
                            SLA Breached
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => navigate(`/candidates/${candidate.id}`)}
                          className="text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white px-4 py-2 rounded-xl transition-all inline-flex items-center gap-2 font-bold opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          Review <ExternalLink size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="bg-gray-50/50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-bold rounded-xl text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-bold rounded-xl text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Showing <span className="font-bold text-gray-900">{Math.min((page - 1) * limit + 1, totalCount)}</span> to <span className="font-bold text-gray-900">{Math.min(page * limit, totalCount)}</span> of <span className="font-bold text-gray-900">{totalCount}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-xl shadow-sm -space-x-px overflow-hidden" aria-label="Pagination">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-3 py-2 border border-gray-200 bg-white text-sm font-bold text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border-y border-gray-200 bg-gray-50 text-sm font-bold text-gray-700">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                    className="relative inline-flex items-center px-3 py-2 border border-gray-200 bg-white text-sm font-bold text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
