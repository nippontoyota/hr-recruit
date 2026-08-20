import { request } from './client';

export interface InterviewerNameRow {
  id: string;
  name: string;
  phone?: string | null;
  branch_location: string;
  created_at: string;
}

export interface LocationTemplateRow {
  id: string;
  name: string;
  branch_location: string;
  location_or_link: string;
  mode: 'PHYSICAL' | 'ONLINE';
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

function branchQuery(branch?: string | null) {
  return branch ? `?branch=${encodeURIComponent(branch)}` : '';
}

function branchKey(branch?: string | null) {
  return branch || '';
}

const interviewerCache = new Map<string, InterviewerNameRow[]>();

export async function listInterviewers(branch?: string | null, force = false): Promise<InterviewerNameRow[]> {
  const key = branchKey(branch);
  if (!force) {
    const hit = interviewerCache.get(key);
    if (hit) return hit;
  }
  const res = await request('GET', `/settings/interviewers${branchQuery(branch)}`);
  interviewerCache.set(key, res.data);
  return res.data;
}

function upsertInterviewerCache(branch: string | null | undefined, row: InterviewerNameRow) {
  const key = branchKey(branch);
  const prev = interviewerCache.get(key) || [];
  const idx = prev.findIndex((item) => item.id === row.id);
  if (idx >= 0) {
    const next = [...prev];
    next[idx] = row;
    interviewerCache.set(key, next);
  } else {
    interviewerCache.set(key, [...prev, row]);
  }
}

export async function createInterviewer(
  name: string,
  branch?: string | null,
  phone?: string | null
): Promise<InterviewerNameRow> {
  const res = await request('POST', '/settings/interviewers', {
    name,
    ...(phone ? { phone } : {}),
    ...(branch ? { branch_location: branch } : {}),
  });
  upsertInterviewerCache(branch, res.data);
  return res.data;
}

export async function updateInterviewerPhone(
  id: string,
  phone: string,
  branch?: string | null
): Promise<InterviewerNameRow> {
  const res = await request('PATCH', `/settings/interviewers/${id}${branchQuery(branch)}`, { phone });
  upsertInterviewerCache(branch, res.data);
  return res.data;
}

export async function deleteInterviewer(id: string, branch?: string | null): Promise<void> {
  await request('DELETE', `/settings/interviewers/${id}${branchQuery(branch)}`);
  const key = branchKey(branch);
  const prev = interviewerCache.get(key);
  if (prev) interviewerCache.set(key, prev.filter((row) => row.id !== id));
}

const locationCache = new Map<string, LocationTemplateRow[]>();

export async function listLocations(branch?: string | null): Promise<LocationTemplateRow[]> {
  const key = branchKey(branch);
  const hit = locationCache.get(key);
  if (hit) return hit;
  const res = await request('GET', `/settings/locations${branchQuery(branch)}`);
  locationCache.set(key, res.data);
  return res.data;
}

export async function createLocation(data: {
  name: string;
  location_or_link: string;
  mode?: 'PHYSICAL' | 'ONLINE';
  branch?: string | null;
}): Promise<LocationTemplateRow> {
  const res = await request('POST', '/settings/locations', {
    name: data.name,
    location_or_link: data.location_or_link,
    mode: data.mode || 'PHYSICAL',
    ...(data.branch ? { branch_location: data.branch } : {}),
  });
  const key = branchKey(data.branch);
  const prev = locationCache.get(key) || [];
  const idx = prev.findIndex((item) => item.id === res.data.id);
  locationCache.set(key, idx >= 0 ? prev.map((item, i) => (i === idx ? res.data : item)) : [...prev, res.data]);
  return res.data;
}

export async function deleteLocation(id: string, branch?: string | null): Promise<void> {
  await request('DELETE', `/settings/locations/${id}${branchQuery(branch)}`);
  const key = branchKey(branch);
  const prev = locationCache.get(key);
  if (prev) locationCache.set(key, prev.filter((row) => row.id !== id));
}
