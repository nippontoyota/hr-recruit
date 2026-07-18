import type { Candidate, ResumeDocument, HRInterviewData, ActivityLog } from '../types';
import { request } from './client';

export const getCandidates = async (): Promise<Candidate[]> => {
  const response = await request('GET', '/candidates');
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

export const unholdCandidate = async (candidateId: string, remarks?: string): Promise<Candidate> => {
  const response = await request('POST', `/candidates/${candidateId}/unhold`, { remarks });
  return response.data;
};

export const deleteCandidate = async (candidateId: string): Promise<void> => {
  await request('DELETE', `/candidates/${candidateId}`);
};

export const getScreening = async (candidateId: string): Promise<any> => {
  const response = await request('GET', `/candidates/${candidateId}/screening`);
  return response.data;
};

export interface ScreeningSubmitResponse {
  screening: Record<string, unknown>;
  candidate?: Candidate;
}

export const submitScreening = async (candidateId: string, data: Record<string, unknown>): Promise<ScreeningSubmitResponse> => {
  const response = await request('POST', `/candidates/${candidateId}/screening`, data);
  return response.data;
};

export const sendPreForm = async (candidateId: string): Promise<any> => {
  const response = await request('POST', `/candidates/${candidateId}/pre-form/send`);
  return response.data;
};

export const getHRInterview = async (candidateId: string): Promise<HRInterviewData> => {
  const response = await request('GET', `/candidates/${candidateId}/hr-interview`);
  return response.data;
};

export const submitHRInterview = async (candidateId: string, data: HRInterviewData): Promise<HRInterviewData> => {
  const response = await request('POST', `/candidates/${candidateId}/hr-interview`, data);
  return response.data;
};

export const sendWhatsAppInvite = async (
  candidateId: string,
  variables: Record<string, string>
): Promise<any> => {
  const response = await request('POST', `/candidates/${candidateId}/whatsapp-invite`, { variables });
  return response.data;
};

export const sendHRInterviewInvite = async (
  candidateId: string,
  variables: Record<string, string>
): Promise<any> => {
  const response = await request('POST', `/candidates/${candidateId}/hr-interview/send-invite`, { variables });
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
