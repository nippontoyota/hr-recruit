import type { Candidate } from '../types';
import api from './client';
import { IS_MOCK } from '../lib/env';

// Mock data until backend is ready
const MOCK_CANDIDATES: Candidate[] = [
  {
    id: '1',
    candidate_id: 'CAND-001',
    full_name: 'Rahul Sharma',
    phone: '+91 9876543210',
    email: 'rahul.s@example.com',
    source_channel: 'LinkedIn',
    current_stage: 'NEW_APPLICATION',
    is_duplicate_flagged: false,
    is_rejoining: false,
    applied_at: new Date().toISOString(),
  },
  {
    id: '2',
    candidate_id: 'CAND-002',
    full_name: 'Priya Patel',
    phone: '+91 9876543211',
    email: 'priya.p@example.com',
    source_channel: 'Referral',
    current_stage: 'LOCAL_HR_REVIEW_COMPLETE',
    is_duplicate_flagged: false,
    is_rejoining: true,
    applied_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '3',
    candidate_id: 'CAND-003',
    full_name: 'Amit Kumar',
    phone: '+91 9876543212',
    source_channel: 'Website',
    current_stage: 'OFFER_SENT',
    is_duplicate_flagged: true,
    is_rejoining: false,
    applied_at: new Date(Date.now() - 172800000).toISOString(),
  }
];

export const getCandidates = async (): Promise<Candidate[]> => {
  if (IS_MOCK) {
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_CANDIDATES), 500));
  }
  
  const response = await api.get('/candidates');
  return response.data;
};

export const getCandidateById = async (id: string): Promise<Candidate | undefined> => {
  const useMock = import.meta.env.VITE_USE_MOCK_AUTH === 'true';
  
  if (useMock) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_CANDIDATES.find(c => c.id === id));
      }, 500);
    });
  }
  
  const response = await api.get(`/candidates/${id}`);
  return response.data;
};

export const createCandidate = async (candidateData: Partial<Candidate>): Promise<Candidate> => {
  if (IS_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newCandidate: Candidate = {
          ...candidateData,
          id: Math.random().toString(36).substr(2, 9),
          candidate_id: `CAND-00${MOCK_CANDIDATES.length + 1}`,
          current_stage: 'NEW_APPLICATION',
          is_duplicate_flagged: false,
          is_rejoining: false,
          applied_at: new Date().toISOString(),
        } as Candidate;
        MOCK_CANDIDATES.push(newCandidate);
        resolve(newCandidate);
      }, 500);
    });
  }

  const response = await api.post('/candidates', candidateData);
  return response.data;
};

export const uploadResume = async (candidateId: string, file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post(`/candidates/${candidateId}/resume`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const publicApplyCandidate = async (candidateData: any, hrId: string): Promise<Candidate> => {
  const response = await api.post(`/candidates/public-apply?hr_id=${hrId}`, candidateData);
  return response.data;
};

export const getRecruiterPublic = async (hrId: string): Promise<{ full_name: string; branch_location?: string }> => {
  const response = await api.get(`/auth/users/${hrId}/public`);
  return response.data;
};

export const publicGetBasicCandidate = async (candidateId: string): Promise<Candidate> => {
  const response = await api.get(`/candidates/public-basic/${candidateId}`);
  return response.data;
};

export const publicUpdateBasicCandidate = async (candidateId: string, data: any): Promise<Candidate> => {
  const response = await api.post(`/candidates/public-update-basic/${candidateId}`, data);
  return response.data;
};

export const publicGetFullStatus = async (candidateId: string): Promise<{ full_name: string; is_awaiting_full_fill: boolean }> => {
  const response = await api.get(`/candidates/public-full-status/${candidateId}`);
  return response.data;
};

export const publicApplyFullCandidate = async (candidateId: string, data: any): Promise<Candidate> => {
  const response = await api.post(`/candidates/public-apply-full/${candidateId}`, data);
  return response.data;
};

export const updateCandidateStage = async (candidateId: string, toStage: string, reason?: string): Promise<Candidate> => {
  const response = await api.post(`/candidates/${candidateId}/stage`, { to_stage: toStage, reason });
  return response.data;
};




