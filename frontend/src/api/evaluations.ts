import type { Evaluation, EvaluationToken, EvaluationPublicDetails } from '../types';
import { request } from './client';

export const getCandidateEvaluations = async (candidateId: string): Promise<Evaluation[]> => {
  const response = await request('GET', `/evaluations/candidate/${candidateId}`);
  return response.data;
};

export const createEvaluation = async (
  candidateId: string, 
  type: string, 
  interviewerName?: string, 
  interviewerDesignation?: string
): Promise<Evaluation> => {
  const response = await request('POST', `/evaluations/candidate/${candidateId}`, { 
    type, 
    interviewer_name: interviewerName, 
    interviewer_designation: interviewerDesignation 
  });
  return response.data;
};

export const deleteEvaluation = async (evalId: string): Promise<any> => {
  const response = await request('DELETE', `/evaluations/${evalId}`);
  return response.data;
};

export const scheduleEvaluation = async (
  evalId: string,
  data: {
    interview_mode?: 'PHYSICAL' | 'ONLINE' | null;
    scheduled_time?: string | null;
    location_or_link?: string | null;
    interviewer_id?: string | null;
  }
): Promise<Evaluation> => {
  const response = await request('POST', `/evaluations/${evalId}/schedule`, data);
  return response.data;
};

export const generateEvaluationToken = async (evalId: string): Promise<EvaluationToken> => {
  const response = await request('POST', `/evaluations/${evalId}/token`);
  return response.data;
};

export const submitScorecardDirect = async (
  evalId: string,
  data: {
    verdict?: string;
    remarks?: string;
    scores?: Record<string, any>;
  }
): Promise<Evaluation> => {
  const response = await request('POST', `/evaluations/${evalId}/submit-scorecard`, data);
  return response.data;
};

export const getPublicEvaluation = async (token: string): Promise<EvaluationPublicDetails> => {
  const response = await request('GET', `/evaluations/public/${token}`);
  return response.data;
};

export const submitPublicEvaluation = async (
  token: string,
  data: {
    verdict: string;
    remarks: string;
    scores?: Record<string, any>;
  }
): Promise<any> => {
  const response = await request('POST', `/evaluations/public/${token}/submit`, data);
  return response.data;
};

export const getPublicTestQuestions = async (token: string): Promise<{ department: string; questions: any[] }> => {
  const response = await request('GET', `/evaluations/public/${token}/test-questions`);
  return response.data;
};

export const submitPublicTest = async (
  token: string,
  answers: Record<string, string>
): Promise<{ verdict: string; score: string }> => {
  const response = await request('POST', `/evaluations/public/${token}/submit-test`, { answers });
  return response.data;
};

export const sendEvaluationWhatsAppInvite = async (
  evalId: string,
  data: {
    to_phone: string;
    recipient_type?: string;
    variables: Record<string, string>;
  }
): Promise<any> => {
  const response = await request('POST', `/evaluations/${evalId}/send-whatsapp-invite`, data);
  return response.data;
};


export const getDepartmentQuestions = async (department: string): Promise<any[]> => {
  const response = await request('GET', `/evaluations/questions?department=${encodeURIComponent(department)}`);
  return response.data;
};
