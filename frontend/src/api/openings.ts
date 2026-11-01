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

let openingsCache: { data: JobOpening[]; cachedAt: number } | null = null;
const CACHE_TTL_MS = 3 * 60 * 1000;

export function invalidateOpeningsCache(): void {
  openingsCache = null;
}

export async function listOpenings(force = false): Promise<JobOpening[]> {
  const now = Date.now();
  if (!force && openingsCache && now - openingsCache.cachedAt < CACHE_TTL_MS) {
    return openingsCache.data;
  }
  const res = await request('GET', '/openings');
  // Older deployments have returned a wrapped payload here. Keep the UI
  // read-only and resilient instead of allowing a non-array response to
  // reach RecentOpeningsCard's array operations.
  let result: JobOpening[] = [];
  if (Array.isArray(res.data)) result = res.data as JobOpening[];
  else if (res.data && Array.isArray(res.data.data)) result = res.data.data as JobOpening[];
  openingsCache = { data: result, cachedAt: now };
  return result;
}

export async function createOpening(body: JobOpeningInput): Promise<JobOpening> {
  const res = await request('POST', '/openings', body);
  invalidateOpeningsCache();
  return res.data;
}

export async function updateOpening(id: string, body: JobOpeningInput): Promise<JobOpening> {
  const res = await request('PUT', `/openings/${id}`, body);
  invalidateOpeningsCache();
  return res.data;
}

export async function deleteOpening(id: string): Promise<void> {
  await request('DELETE', `/openings/${id}`);
  invalidateOpeningsCache();
}
