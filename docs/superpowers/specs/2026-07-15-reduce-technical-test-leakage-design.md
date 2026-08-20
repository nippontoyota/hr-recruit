# Reduce Technical Test Answer Leakage Risk Design

**Date**: 2026-07-15  
**Target Path**: `docs/superpowers/specs/2026-07-15-reduce-technical-test-leakage-design.md`

---

## 1. Goal

Mitigate the risk of candidate technical test answer leakage by:
1. Removing the static in-code answer key (`TEST_QUESTIONS`) from the Python files and placing it in a secured store (the database).
2. Implementing per-token question order randomization.
3. Avoiding the storage of raw responses in `evaluation.scores` (keeping only the aggregate score fields).

---

## 2. Proposed Changes

### 2.1. Models

1. **`app/models/technical_question.py` [NEW]**:
   - Define a `TechnicalQuestion` table in the `recruitment` schema:
     - `id`: `String(50)` primary key (e.g., `"q1"`, `"q2"`)
     - `department`: `String(50)` (index=True, nullable=False) (e.g., `"IT"`, `"SALES"`, `"SERVICE"`, `"FINANCE"`)
     - `text`: `Text` (nullable=False)
     - `options`: `JSONB` (nullable=False)
     - `answer`: `String(10)` (nullable=False)
     - `created_at`: `DateTime(timezone=True)` default now
   - Import `TechnicalQuestion` in `backend/alembic/env.py` to ensure it is registered.

2. **`app/models/evaluation_token.py` [MODIFY]**:
   - Add a new column `test_data` (`JSONB`, nullable) to `EvaluationToken` to store the token's randomized/shuffled state:
     - `questions`: list of question dicts (e.g., `[{"id": "q3", "text": "...", "options": {...}}, ...]`) WITHOUT the correct answer keys.
     - `answers`: key-value mapping of question ID to correct option (e.g., `{"q3": "b", "q1": "a", ...}`).

### 2.2. Alembic Migration [NEW]

- Create a new migration file:
  - Create the `recruitment.technical_questions` table.
  - Add the `test_data` column to `recruitment.evaluation_tokens`.
  - Seed `recruitment.technical_questions` with the static questions and correct answers from the old `TEST_QUESTIONS` list.

### 2.3. Backend Endpoints (`app/api/v1/evaluations.py`) [MODIFY]

1. **Remove Static Answer Keys**:
   - Remove `TEST_QUESTIONS` from the code.
   - Retain the `_get_candidate_department` helper for mapping the candidate's applied position to a department name.

2. **Token Generation (`generate_evaluation_token`)**:
   - If `evaluation.type == EvaluationType.TECHNICAL_TEST`, fetch all questions for the candidate's department from the `technical_questions` table.
   - Use Python's `random.shuffle` to randomize the question order in memory.
   - Save the shuffled questions (without correct answers) and their answers map under `test_data` inside `EvaluationToken`.

3. **Get Public Test Questions (`get_public_test_questions`)**:
   - Load questions directly from `token_row.test_data["questions"]`. This guarantees that the questions are returned in the exact randomized order prepared for that token, and that no correct answer keys are returned or stored in the frontend payload.

4. **Submit Public Test (`submit_public_test`)**:
   - Access correct answers from `token_row.test_data["answers"]` instead of looking them up in static code.
   - Grade the submission.
   - Set `evaluation.scores` to:
     ```python
     evaluation.scores = {
         "correct_answers": correct_count,
         "total_questions": total_count,
         "percentage": percentage
     }
     ```
     (Remove the `"responses": body.answers` field to avoid persisting raw responses in the DB).

---

## 3. Verification Plan

### 3.1. Automated Tests
- Write a new unit test in `backend/tests/test_evaluations.py` validating:
  - Token generation for a technical test fetches and randomizes questions correctly, storing them in `EvaluationToken.test_data`.
  - Public retrieval of test questions succeeds, returning randomized questions and no answers.
  - Public submission evaluates correctly against the stored answers and does not persist raw responses.
- Run `pytest` to ensure all tests pass.
