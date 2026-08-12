import { request } from './client';

export interface InterviewerNameRow {
  id: string;
  name: string;
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

export async function listInterviewers(branch?: string | null): Promise<InterviewerNameRow[]> {
  const res = await request('GET', `/settings/interviewers${branchQuery(branch)}`);
  return res.data;
}

export async function createInterviewer(
  name: string,
  branch?: string | null
): Promise<InterviewerNameRow> {
  const res = await request('POST', '/settings/interviewers', {
    name,
    ...(branch ? { branch_location: branch } : {}),
  });
  return res.data;
}

export async function deleteInterviewer(id: string, branch?: string | null): Promise<void> {
  await request('DELETE', `/settings/interviewers/${id}${branchQuery(branch)}`);
}

export async function listLocations(branch?: string | null): Promise<LocationTemplateRow[]> {
  const res = await request('GET', `/settings/locations${branchQuery(branch)}`);
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
  return res.data;
}

export async function deleteLocation(id: string, branch?: string | null): Promise<void> {
  await request('DELETE', `/settings/locations/${id}${branchQuery(branch)}`);
}
