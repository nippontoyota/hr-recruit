from typing import Optional
import sqlalchemy as sa
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.candidate import Candidate
from app.models.user import User
from app.models.enums import PipelineStage, ActivityType
from app.models.stage_history import StageHistory
from app.models.activity_log import ActivityLog


def _required_remarks(target_stage: PipelineStage, remarks: Optional[str]) -> str | None:
    cleaned = remarks.strip() if isinstance(remarks, str) else None
    if target_stage in {PipelineStage.REJECTED, PipelineStage.ON_HOLD} and not cleaned:
        label = "rejecting" if target_stage == PipelineStage.REJECTED else "placing a candidate on hold"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Remarks are required when {label}.",
        )
    return cleaned


_BRANCH_SEND_STAGES = {
    PipelineStage.SCREENING,
    PipelineStage.CANDIDATE_FORM,
    PipelineStage.BRANCH_INTERVIEW,
    PipelineStage.CALL_LETTER,
    PipelineStage.INTERVIEWS,
    PipelineStage.TEST,
    PipelineStage.BACKGROUND_VERIFICATION,
    PipelineStage.APPLICATION,
    PipelineStage.DEPARTMENT_INTERVIEW,
    PipelineStage.BRANCH_EVALUATION,
    PipelineStage.HR_INTERVIEW,
}


def transition_prerequisites(candidate: Candidate, target_stage: PipelineStage) -> list[str]:
    """Return included workflow prerequisites without mutating the candidate."""
    missing: list[str] = []
    if target_stage == PipelineStage.SENT_TO_HO:
        if candidate.current_stage not in _BRANCH_SEND_STAGES:
            missing.append("candidate must still be in the branch pipeline")
    return missing


def transition(
    db: Session, 
    candidate: Candidate, 
    target_stage: PipelineStage, 
    user: User, 
    remarks: Optional[str] = None,
    *,
    skip_handover_lock: bool = False,
) -> Candidate:
        """
        Validates the transition against the contract, updates the candidate, 
        records stage history, and writes an activity log.
        """
        if candidate.current_stage == target_stage:
            return candidate # No change

        remarks = _required_remarks(target_stage, remarks)
        missing = transition_prerequisites(candidate, target_stage)
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot move candidate to {target_stage.value}: missing {', '.join(missing)}.",
            )

        from app.core.access import assert_local_hr_can_mutate
        # Local HR may send APPLICATION → SENT_TO_HO; any later mutation is blocked.
        # Scorecards (public HO link / HO user) pass skip_handover_lock — they are not a local-HR edit.
        if not skip_handover_lock:
            assert_local_hr_can_mutate(user, candidate, db)



        # Ensure evaluation imports are available for auto-initialization
        from app.models.evaluation import Evaluation
        from app.models.enums import EvaluationType, InterviewStatus

        standard_stages = [
            PipelineStage.CALL_LETTER,
            PipelineStage.INTERVIEWS,
            PipelineStage.TEST,
            PipelineStage.BACKGROUND_VERIFICATION,
            PipelineStage.APPLICATION,
            PipelineStage.SENT_TO_HO
        ]
        
        target_idx = -1
        if target_stage in standard_stages:
            target_idx = standard_stages.index(target_stage)
            
        for i in range(target_idx + 1):
            s = standard_stages[i]
            
            if s == PipelineStage.TEST:
                for etype in [EvaluationType.TECHNICAL_TEST]:
                    existing = db.scalar(sa.select(Evaluation).where(
                        sa.and_(Evaluation.candidate_id == candidate.id, Evaluation.type == etype)
                    ))
                    if not existing:
                        db.add(Evaluation(
                            candidate_id=candidate.id,
                            type=etype,
                            status=InterviewStatus.PENDING_SCHEDULE
                        ))

        old_stage = candidate.current_stage
        
        # 2. Update Candidate
        candidate.current_stage = target_stage
        
        # 3. Write Stage History
        history = StageHistory(
            candidate_id=candidate.id,
            from_stage=old_stage,
            to_stage=target_stage,
            changed_by_user_id=user.id,
            reason=remarks
        )
        db.add(history)
        
        # 4. Write Activity Log
        title = f"Moved to {target_stage.value.replace('_', ' ').title()}"
        description = f"Candidate moved from {old_stage.value.replace('_', ' ').title()} to {target_stage.value.replace('_', ' ').title()}."
        if remarks:
            description += f" Remarks: {remarks}"
            
        log = ActivityLog(
            candidate_id=candidate.id,
            activity_type=ActivityType.STAGE_CHANGE,
            title=title,
            description=description,
            created_by_user_id=user.id
        )
        db.add(log)
        
        # The caller typically commits the surrounding transaction, but we flush here so
        # any newly created evaluations and history rows are persisted in the current session
        # before control returns.
        db.flush()
        
        return candidate

