import React, { useEffect, useState } from 'react';
import { getAdminDashboardStats, type AdminDashboardStats } from '../../api/admin';
import { LoadingSpinner } from '../../components/ui';
import { toast } from 'sonner';
import { Users, AlertTriangle, CheckCircle, Shield, ChevronRight } from 'lucide-react';
import { ALL_PIPELINE_STAGES } from '../../types';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getAdminDashboardStats();
        setStats(data);
      } catch (err) {
        toast.error('Failed to load admin dashboard stats');
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="p-6 w-full space-y-8 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Admin Workspace</h1>
        </div>
      </div>

      {/* 4 Deep Shiny Managerial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Active Pipeline (Deep Orange) */}
        <Link to="/admin/pipeline" className="group bg-gradient-to-br from-orange-600 via-orange-400 to-orange-700 bg-[length:200%_200%] bg-left hover:bg-right transition-all duration-700 ease-out rounded-xl p-6 shadow-lg shadow-orange-900/20 border border-white/20 text-white relative overflow-hidden block cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
          <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-20 group-hover:opacity-30 transition-opacity">
            <Users size={120} />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-orange-100 mb-1 drop-shadow-sm">Active Pipeline</p>
              <h3 className="text-5xl font-black text-white mt-1 drop-shadow-md">{stats.total_candidates}</h3>
            </div>
            <div className="mt-6 flex items-center font-medium text-sm text-orange-50 group-hover:text-white transition-colors">
              View All Candidates <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Card 2: Needs Attention (Deep Red) */}
        <Link to="/admin/bottlenecks" className="group bg-gradient-to-br from-rose-600 via-rose-400 to-rose-700 bg-[length:200%_200%] bg-left hover:bg-right transition-all duration-700 ease-out rounded-xl p-6 shadow-lg shadow-rose-900/20 border border-white/20 text-white relative overflow-hidden block cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
          <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-20 group-hover:opacity-30 transition-opacity">
            <AlertTriangle size={120} />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-100 mb-1 drop-shadow-sm">Needs Attention</p>
              <h3 className="text-5xl font-black text-white mt-1 drop-shadow-md">
                {stats.bottlenecks.on_hold + stats.bottlenecks.pending_interviews}
              </h3>
            </div>
            <div className="mt-6 flex items-center font-medium text-sm text-rose-50 group-hover:text-white transition-colors">
              View Bottlenecks <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Card 3: Hiring Success (Deep Green) */}
        <Link to="/admin/outcomes" className="group bg-gradient-to-br from-emerald-600 via-emerald-400 to-emerald-700 bg-[length:200%_200%] bg-left hover:bg-right transition-all duration-700 ease-out rounded-xl p-6 shadow-lg shadow-emerald-900/20 border border-white/20 text-white relative overflow-hidden block cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
          <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-20 group-hover:opacity-30 transition-opacity">
            <CheckCircle size={120} />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-100 mb-1 drop-shadow-sm">Hiring Success</p>
              <h3 className="text-5xl font-black text-white mt-1 drop-shadow-md">{stats.conversion_rate.toFixed(1)}%</h3>
            </div>
            <div className="mt-6 flex items-center font-medium text-sm text-emerald-50 group-hover:text-white transition-colors drop-shadow-sm">
              View Analytics <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Card 4: HR Team Management (Deep Blue) */}
        <Link to="/admin/users" className="group bg-gradient-to-br from-blue-600 via-blue-400 to-blue-800 bg-[length:200%_200%] bg-left hover:bg-right transition-all duration-700 ease-out rounded-xl p-6 shadow-lg shadow-blue-900/20 border border-white/20 text-white relative overflow-hidden flex flex-col h-full justify-between cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
          <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-20 group-hover:opacity-30 transition-opacity">
            <Shield size={120} />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-200 mb-1 drop-shadow-sm">Team Management</p>
              <h3 className="text-4xl font-black text-white mt-1 leading-tight drop-shadow-md">Access & Roles</h3>
            </div>
            <div className="mt-6 flex items-center font-medium text-sm text-blue-50 group-hover:text-white transition-colors">
              Manage Team <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </div>

      {/* Main Content Area: Pipeline & Branches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Stage Breakdown */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm lg:col-span-1">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Pipeline Breakdown</h2>
          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {ALL_PIPELINE_STAGES.map(stage => {
              const count = stats.stage_breakdown[stage] || 0;
              if (count === 0) return null;
              
              return (
                <div key={stage} className="flex items-center justify-between group py-1">
                  <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                    {stage.replace(/_/g, ' ')}
                  </span>
                  <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-full border border-gray-200">
                    {count}
                  </span>
                </div>
              );
            })}
            {Object.keys(stats.stage_breakdown).length === 0 && (
              <div className="text-center text-gray-500 text-sm py-8">No active candidates in pipeline</div>
            )}
          </div>
        </div>

        {/* Branch Data */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Branch Directory Overview</h2>
            <span className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-md border border-gray-200">
              {stats.branch_data.length} Branches Active
            </span>
          </div>
          
          <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {stats.branch_data.map(branch => (
              <div key={branch.branch_name} className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <div className="px-5 py-4 bg-white border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900">{branch.branch_name}</h3>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                    {branch.candidates.length} candidates
                  </span>
                </div>
                
                {branch.candidates.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[10px] text-gray-500 uppercase bg-gray-50/80 sticky top-0 backdrop-blur-sm">
                        <tr>
                          <th className="px-5 py-3 font-bold tracking-wider">Name</th>
                          <th className="px-5 py-3 font-bold tracking-wider">Position</th>
                          <th className="px-5 py-3 font-bold tracking-wider">Stage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {branch.candidates.map(c => (
                          <tr key={c.id} className="hover:bg-white transition-colors">
                            <td className="px-5 py-3 font-medium text-gray-900">{c.full_name}</td>
                            <td className="px-5 py-3 text-gray-500 text-xs">{c.department || '—'}</td>
                            <td className="px-5 py-3">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider bg-gray-100 text-gray-700 border border-gray-200">
                                {c.current_stage.replace(/_/g, ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-5 text-center text-sm text-gray-500">
                    No candidates currently in this branch
                  </div>
                )}
              </div>
            ))}
            {stats.branch_data.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-8">No branches found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
