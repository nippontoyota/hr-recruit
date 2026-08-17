import { request } from './client';
import type { PipelineStage } from '../types';

export interface CandidatePortalEvaluationOut {
  id: string;
  type: string;
  status: string;
  scheduled_time: string | null;
  location_or_link: string | null;
  candidate_response: string | null;
  interview_mode: string | null;
}

export interface CandidatePortalOut {
  full_name: string;
  experience: string;
  phone: string;
  email: string | null;
  branch_location: string | null;
  photo_url: string | null;
  current_stage: PipelineStage;
  offer_status: string | null;
  evaluations: CandidatePortalEvaluationOut[];
}

export const getCandidatePortal = async (token: string): Promise<CandidatePortalOut> => {
  const response = await request('GET', `/candidates/portal/${token}`);
  return response.data;
};

export const submitCandidatePortalResponse = async (
  token: string, 
  action_type: 'INTERVIEW_CONFIRM' | 'INTERVIEW_DECLINE' | 'OFFER_ACCEPT' | 'OFFER_DECLINE',
  evaluation_id?: string
): Promise<void> => {
  await request('POST', `/candidates/portal/${token}/response`, { action_type, evaluation_id });
};
