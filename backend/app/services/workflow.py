from typing import Optional
import sqlalchemy as sa
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.candidate import Candidate
from app.models.user import User
from app.models.enums import PipelineStage, ActivityType
from app.models.stage_history import StageHistory
from app.models.activity_log import ActivityLog

# Allowed transitions based on Workflow Specification
ALLOWED_TRANSITIONS = {
    PipelineStage.SCREENING: [PipelineStage.CANDIDATE_FORM, PipelineStage.REJECTED, PipelineStage.ON_HOLD],
    PipelineStage.CANDIDATE_FORM: [PipelineStage.SCREENING, PipelineStage.HR_INTERVIEW, PipelineStage.REJECTED, PipelineStage.ON_HOLD],
    PipelineStage.HR_INTERVIEW: [PipelineStage.CANDIDATE_FORM, PipelineStage.DEPARTMENT_INTERVIEW, PipelineStage.REJECTED, PipelineStage.ON_HOLD],
    PipelineStage.DEPARTMENT_INTERVIEW: [PipelineStage.HR_INTERVIEW, PipelineStage.BRANCH_EVALUATION, PipelineStage.REJECTED, PipelineStage.ON_HOLD],
    PipelineStage.BRANCH_EVALUATION: [PipelineStage.DEPARTMENT_INTERVIEW, PipelineStage.FINAL_APPROVAL, PipelineStage.REJECTED, PipelineStage.ON_HOLD],
    PipelineStage.FINAL_APPROVAL: [PipelineStage.BRANCH_EVALUATION, PipelineStage.HIRED, PipelineStage.REJECTED, PipelineStage.ON_HOLD],
    
    # ON_HOLD can resume to previous stage, but for MVP we might allow returning to any active stage, or enforce strictly.
    # To keep MVP flexible, we allow ON_HOLD to go back to any active stage.
    PipelineStage.ON_HOLD: [
        PipelineStage.SCREENING, PipelineStage.CANDIDATE_FORM, 
        PipelineStage.HR_INTERVIEW, PipelineStage.DEPARTMENT_INTERVIEW, 
        PipelineStage.BRANCH_EVALUATION, PipelineStage.FINAL_APPROVAL, PipelineStage.REJECTED
    ],
    
    PipelineStage.HIRED: [], # Terminal
    PipelineStage.REJECTED: [], # Terminal
}

class WorkflowService:
    @staticmethod
    def transition(
        db: Session, 
        candidate: Candidate, 
        target_stage: PipelineStage, 
        user: User, 
        remarks: Optional[str] = None
    ) -> Candidate:
        """
        Validates the transition against the contract, updates the candidate, 
        records stage history, and writes an activity log.
        """
        if candidate.current_stage == target_stage:
            return candidate # No change

        # 1. Validate Transition
        allowed = ALLOWED_TRANSITIONS.get(candidate.current_stage, [])
        if target_stage not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid transition from {candidate.current_stage.value} to {target_stage.value}"
            )
            
        if target_stage == PipelineStage.REJECTED and not remarks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Remarks are required when rejecting a candidate."
            )

        # Require a reason when placing a candidate On Hold to avoid accidental holds
        if target_stage == PipelineStage.ON_HOLD and not remarks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Remarks are required when placing a candidate On Hold."
            )

        # Ensure evaluation imports are available for auto-initialization
        from app.models.evaluation import Evaluation
        from app.models.enums import EvaluationType, InterviewStatus

        # Auto-initialize Evaluations upon stage entry
        if target_stage == PipelineStage.HR_INTERVIEW:
            existing = db.scalar(sa.select(Evaluation).where(
                sa.and_(Evaluation.candidate_id == candidate.id, Evaluation.type == EvaluationType.BRANCH_HR)
            ))
            if not existing:
                db.add(Evaluation(
                    candidate_id=candidate.id,
                    type=EvaluationType.BRANCH_HR,
                    status=InterviewStatus.PENDING_SCHEDULE
                ))

        elif target_stage == PipelineStage.DEPARTMENT_INTERVIEW:
            existing = db.scalar(sa.select(Evaluation).where(
                sa.and_(Evaluation.candidate_id == candidate.id, Evaluation.type == EvaluationType.DEPT_HEAD)
            ))
            if not existing:
                db.add(Evaluation(
                    candidate_id=candidate.id,
                    type=EvaluationType.DEPT_HEAD,
                    status=InterviewStatus.PENDING_SCHEDULE
                ))

        elif target_stage == PipelineStage.BRANCH_EVALUATION:
            for etype in [EvaluationType.GM_LEVEL, EvaluationType.TECHNICAL_TEST]:
                existing = db.scalar(sa.select(Evaluation).where(
                    sa.and_(Evaluation.candidate_id == candidate.id, Evaluation.type == etype)
                ))
                if not existing:
                    db.add(Evaluation(
                        candidate_id=candidate.id,
                        type=etype,
                        status=InterviewStatus.PENDING_SCHEDULE
                    ))

        elif target_stage == PipelineStage.FINAL_APPROVAL:
            existing = db.scalar(sa.select(Evaluation).where(
                sa.and_(Evaluation.candidate_id == candidate.id, Evaluation.type == EvaluationType.HQ_INTERVIEW)
            ))
            if not existing:
                db.add(Evaluation(
                    candidate_id=candidate.id,
                    type=EvaluationType.HQ_INTERVIEW,
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

