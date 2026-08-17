import type { Candidate, ResumeDocument, ActivityLog, PipelineStage } from '../types';
export interface CommunicationRecord {
  id: string;
  candidate_id: string;
  channel: 'WHATSAPP' | 'EMAIL' | 'PHONE_CALL' | string;
  type: 'WHATSAPP' | 'EMAIL' | 'PHONE_CALL';
  direction: 'INCOMING' | 'OUTGOING';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';
  recipient?: string | null;
  subject?: string | null;
  content_preview: string;
  preview: string;
  external_message_id?: string | null;
  created_by?: string | null;
  sender?: string | null;
  created_at: string;
  sent_at?: string | null;
  failure_reason?: string | null;
}
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
  stage?: PipelineStage | '',
  signal?: AbortSignal,
): Promise<PaginatedCandidates> => {
  const query = new URLSearchParams();
  query.append('page', page.toString());
  query.append('limit', limit.toString());
  if (search) query.append('search', search);
  if (stage) query.append('stage', stage);

  const response = await request('GET', `/candidates?${query.toString()}`, undefined, { signal });
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

export const updateCandidateDepartment = async (
  id: string,
  department: string,
  positionAppliedFor?: string,
  experience?: string,
  source?: string,
  sourceReference?: string,
): Promise<Candidate> => {
  const response = await request('PATCH', `/candidates/${id}/department`, {
    department,
    ...(positionAppliedFor !== undefined ? { position_applied_for: positionAppliedFor } : {}),
    ...(experience !== undefined ? { experience } : {}),
    ...(source !== undefined ? { source } : {}),
    ...(sourceReference !== undefined ? { source_reference: sourceReference } : {}),
  });
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

/** Fetch resume PDF via metadata + direct CDN download (single loading flow). */
export const fetchCandidateResumeBlob = async (
  candidateId: string,
  signal?: AbortSignal,
): Promise<{ blob: Blob; fileName: string; contentType: string; sourceUrl: string }> => {
  const meta = await getCandidateResume(candidateId);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const response = await fetch(meta.download_url, { signal });
  if (!response.ok) {
    throw new Error('Failed to download resume file.');
  }
  const blob = await response.blob();
  return {
    blob,
    fileName: meta.file_name,
    contentType: meta.content_type || blob.type || 'application/octet-stream',
    sourceUrl: meta.download_url,
  };
};

export interface PublicCandidateBasic {
  full_name: string;
  phone: string;
  email?: string;
  source: string;
  position_applied_for: string;
  experience?: string;
  has_resume?: boolean;
  token?: string;
}

export const publicApplyCandidate = async (candidateData: any, hrId: string): Promise<PublicCandidateBasic> => {
  const response = await request('POST', `/candidates/public-apply?hr_id=${hrId}`, candidateData);
  return response.data;
};

export const getRecruiterPublic = async (hrId: string): Promise<{ full_name: string; branch_location?: string }> => {
  const response = await request('GET', `/auth/users/${hrId}/public`);
  return response.data;
};

export const publicGetBasicCandidate = async (token: string): Promise<PublicCandidateBasic> => {
  const response = await request('GET', `/candidates/public-basic/${token}`);
  return response.data;
};

export const publicUpdateBasicCandidate = async (token: string, data: any): Promise<PublicCandidateBasic> => {
  const response = await request('POST', `/candidates/public-update-basic/${token}`, data);
  return response.data;
};

export const publicGetFullStatus = async (token: string): Promise<{
  full_name: string;
  is_awaiting_full_fill: boolean;
  pre_form_expires_at?: string;
}> => {
  const response = await request('GET', `/candidates/public-full-status/${token}`);
  return response.data;
};

export const publicApplyFullCandidate = async (token: string, data: any): Promise<PublicCandidateBasic> => {
  const response = await request('POST', `/candidates/public-apply-full/${token}`, data);
  return response.data;
};

export const updateCandidateStage = async (candidateId: string, toStage: string, remarks?: string): Promise<Candidate> => {
  const response = await request('POST', `/candidates/${candidateId}/transition`, { to_stage: toStage, remarks });
  return response.data;
};

export const sendOfferLetter = async (candidateId: string, fields?: Record<string, string>): Promise<Candidate> => {
  const response = await request('POST', `/candidates/${candidateId}/offer-letter/send`, fields || {});
  return response.data;
};

export interface SalaryUploadMatch {
  id: string;
  candidate_id: string;
  full_name: string;
  branch?: string | null;
  department?: string | null;
}

export interface SalaryUploadSkip {
  name: string;
  reason: string;
  matches?: SalaryUploadMatch[];
}

export interface SalaryProposed {
  id: string;
  candidate_id: string;
  full_name: string;
  branch?: string | null;
  department?: string | null;
  total_salary?: number | null;
  total_allowance?: number | null;
  others?: number | null;
  gross_salary?: number | null;
  joining_date?: string | null;
  warnings: string[];
}

export interface SalaryUploadResult {
  message: string;
  format: string;
  preview?: boolean;
  updated_count: number;
  not_found_count: number;
  proposed?: SalaryProposed[];
  updated: { id: string; full_name: string; candidate_id: string }[];
  skipped: SalaryUploadSkip[];
}

export const uploadSalarySheet = async (
  file: File,
  opts?: { candidateId?: string; preview?: boolean },
): Promise<SalaryUploadResult> => {
  const formData = new FormData();
  formData.append('file', file);
  const query = new URLSearchParams();
  if (opts?.candidateId) query.set('candidate_id', opts.candidateId);
  query.set('preview', opts?.preview === false ? 'false' : 'true');
  const response = await request('POST', `/candidates/bulk-salary?${query.toString()}`, formData);
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

export const sendPreForm = async (candidateId: string): Promise<any> => {
  const response = await request('POST', `/candidates/${candidateId}/pre-form/send`);
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

export const getCandidateCommunications = async (candidateId: string): Promise<CommunicationRecord[]> => {
  const response = await request('GET', `/communications/candidate/${candidateId}`);
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

export const uploadPublicCandidatePhoto = async (token: string, file: File): Promise<{ status: string, photo_url: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await request('POST', `/candidates/public-photo/${token}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
