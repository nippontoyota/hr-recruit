import { request } from './client';

export interface JobOpening {
  id: string;
  position: string;
  department: string;
  location: string;
  headcount: number;
  created_at: string;
  updated_at: string;
}

export interface JobOpeningInput {
  position: string;
  department: string;
  location: string;
  headcount: number;
}

export async function listOpenings(): Promise<JobOpening[]> {
  const res = await request('GET', '/openings');
  return res.data;
}

export async function createOpening(body: JobOpeningInput): Promise<JobOpening> {
  const res = await request('POST', '/openings', body);
  return res.data;
}

export async function updateOpening(id: string, body: JobOpeningInput): Promise<JobOpening> {
  const res = await request('PUT', `/openings/${id}`, body);
  return res.data;
}

export async function deleteOpening(id: string): Promise<void> {
  await request('DELETE', `/openings/${id}`);
}
