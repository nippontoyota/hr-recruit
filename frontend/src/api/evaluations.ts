import type { Evaluation, EvaluationToken, EvaluationPublicDetails } from '../types';
import api from './client';

export const getCandidateEvaluations = async (candidateId: string): Promise<Evaluation[]> => {
  const response = await api.get(`/evaluations/candidate/${candidateId}`);
  return response.data;
};

export const scheduleEvaluation = async (
  evalId: string,
  data: {
    interview_mode?: 'PHYSICAL' | 'ONLINE';
    scheduled_time?: string;
    location_or_link?: string;
  }
): Promise<Evaluation> => {
  const response = await api.post(`/evaluations/${evalId}/schedule`, data);
  return response.data;
};

export const generateEvaluationToken = async (evalId: string): Promise<EvaluationToken> => {
  const response = await api.post(`/evaluations/${evalId}/token`);
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
  const response = await api.post(`/evaluations/${evalId}/submit-scorecard`, data);
  return response.data;
};

export const getPublicEvaluation = async (token: string): Promise<EvaluationPublicDetails> => {
  const response = await api.get(`/evaluations/public/${token}`);
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
  const response = await api.post(`/evaluations/public/${token}/submit`, data);
  return response.data;
};

export const getPublicTestQuestions = async (token: string): Promise<{ department: string; questions: any[] }> => {
  const response = await api.get(`/evaluations/public/${token}/test-questions`);
  return response.data;
};

export const submitPublicTest = async (
  token: string,
  answers: Record<string, string>
): Promise<{ verdict: string; score: string }> => {
  const response = await api.post(`/evaluations/public/${token}/submit-test`, { answers });
  return response.data;
};

export const sendEvaluationWhatsAppInvite = async (
  evalId: string,
  data: {
    to_phone: string;
    variables: Record<string, string>;
  }
): Promise<any> => {
  const response = await api.post(`/evaluations/${evalId}/send-whatsapp-invite`, data);
  return response.data;
};

