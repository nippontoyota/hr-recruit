import { request } from './client';

export interface BottleneckStats {
  on_hold: number;
  pending_interviews: number;
}

export interface CandidateDetail {
  id: string;
  full_name: string;
  department: string | null;
  current_stage: string;
  created_at: string;
}

export interface BranchCandidateData {
  branch_name: string;
  candidates: CandidateDetail[];
}

export interface AdminDashboardStats {
  total_candidates: number;
  conversion_rate: number;
  stage_breakdown: Record<string, number>;
  bottlenecks: BottleneckStats;
  branch_data: BranchCandidateData[];
}

export const getAdminDashboardStats = async (): Promise<AdminDashboardStats> => {
  const response = await request('GET', '/admin/dashboard-stats');
  return response.data;
};

export const getBottlenecks = async (
  page: number = 1,
  limit: number = 50,
  search?: string,
  filterMode: string = 'ALL'
): Promise<any> => {
  const query = new URLSearchParams();
  query.append('page', page.toString());
  query.append('limit', limit.toString());
  if (search) query.append('search', search);
  if (filterMode) query.append('filter_mode', filterMode);

  const response = await request('GET', `/admin/bottlenecks?${query.toString()}`);
  return response.data;
};
