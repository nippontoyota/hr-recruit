import { request } from './client';

export interface JobOpening {
  id: string;
  position: string;
  department: string;
  location: string;
  headcount: number;
  created_at: string;
  updated_at: string;
  brand?: string;
}

export interface JobOpeningInput {
  position: string;
  department: string;
  location: string;
  headcount: number;
  brand?: string;
}

export async function listOpenings(): Promise<JobOpening[]> {
  const res = await request('GET', '/openings');
  // Older deployments have returned a wrapped payload here. Keep the UI
  // read-only and resilient instead of allowing a non-array response to
  // reach RecentOpeningsCard's array operations.
  if (Array.isArray(res.data)) return res.data as JobOpening[];
  if (res.data && Array.isArray(res.data.data)) return res.data.data as JobOpening[];
  return [];
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
