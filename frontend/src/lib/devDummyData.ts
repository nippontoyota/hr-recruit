/**
 * TEMPORARY — local testing only.
 * Never ship: `SHOW_DEV_DUMMY` is false in production builds (`import.meta.env.DEV`).
 * Delete this file and the Fill Dummy Data buttons before a production release.
 */

import type { BgVerificationData } from './bgVerification';
import { CANDIDATE_DEPARTMENTS } from '../types';

export const SHOW_DEV_DUMMY = import.meta.env.DEV;

export interface DummyCandidateBasics {
  fullName: string;
  phone: string;
  experience: 'Fresher' | 'Experienced';
  department: string;
  branch: string;
  email: string;
}

const BRANCHES = ['Kalamassery', 'Edappally', 'Aluva', 'Thrissur', 'Kottayam'] as const;
const FIRST = [
  'Arun', 'Bhavya', 'Cyril', 'Deepa', 'Eby', 'Fathima', 'Gokul', 'Haritha',
  'Irfan', 'Jisha', 'Kiran', 'Lekha', 'Manoj', 'Nisha', 'Omar', 'Priya',
  'Qasim', 'Renu', 'Sajith', 'Tina',
];
const LAST = [
  'Nair', 'Menon', 'Pillai', 'Kumar', 'Joseph', 'Rahman', 'Das', 'Thomas',
  'Varghese', 'Krishnan', 'George', 'Mathew', 'Suresh', 'Babu', 'Ali',
  'Sharma', 'Iyer', 'Kurian', 'Ravi', 'Fernandez',
];

/** Twenty distinct dummy candidates. Each click uses the next one. */
export const DUMMY_CANDIDATES: DummyCandidateBasics[] = FIRST.map((first, i) => {
  const department = CANDIDATE_DEPARTMENTS[i % CANDIDATE_DEPARTMENTS.length];
  const slug = `${first}.${LAST[i]}`.toLowerCase();
  return {
    fullName: `${first} ${LAST[i]}`,
    phone: `98765${String(10000 + i).slice(-5)}`,
    experience: i % 3 === 0 ? 'Fresher' : 'Experienced',
    department,
    branch: BRANCHES[i % BRANCHES.length],
    email: `${slug}@example.test`,
  };
});

let candidateCursor = 0;

export function nextDummyCandidate(): DummyCandidateBasics {
  const row = DUMMY_CANDIDATES[candidateCursor % DUMMY_CANDIDATES.length];
  candidateCursor += 1;
  return row;
}

export function dummyBgVerification(overrides?: Partial<BgVerificationData>): BgVerificationData {
  return {
    meta: {
      totalWorkExperience: '2 Years',
      hasPreviousEmployment: true,
    },
    locality: {
      panchayathName: 'Kalamassery Municipality',
      councillorName: 'Ramesh K',
      panchayathMemberName: 'Amit Patel',
      contactNoCouncillor: '9847011122',
      contactNoMember: '9876543211',
      anyIssueUpdated: 'No',
      anyIssueSpecify: '',
      policeCaseReported: 'No',
      policeCaseSpecify: '',
      familyIssues: 'No',
      familyIssuesSpecify: '',
      overallFeedbackLocality: 'No adverse remarks from locality. Candidate is well known and of good character.',
    },
    social: {
      facebookName: 'Rahul Sharma',
      instagramName: 'rahul.sharma',
      politicalInterference: 'No',
      politicalSide: '',
      sharedLikedPages: 'Sports, automobiles, travel',
      instagramFacebookFollowers: 'Friends and family',
      followingPages4Years: 'Toyota, football clubs, news pages',
      activeInSocialMedia: 'Yes',
      overallFeedbackSocialMedia: 'Social media presence is ordinary. No concerning posts found.',
    },
    employer: {
      employerName: 'Tata Consultancy Services',
      designation: 'Junior Associate',
      periodOfEmploymentFrom: '2022-06',
      periodOfEmploymentTo: '2024-05',
      totalYearOfEmployment: '2 Years',
      contactedPersonName: 'Suresh Menon',
      contactedPersonDesignation: 'Team Lead',
      contactedPersonMobNo: '9895012345',
      employeeEmployerRapport: 'Good. Left on cordial terms for career growth.',
      financialLoansTaken: 'No',
      financialLoansSpecify: '',
      longLeavesTaken: 'No',
      overallFeedbackEmployer: 'Employer confirmed employment dates and reported satisfactory performance.',
    },
    signatures: {
      checkedBy1: { name: 'Anitha HRD', role: 'HRD' },
      checkedBy2: { name: 'Prasad HRM', role: 'HRM' },
    },
    ...overrides,
  };
}
