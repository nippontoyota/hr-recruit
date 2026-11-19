# Head Office Forwarding Email Branch Name Design Spec

- **Author**: Antigravity Assistant & Engineering Team
- **Date**: 2026-11-19
- **Topic**: Adding Candidate Branch Name to Head Office Forwarding Email
- **Status**: Approved Design

---

## 1. Background & Requirement

When a candidate application is sent from a branch to the Head Office via the **"Send to Head Office"** pipeline action, the system sends an automated candidate-facing email notifying them that their interview at the branch is complete and their profile has been forwarded to Head Office for review.

Currently, the email template generically references only the brand (`Nippon Toyota` or `River`), for example:
- **Subject**: `Update Regarding Interview – Nippon Toyota`
- **Body**: *"Thank you for taking the time to attend the interview at Nippon Toyota."*

The requirement is to include the candidate's specific branch name (e.g. `Kalamassery`) in the email subject and opening sentence (e.g. `Nippon Toyota Kalamassery`), while retaining `Nippon Toyota` for Head Office references and the closing signature.

---

## 2. Architecture & Implementation

### Helper Function: `_candidate_branch_brand_label`
In `backend/app/api/v1/candidates_actions.py`:
```python
def _candidate_branch_brand_label(candidate: Candidate) -> str:
    brand = _candidate_brand_label(candidate)
    branch = (getattr(candidate, "branch_location", "") or "").strip()
    if not branch:
        return brand
    if branch.casefold().startswith(brand.casefold()):
        return branch
    return f"{brand} {branch}"
```

### Email Template Formatting (`_head_office_forwarding_email_content`)
- **Subject**: `Update Regarding Interview – {branch_brand_name}`
  - Example with branch: `Update Regarding Interview – Nippon Toyota Kalamassery`
  - Example without branch: `Update Regarding Interview – Nippon Toyota`
- **Opening Sentence**:
  `<p>Thank you for taking the time to attend the interview at {escape(branch_brand_name)}.</p>`
  - Example with branch: *"Thank you for taking the time to attend the interview at Nippon Toyota Kalamassery."*
  - Example without branch: *"Thank you for taking the time to attend the interview at Nippon Toyota."*
- **Subsequent Mentions & Signature**:
  - Keep `{brand_name}` (`Nippon Toyota`) for Head Office references:
    `<p>Further details regarding the upcoming steps in the selection process will be communicated to you by the {brand_name} Head Office Team within the next five working days.</p>`
  - Keep `{brand_name}` in the closing signature:
    `<p>Best regards,<br>Mathew Paul<br>Talent Acquisition Team<br>{brand_name}</p>`

---

## 3. Safety & Boundary Considerations

1. **Graceful Fallback**: If `candidate.branch_location` is `None` or whitespace, the email defaults strictly to `{brand_name}` (`Nippon Toyota` / `River`), preventing empty or awkward spacing.
2. **De-duplication**: If `branch_location` already includes the brand prefix (e.g. `"Nippon Toyota Kalamassery"`), the helper prevents duplicate brand names like `"Nippon Toyota Nippon Toyota Kalamassery"`.
3. **Multi-brand Support**: Supports both Nippon Toyota and River brands automatically (`River Kalamassery` vs `River`).
4. **Zero Database Changes**: Leverages the existing `branch_location` field on the `Candidate` model.
5. **Zero Frontend Changes**: Frontend triggers existing API endpoints without payload alterations.

---

## 4. Verification & Testing Plan

1. **Unit Tests in `backend/tests/test_offer_letter.py`**:
   - Verify candidate with `branch_location="Kalamassery"` generates:
     - Subject: `Update Regarding Interview – Nippon Toyota Kalamassery`
     - Body containing: `attend the interview at Nippon Toyota Kalamassery`
     - Signature: `Talent Acquisition Team<br>Nippon Toyota`
   - Verify candidate without `branch_location` generates:
     - Subject: `Update Regarding Interview – Nippon Toyota`
     - Body containing: `attend the interview at Nippon Toyota`
2. **River Brand Tests in `backend/tests/test_river_brand.py`**:
   - Verify River brand candidates without branch still produce `Update Regarding Interview – River`.
   - Verify River brand candidates with branch produce `Update Regarding Interview – River <Branch>`.
3. **Full Backend Test Run**:
   - Execute pytest on modified test suites.
