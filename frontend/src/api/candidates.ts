import type { Candidate, ResumeDocument } from '../types';
import api from './client';

export const getCandidates = async (): Promise<Candidate[]> => {
  const response = await api.get('/candidates');
  return response.data;
};

export const getCandidateById = async (id: string): Promise<Candidate | undefined> => {
  const response = await api.get(`/candidates/${id}`);
  return response.data;
};

export const createCandidate = async (candidateData: Partial<Candidate>): Promise<Candidate> => {
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

export const getCandidateResume = async (candidateId: string): Promise<ResumeDocument> => {
  const response = await api.get(`/candidates/${candidateId}/resume`);
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

export const updateCandidateStage = async (candidateId: string, toStage: string, remarks?: string): Promise<Candidate> => {
  const response = await api.post(`/candidates/${candidateId}/transition`, { to_stage: toStage, remarks });
  return response.data;
};

export const deleteCandidate = async (candidateId: string): Promise<void> => {
  await api.delete(`/candidates/${candidateId}`);
};

export const getActivityLogs = async (candidateId: string): Promise<any[]> => {
  const response = await api.get(`/candidates/${candidateId}/activity-logs`);
  return response.data;
};

export const getScreening = async (candidateId: string): Promise<any> => {
  const response = await api.get(`/candidates/${candidateId}/screening`);
  return response.data;
};

export const submitScreening = async (candidateId: string, data: any): Promise<any> => {
  const response = await api.post(`/candidates/${candidateId}/screening`, data);
  return response.data;
};

export const sendPreForm = async (candidateId: string): Promise<any> => {
  const response = await api.post(`/candidates/${candidateId}/pre-form/send`);
  return response.data;
};
