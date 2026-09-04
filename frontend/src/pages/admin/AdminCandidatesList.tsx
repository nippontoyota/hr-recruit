import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCandidatesList } from '../../hooks/api/useCandidates';
import { getAdminDashboardStats, type AdminDashboardStats } from '../../api/admin';
import { LoadingSpinner, Badge } from '../../components/ui';
import { Search, ChevronLeft, Building2, MapPin, Calendar, ExternalLink } from 'lucide-react';
import { getStageBadgeVariant, stageLabel } from '../../lib/stages';
import { ALL_PIPELINE_STAGES } from '../../types';
import { formatDate as formatRecruitmentDate } from '../../lib/dateTime';

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return formatRecruitmentDate(dateStr);
}

export default function AdminCandidatesList() {
  const navigate = useNavigate();
  
  const {
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
  } = useCandidatesList(1, 50);

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);

  // Fetch stats once to populate the tabs with live counts
  useEffect(() => {
    getAdminDashboardStats().then(setStats).catch(console.error);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  // Render a single tab
  const renderTab = (stageKey: string | null, label: string, count: number | null) => {
    const isActive = stageFilter === stageKey;
    return (
      <button
        key={stageKey || 'all'}
        onClick={() => {
          setStageFilter(stageKey);
          setPage(1);
        }}
        className={`relative flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
          isActive 
            ? 'text-white' 
            : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-gray-200/50'
        }`}
      >
        {isActive && (
          <motion.div
            layoutId="pipelineTab"
            className="absolute inset-0 bg-orange-500 rounded-md shadow-sm border border-orange-600/50"
            initial={false}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2">
          {label}
          {count !== null && count !== undefined && (
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] transition-colors ${
              isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {count}
            </span>
          )}
        </span>
      </button>
    );
  };

  return (
    <div className="p-6 w-full space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Active Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Global, read-only view of all candidates across all branches.</p>
        </div>
      </div>

      {/* Toolbar & Data Table Container */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
        
        {/* Toolbar Top: Search & Overview */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-3 border-b border-gray-100 bg-gray-50/50">
          <div className="text-sm font-bold text-gray-600 pl-1">
            {stats ? `${stats.total_candidates} Total Candidates` : 'Loading pipeline...'}
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium bg-white placeholder-gray-400 text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors shadow-sm"
              placeholder="Search by name, phone, email..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </form>
        </div>

        {/* Toolbar Bottom: Stage Tabs (Scrollable) */}
        <div className="flex overflow-x-auto p-2 bg-gray-50/30 custom-scrollbar gap-2 border-b border-gray-100">
          {renderTab(null, "All", stats?.total_candidates)}
          
          {ALL_PIPELINE_STAGES.map(stage => {
            const count = stats?.stage_breakdown[stage] || 0;
            return renderTab(stage, stageLabel(stage), count);
          })}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Candidate Info</th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Branch / Dept</th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Current Stage</th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Application Date</th>
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
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-gray-400 font-medium">
                    No candidates found in this stage matching your search.
                  </td>
                </tr>
              ) : (
                candidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-orange-50 rounded-full flex items-center justify-center border border-orange-100 text-orange-600 font-bold">
                          {candidate.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{candidate.full_name}</div>
                          <div className="text-xs font-medium text-gray-500 mt-0.5">{candidate.email || candidate.phone || candidate.candidate_id}</div>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      {formatDate(candidate.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => navigate(`/candidates/${candidate.id}`)}
                        className="text-orange-600 bg-orange-50 hover:bg-orange-600 hover:text-white px-4 py-2 rounded-xl transition-all inline-flex items-center gap-2 font-bold opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        View <ExternalLink size={16} />
                      </button>
                    </td>
                  </tr>
                ))
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
