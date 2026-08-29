import type { Candidate, CandidateActionKey, CandidateWorkState } from '../types';

const UNKNOWN_WORK_STATE: CandidateWorkState = {
  next_action: 'Unknown',
  action_key: 'NONE',
  responsible_team: 'Unknown',
  blockers: [],
  days_in_stage: 0,
  days_since_activity: null,
  queue_keys: [],
};

/** Safely reads workflow metadata from older or partial candidate responses. */
export function getCandidateWorkState(candidate: Pick<Candidate, 'work_state'>): CandidateWorkState {
  const state = candidate.work_state ?? UNKNOWN_WORK_STATE;
  if (state.next_action === 'Complete call letter' || state.next_action === 'Waiting for call letter to be issued') {
    return { ...state, next_action: 'Call letter to be sent', action_key: state.action_key === 'ADVANCE_STAGE' ? 'WORKSPACE' : state.action_key };
  }
  if (state.next_action === 'Candidate form filled') {
    return { ...state, next_action: 'Review application & schedule interview', action_key: 'ADVANCE_STAGE' };
  }
  return state;
}

export function getCandidateActionKey(candidate: Pick<Candidate, 'work_state'>): CandidateActionKey {
  return getCandidateWorkState(candidate).action_key ?? 'NONE';
}
