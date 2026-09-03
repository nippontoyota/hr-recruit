import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { mockOutcomesData } from './mockData';
import { useEffect } from 'react';
import { LoadingSpinner, Badge } from '../../../components/ui';
import { Search, Building2, MapPin, CheckCircle, XCircle, ExternalLink, CalendarDays } from 'lucide-react';
import { getStageBadgeVariant, stageLabel } from '../../../lib/stages';
import { formatDate } from '../../../lib/dateTime';
import type { PipelineStage } from '../../../types';

type FilterMode = 'ALL' | 'HIRED' | 'REJECTED';

export default function AdminOutcomesList() {
  const navigate = useNavigate();
  
  // Fetch a large batch to filter outcomes locally
  const [candidates, setCandidates] = useState<any>({ data: [], total_count: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      let filtered = mockOutcomesData.paginated_results.data;
      if (searchQuery) {
        filtered = filtered.filter((c: any) => c.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      setCandidates({ data: filtered, total_count: filtered.length });
      setLoading(false);
    }, 500);
  }, [searchQuery]);

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [filterMode, setFilterMode] = useState<FilterMode>('ALL');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
  };

  const outcomeCandidates = useMemo(() => {
    return candidates.filter(c => c.current_stage === 'HIRED' || c.current_stage === 'REJECTED');
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    return outcomeCandidates.filter(c => {
      if (filterMode === 'HIRED' && c.current_stage !== 'HIRED') return false;
      if (filterMode === 'REJECTED' && c.current_stage !== 'REJECTED') return false;
      return true;
    }).sort((a, b) => {
      // Sort by resolution date (newest first)
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [outcomeCandidates, filterMode]);

  // Analytics Math
  const totalHired = outcomeCandidates.filter(c => c.current_stage === 'HIRED').length;
  const totalRejected = outcomeCandidates.filter(c => c.current_stage === 'REJECTED').length;
  const totalProcessed = totalHired + totalRejected;
  const conversionRate = totalProcessed > 0 ? ((totalHired / totalProcessed) * 100).toFixed(1) : '0.0';

  return (
    <div className="p-6 w-full space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
              <CheckCircle size={20} strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">Hiring Outcomes</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1 font-medium">Analytics for all explicitly resolved candidates (Hired vs Rejected).</p>
        </div>
      </div>

      {/* Mini-Dashboard Analytics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Total Processed</p>
          <div className="text-3xl font-black text-gray-900">{totalProcessed}</div>
        </div>
        <div className="bg-white border border-emerald-100 rounded-xl p-4 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <CheckCircle size={40} className="text-emerald-500" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/80 mb-1">Total Hired</p>
          <div className="text-3xl font-black text-emerald-600">{totalHired}</div>
        </div>
        <div className="bg-white border border-rose-100 rounded-xl p-4 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <XCircle size={40} className="text-rose-500" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600/80 mb-1">Total Rejected</p>
          <div className="text-3xl font-black text-rose-600">{totalRejected}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-sm flex flex-col justify-center text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Conversion Rate</p>
          <div className="text-3xl font-black text-white">{conversionRate}%</div>
        </div>
      </div>

      {/* Toolbar & Data Table Container */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
        
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-3 border-b border-gray-100 bg-gray-50/50">
          {/* Segmented Control */}
          <div className="flex p-0.5 bg-gray-200/50 rounded-lg border border-gray-200/50">
            {(['ALL', 'HIRED', 'REJECTED'] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`relative px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  filterMode === mode ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {filterMode === mode && (
                  <motion.div
                    layoutId="outcomeTab"
                    className="absolute inset-0 bg-white rounded-md shadow-sm border border-gray-200/50"
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">
                  {mode === 'ALL' ? 'All Outcomes' : mode === 'HIRED' ? 'Hired Only' : 'Rejected Only'}
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
              className="block w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium bg-white placeholder-gray-400 text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors shadow-sm"
              placeholder="Search outcome history..."
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
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Branch / Dept</th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Resolution Date</th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Final Outcome</th>
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
                    No resolved candidates found in this category.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-600 font-bold">
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
                      <div className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                        <CalendarDays size={14} className="text-gray-400" />
                        {candidate.updated_at ? formatDate(candidate.updated_at) : 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={getStageBadgeVariant(candidate.current_stage)}>
                        {stageLabel(candidate.current_stage)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => navigate(`/candidates/${candidate.id}`)}
                        className="text-gray-400 hover:text-gray-900 p-2 rounded-xl hover:bg-gray-100 transition-all inline-flex items-center gap-2 font-bold opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        Review Profile <ExternalLink size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
