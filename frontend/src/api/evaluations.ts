import type { Evaluation, EvaluationToken, EvaluationPublicDetails } from '../types';
import { request } from './client';

const evalCache = new Map<string, Evaluation[]>();

function invalidateEvals() {
  evalCache.clear();
}

function patchEval(updated: Evaluation) {
  const list = evalCache.get(updated.candidate_id);
  if (!list) return;
  const idx = list.findIndex((e) => e.id === updated.id);
  evalCache.set(
    updated.candidate_id,
    idx < 0 ? [...list, updated] : list.map((e, i) => (i === idx ? updated : e)),
  );
}

function removeEval(evalId: string) {
  for (const [cid, list] of evalCache) {
    const next = list.filter((e) => e.id !== evalId);
    if (next.length !== list.length) evalCache.set(cid, next);
  }
}

export const peekCandidateEvaluations = (candidateId: string): Evaluation[] | undefined =>
  evalCache.get(candidateId);

export const getCandidateEvaluations = async (candidateId: string, force = false): Promise<Evaluation[]> => {
  if (!force) {
    const hit = evalCache.get(candidateId);
    if (hit) return hit;
  }
  const response = await request('GET', `/evaluations/candidate/${candidateId}`);
  evalCache.set(candidateId, response.data);
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
  patchEval(response.data);
  return response.data;
};

export const deleteEvaluation = async (evalId: string): Promise<any> => {
  const response = await request('DELETE', `/evaluations/${evalId}`);
  removeEval(evalId);
  return response.data;
};

export const updateEvaluationTitle = async (evalId: string, title: string): Promise<Evaluation> => {
  const response = await request('PATCH', `/evaluations/${evalId}/title`, { title });
  patchEval(response.data);
  return response.data;
};

export const updateEvaluationInterviewer = async (
  evalId: string,
  interviewerName: string
): Promise<Evaluation> => {
  const response = await request('PATCH', `/evaluations/${evalId}/interviewer`, {
    interviewer_name: interviewerName,
  });
  patchEval(response.data);
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
  patchEval(response.data);
  return response.data;
};

export const generateEvaluationToken = async (
  evalId: string,
  position?: string
): Promise<EvaluationToken> => {
  const qs = position ? `?position=${encodeURIComponent(position)}` : '';
  const response = await request('POST', `/evaluations/${evalId}/token${qs}`);
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
  patchEval(response.data);
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
  invalidateEvals();
  return response.data;
};

export const getPublicTestQuestions = async (token: string): Promise<{
  department: string;
  questions: any[];
  expires_at?: string;
  duration_seconds?: number;
}> => {
  const response = await request('GET', `/evaluations/public/${token}/test-questions`);
  return response.data;
};

export const submitPublicTest = async (
  token: string,
  answers: Record<string, string>
): Promise<{ verdict: string; score: string }> => {
  const response = await request('POST', `/evaluations/public/${token}/submit-test`, { answers });
  invalidateEvals();
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


const questionsCache = new Map<string, any[]>();

export const getDepartmentQuestions = async (opts: {
  department?: string;
  position?: string;
  experience?: string;
  candidateId?: string;
}): Promise<any[]> => {
  const query = new URLSearchParams();
  if (opts.candidateId) query.set('candidate_id', opts.candidateId);
  if (opts.department) query.set('department', opts.department);
  if (opts.position) query.set('position', opts.position);
  if (opts.experience) query.set('experience', opts.experience);
  const key = query.toString();
  const hit = questionsCache.get(key);
  if (hit) return hit;
  const response = await request('GET', `/evaluations/questions?${key}`);
  questionsCache.set(key, response.data);
  return response.data;
};
