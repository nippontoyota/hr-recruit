# Nippon Toyota Recruitment Portal: Database Schema

This diagram shows how the recruitment portal stores candidates, HR users, pipeline stages, and related records.

```mermaid
erDiagram
    users {
        uuid id PK
        string email UK
        string hashed_password
        string full_name
        user_role role
        string branch_location
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    candidates {
        uuid id PK
        string candidate_id UK "NT-2026-00001"
        string full_name
        string phone
        string email
        date date_of_birth
        source_channel source_channel
        boolean is_rejoining
        boolean is_duplicate_flagged
        uuid duplicate_of_candidate_id FK
        pipeline_stage current_stage
        timestamptz applied_at
        timestamptz created_at
        timestamptz updated_at
        uuid assigned_hr_user_id FK
        string branch_location
        jsonb application_data
        int profile_completeness_pct
        text notes_summary
    }

    stage_history {
        uuid id PK
        uuid candidate_id FK
        pipeline_stage from_stage
        pipeline_stage to_stage
        uuid changed_by_user_id FK
        text reason
        timestamptz created_at
    }

    remarks {
        uuid id PK
        uuid candidate_id FK
        remark_stage_context stage_context
        uuid author_user_id FK
        text content
        jsonb scores
        timestamptz created_at
        timestamptz updated_at
    }

    documents {
        uuid id PK
        uuid candidate_id FK
        document_file_type file_type
        string file_path
        uuid uploaded_by_user_id FK
        timestamptz created_at
    }

    messages {
        uuid id PK
        uuid candidate_id FK
        message_channel channel
        string template_name
        text body
        message_status status
        timestamptz sent_at
        timestamptz created_at
    }

    audit_logs {
        uuid id PK
        string entity_type
        string entity_id
        string action
        jsonb old_value
        jsonb new_value
        uuid user_id FK
        timestamptz created_at
    }

    users ||--o{ candidates : "assigned_hr_user_id"
    users ||--o{ stage_history : "changed_by_user_id"
    users ||--o{ remarks : "author_user_id"
    users ||--o{ documents : "uploaded_by_user_id"
    users ||--o{ audit_logs : "user_id"

    candidates ||--o| candidates : "duplicate_of_candidate_id"
    candidates ||--o{ stage_history : "candidate_id"
    candidates ||--o{ remarks : "candidate_id"
    candidates ||--o{ documents : "candidate_id"
    candidates ||--o{ messages : "candidate_id"
```

## Enums

| Enum | Values |
|------|--------|
| **user_role** | `ADMIN`, `LOCAL_HR`, `HEAD_OFFICE_HR`, `DEPARTMENT_HEAD`, `SALARY_TEAM` |
| **pipeline_stage** | `NEW_APPLICATION`, `AWAITING_LOCAL_INTERVIEW`, `LOCAL_HR_REVIEW_COMPLETE`, `AWAITING_HEAD_OFFICE_INTERVIEW`, `HEAD_OFFICE_INTERVIEW_COMPLETE`, `SUITABLE_FOR_HIRE`, `SALARY_PENDING`, `SALARY_APPROVED`, `OFFER_SENT`, `OFFER_ACCEPTED`, `OFFER_DECLINED`, `JOINING_SCHEDULED`, `JOINED`, `REJECTED`, `ON_HOLD` |
| **source_channel** | `WALK_IN`, `INDEED`, `REFERRAL`, `CAMPUS`, `OTHER` |
| **remark_stage_context** | `LOCAL_HR`, `HEAD_OFFICE_HR`, `TECHNICAL_TEST`, `DEPT_HEAD` |
| **document_file_type** | `RESUME`, `ID_PROOF`, `EDUCATION_CERT`, `OFFER_LETTER`, `JOINING_FORM`, `OTHER` |
| **message_channel** | `WHATSAPP`, `EMAIL`, `SMS` |
| **message_status** | `PENDING`, `SENT`, `DELIVERED`, `FAILED` |

## A few things worth knowing

Every table uses a UUID as its primary key.

HR sees candidate IDs like `NT-2026-00001`. That is separate from the internal `id` column the system uses behind the scenes.

When someone fills out the application form, the extra fields land in `candidates.application_data` as JSON. That keeps the form flexible without needing a migration every time a field changes.

Whenever a candidate moves to a new stage, we log it in `stage_history`. Nothing gets overwritten.

If the same phone or email shows up again, we flag it with `is_duplicate_flagged` and point to the original record in `duplicate_of_candidate_id`. HR decides what to do. We do not merge records automatically.
