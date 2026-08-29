import type { DashboardStatsOut, CandidateListOut } from '../../../types';

export const mockDashboardStats: DashboardStatsOut = {
  total_active: 142,
  bottlenecks: {
    pending_interviews: 24,
    on_hold: 11
  },
  conversion_rate: 68.5,
  stage_breakdown: {
    NEW_APPLICATION: 12,
    PRE_INTERVIEW_FORM: 34,
    SCREENING: 45,
    INTERVIEW: 22,
    OFFER: 29
  },
  branch_data: [
    {
      branch_name: 'Trivandrum',
      candidates: [
        { id: '1', full_name: 'Alice Johnson', department: 'Sales', current_stage: 'SCREENING' },
        { id: '2', full_name: 'Bob Smith', department: 'Service', current_stage: 'INTERVIEW' }
      ] as any[]
    },
    {
      branch_name: 'Cochin',
      candidates: [
        { id: '3', full_name: 'Charlie Davis', department: 'Management', current_stage: 'OFFER' }
      ] as any[]
    }
  ]
};

export const mockPipelineData = {
  total_count: 5,
  data: [
    {
      id: '1', candidate_id: 'NT-1', full_name: 'Sarah Connor', phone: '9876543210', email: 'sarah@example.com',
      source: 'LinkedIn', department: 'Sales', position_applied_for: 'Sales Executive', experience: '3 Years',
      current_stage: 'INTERVIEW', branch_location: 'Trivandrum', is_duplicate_flagged: false, updated_at: new Date().toISOString()
    },
    {
      id: '2', candidate_id: 'NT-2', full_name: 'John Connor', phone: '9876543211', email: 'john@example.com',
      source: 'Direct', department: 'IT', position_applied_for: 'System Admin', experience: 'Fresher',
      current_stage: 'SCREENING', branch_location: 'Cochin', is_duplicate_flagged: false, updated_at: new Date().toISOString()
    },
    {
      id: '3', candidate_id: 'NT-3', full_name: 'Kyle Reese', phone: '9876543212', email: 'kyle@example.com',
      source: 'Referral', department: 'Service', position_applied_for: 'Technician', experience: '5 Years',
      current_stage: 'OFFER', branch_location: 'Kottayam', is_duplicate_flagged: false, updated_at: new Date().toISOString()
    }
  ] as any[]
};

export const mockBottlenecksData = {
  total_count: 2,
  data: [
    {
      id: '4', candidate_id: 'NT-4', full_name: 'Miles Dyson', phone: '9876543213', email: 'miles@example.com',
      department: 'IT', position_applied_for: 'Developer', current_stage: 'PENDING_INTERVIEW',
      branch_location: 'Trivandrum', updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '5', candidate_id: 'NT-5', full_name: 'Peter Silberman', phone: '9876543214', email: 'peter@example.com',
      department: 'HR', position_applied_for: 'Recruiter', current_stage: 'ON_HOLD',
      branch_location: 'Cochin', updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    }
  ] as any[]
};

export const mockOutcomesData = {
  metrics: {
    total_processed: 450,
    hired: 300,
    rejected: 150,
    conversion_rate: 66.67
  },
  paginated_results: {
    total_count: 3,
    data: [
      {
        id: '6', candidate_id: 'NT-6', full_name: 'Marcus Wright', phone: '9876543215', email: 'marcus@example.com',
        department: 'Security', position_applied_for: 'Guard', current_stage: 'HIRED',
        branch_location: 'Trivandrum', updated_at: new Date().toISOString()
      },
      {
        id: '7', candidate_id: 'NT-7', full_name: 'Blair Williams', phone: '9876543216', email: 'blair@example.com',
        department: 'Operations', position_applied_for: 'Manager', current_stage: 'REJECTED',
        branch_location: 'Cochin', updated_at: new Date().toISOString()
      },
      {
        id: '8', candidate_id: 'NT-8', full_name: 'Serena Kogan', phone: '9876543217', email: 'serena@example.com',
        department: 'Research', position_applied_for: 'Scientist', current_stage: 'HIRED',
        branch_location: 'Trivandrum', updated_at: new Date().toISOString()
      }
    ] as any[]
  }
};
