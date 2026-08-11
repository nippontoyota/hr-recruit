import type { Candidate, ResumeDocument, BranchInterviewData, ActivityLog, PipelineStage } from '../types';
import { request } from './client';

export interface PaginatedCandidates {
  data: Candidate[];
  total_count: number;
  page: number;
  limit: number;
}

export const getCandidates = async (
  page: number = 1,
  limit: number = 50,
  search?: string,
  stage?: PipelineStage | ''
): Promise<PaginatedCandidates> => {
  const query = new URLSearchParams();
  query.append('page', page.toString());
  query.append('limit', limit.toString());
  if (search) query.append('search', search);
  if (stage) query.append('stage', stage);

  const response = await request('GET', `/candidates?${query.toString()}`);
  return response.data;
};

export const getCandidateById = async (id: string): Promise<Candidate | undefined> => {
  const response = await request('GET', `/candidates/${id}`);
  return response.data;
};

export const updateCandidateRawData = async (id: string, rawData: Record<string, any>): Promise<Candidate> => {
  const response = await request('PATCH', `/candidates/${id}/profile/raw_data`, { raw_data: rawData });
  return response.data;
};

export const createCandidate = async (candidateData: Partial<Candidate>): Promise<Candidate> => {
  const response = await request('POST', '/candidates', candidateData);
  return response.data;
};



export const uploadResume = async (candidateId: string, file: File, options?: { public?: boolean }): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  const path = options?.public
    ? `/candidates/public-resume/${candidateId}`
    : `/candidates/${candidateId}/resume`;

  const response = await request('POST', path, formData);
  return response.data;
};

export const getCandidateResume = async (candidateId: string): Promise<ResumeDocument> => {
  const response = await request('GET', `/candidates/${candidateId}/resume`);
  return response.data;
};

export const publicApplyCandidate = async (candidateData: any, hrId: string): Promise<Candidate> => {
  const response = await request('POST', `/candidates/public-apply?hr_id=${hrId}`, candidateData);
  return response.data;
};

export const getRecruiterPublic = async (hrId: string): Promise<{ full_name: string; branch_location?: string }> => {
  const response = await request('GET', `/auth/users/${hrId}/public`);
  return response.data;
};

export const fetchPublicPreForm = async (token: string) => {
  const res = await request('GET', `/candidates/public-pre-form/${token}`);
  return res.data;
};

export const submitPublicPreForm = async (token: string, data: any) => {
  const res = await request('POST', `/candidates/public-pre-form/${token}`, data);
  return res.data;
};

export const fetchPublicPostForm = async (token: string) => {
  const res = await request('GET', `/candidates/public-post-form/${token}`);
  return res.data;
};

export const submitPublicPostForm = async (token: string, data: any) => {
  const res = await request('POST', `/candidates/public-post-form/${token}`, data);
  return res.data;
};

export const sendPostForm = async (id: string) => {
  const res = await request('POST', `/candidates/${id}/post-form/send`);
  return res.data;
};

export const publicGetBasicCandidate = async (candidateId: string): Promise<Candidate> => {
  const response = await request('GET', `/candidates/public-basic/${candidateId}`);
  return response.data;
};

export const publicUpdateBasicCandidate = async (candidateId: string, data: any): Promise<Candidate> => {
  const response = await request('POST', `/candidates/public-update-basic/${candidateId}`, data);
  return response.data;
};

export const publicGetFullStatus = async (candidateId: string): Promise<{ full_name: string; is_awaiting_full_fill: boolean }> => {
  const response = await request('GET', `/candidates/public-full-status/${candidateId}`);
  return response.data;
};

export const publicApplyFullCandidate = async (candidateId: string, data: any): Promise<Candidate> => {
  const response = await request('POST', `/candidates/public-apply-full/${candidateId}`, data);
  return response.data;
};

export const updateCandidateStage = async (candidateId: string, toStage: string, remarks?: string): Promise<Candidate> => {
  const response = await request('POST', `/candidates/${candidateId}/transition`, { to_stage: toStage, remarks });
  return response.data;
};

export const sendToHeadOffice = async (candidateId: string): Promise<Candidate> => {
  const response = await request('POST', `/candidates/${candidateId}/send-to-ho`);
  return response.data;
};

export const updateCommunicationStatus = async (communicationId: string, status: string): Promise<any> => {
  const response = await request('POST', `/communications/${communicationId}/status`, { status });
  return response.data;
};

export const sendOfferLetter = async (candidateId: string): Promise<Candidate> => {
  const response = await request('POST', `/candidates/${candidateId}/offer-letter/send`);
  return response.data;
};

export const unholdCandidate = async (candidateId: string, remarks?: string): Promise<Candidate> => {
  const response = await request('POST', `/candidates/${candidateId}/unhold`, { remarks });
  return response.data;
};

export const deleteCandidate = async (candidateId: string): Promise<void> => {
  await request('DELETE', `/candidates/${candidateId}`);
};

export const bulkDeleteCandidates = async (candidateIds: string[]): Promise<{ success_count: number; failed_ids: string[] }> => {
  const response = await request('POST', `/candidates/bulk-delete`, { candidate_ids: candidateIds });
  return response.data;
};

export const updateVisitSchedule = async (candidateId: string, data: Record<string, unknown>): Promise<Candidate> => {
  const response = await request('PATCH', `/candidates/${candidateId}/visit-schedule`, data);
  return response.data;
};

export const sendPreForm = async (candidateId: string): Promise<any> => {
  const response = await request('POST', `/candidates/${candidateId}/pre-form/send`);
  return response.data;
};

export const getBranchInterview = async (candidateId: string): Promise<BranchInterviewData> => {
  const response = await request('GET', `/candidates/${candidateId}/branch-interview`);
  return response as BranchInterviewData;
};

export const submitBranchInterview = async (candidateId: string, data: BranchInterviewData): Promise<BranchInterviewData> => {
  // Use PATCH for submitting branch interview as per new router
  const response = await request('PATCH', `/candidates/${candidateId}/branch-interview`, data);
  return response as BranchInterviewData;
};

export const sendBranchInterviewInvite = async (
  candidateId: string,
  variables: Record<string, string>
): Promise<{ status: string; message: string }> => {
  const response = await request('POST', `/candidates/${candidateId}/branch-interview/send-invite`, { variables });
  return response.data;
};

export const sendWhatsAppInvite = async (
  candidateId: string,
  variables: Record<string, string>
): Promise<any> => {
  const response = await request('POST', `/candidates/${candidateId}/whatsapp-invite`, { variables });
  return response.data;
};



export const getActivityLogs = async (candidateId: string): Promise<ActivityLog[]> => {
  const response = await request('GET', `/candidates/${candidateId}/activity-logs`);
  return response.data;
};

export const resendPreForm = async (candidateId: string): Promise<Candidate> => {
  const response = await request('POST', `/candidates/${candidateId}/pre-form/send`);
  return response.data;
};

export const resolveDuplicateCandidate = async (candidateId: string, action: 'MERGE' | 'NOT_DUPLICATE'): Promise<void> => {
  await request('POST', `/candidates/${candidateId}/resolve-duplicate`, { action });
};

export const uploadCandidatePhoto = async (candidateId: string, file: File): Promise<{ status: string, photo_url: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await request('POST', `/candidates/${candidateId}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const uploadPublicCandidatePhoto = async (candidateId: string, file: File): Promise<{ status: string, photo_url: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await request('POST', `/candidates/public-photo/${candidateId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};



export const uploadBulkSalary = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await request('POST', '/candidates/bulk-salary', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
