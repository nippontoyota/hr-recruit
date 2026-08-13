# Department, position, and role test papers — design

**Date:** 2026-08-13  
**Status:** Approved for planning (pending user review of this file)

## Goal

When creating or re-assigning a candidate, HR must pick **department**, **position**, and **experience** (Fresher / Experienced). The technical test is **15 questions**: 6 common Toyota questions (shuffled) plus 9 drawn at random from that role’s bank. The drawn paper is frozen on the test token.

## Current state

- Add Candidate has department + experience. `position_applied_for` is copied from department.
- Profile “Change consideration” has a department dropdown and a free-text role.
- `technical_questions` is keyed by `(id, department)`. Common paper lives under `COMMON`.
- `_load_test_questions` currently returns only the 6 common questions (with a leftover SALES fallback). Tokens already freeze `questions` + `answers` on `test_data`.

## Approach

Reuse `technical_questions.department` as a **paper key** (no schema change). A map of department + position + experience → paper. Token generation samples 6+9 and freezes them. Shared position catalog on frontend and backend.

## Position catalog

Experience is always required at create/edit for every role.

**Sales**

- GEM (Guest Experienced Manager)
- Back Office / Delivery Coordinator
- Lobby In-Charge
- Driver

**Every other department** (Accessories, Accounts, … Training, Management operations): **Driver** only, until more role lists are added.

`position_applied_for` stores the role name, not the department. Changing department clears position if it is no longer in that department’s list. Create/edit without a valid position is rejected.

Legacy rows where position equals department (today’s copy) are not auto-mapped. HR must set a real position before generating a test; generation fails with a clear error if the position is unknown.

## Test papers

When a technical-test token is generated:

1. Load the 6 `COMMON` questions. If missing, fail hard (do not fall back to an old SALES dump).
2. Resolve paper key from department + position + experience.
3. Sample 9 questions from that bank (if the bank has fewer than 9, use all).
4. Build one list of 15 in this order: the 6 common questions shuffled among themselves, then 9 sampled role questions (those 9 may be shuffled among themselves). Do not mix the two groups.
5. Freeze `{questions, answers}` on `evaluation_tokens.test_data`. Re-fetch, print, and scoring use that frozen set.

HR print/preview uses the frozen paper if a token exists; otherwise the same 6+9 rules.

### Paper keys

| Department | Position | Experience | Paper key | Bank size |
|---|---|---|---|---|
| Sales | GEM (Guest Experienced Manager) | Fresher | `SALES_GEM_FRESHER` | 18 |
| Sales | GEM (Guest Experienced Manager) | Experienced | `SALES_GEM_EXPERIENCED` | 18 |
| Sales | Back Office / Delivery Coordinator | either | `SALES_BACK_OFFICE` | 11 |
| Sales | Lobby In-Charge | either | `SALES_LOBBY` | 10 |
| any | Driver | either | `DRIVER` | 10 |

Experience is always stored. Only GEM has two banks today; other roles share one bank until more papers exist.

Driver questions are bilingual (English + Malayalam) in `text` / option strings as provided. Empty Driver Q11 is not seeded. Driver Q1 and Q2 answers are **B** (not marked on the source list).

Question content is seeded from the banks in the 2026-08-13 request; the seed script is the source of truth after that.

## Data model / API

- No new tables. Seed rows into `technical_questions` with the paper keys above. Keep `COMMON`.
- Backend catalog module (e.g. `app/core/positions.py`) and frontend catalog (e.g. `frontend/src/lib/positions.ts`) with the same department → positions lists.
- Create candidate and PATCH department/position validate: department in `CANDIDATE_DEPARTMENTS`, position in that department’s list, experience Fresher or Experienced.
- Test assembly lives next to existing `_load_test_questions` / token generate. Replace department-keyword heuristics (`_get_candidate_department`) for paper selection; catalog + paper map is the only path.
- `GET /evaluations/questions` (HR preview) must accept department + position + experience (or candidate id) so print widgets stop calling with department alone.

## UI

- **Add Candidate:** Department → Position (filtered, required) → Experience (existing). Submit sends all three.
- **Change consideration:** Same dropdowns; drop free-text role. Changing department resets an invalid position.
- Public test page unchanged except it already renders whatever `test_data.questions` contains (including bilingual driver text).

## Non-goals

- Position lists for non-Sales departments other than Driver
- Separate Fresher/Experienced banks for non-GEM roles
- Schema change on `technical_questions`
- Changing test duration, pass mark, or WhatsApp invite copy

## Testing

- Create Sales GEM Fresher vs Experienced → different paper keys; 15 questions; 6 common ids present; 9 from the matching GEM bank
- Create Service (or any non-Sales) Driver → `DRIVER` paper
- Create without position → rejected
- Position not in catalog for department → rejected
- Regenerating / re-fetching the same token returns the same 15
- Missing `COMMON` questions → test generate fails (no SALES fallback)

## Success criteria

1. HR cannot create a candidate without department, position, and experience.
2. Sales offers the four roles; other departments offer Driver only.
3. Every generated technical test is 15 questions: 6 common (shuffled) + 9 from the correct bank, frozen on the token.
