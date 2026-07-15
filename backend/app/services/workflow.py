import uuid
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import sqlalchemy as sa

from app.models.candidate import Candidate
from app.models.user import User
from app.models.enums import PipelineStage, ActivityType
from app.models.stage_history import StageHistory
from app.models.activity_log import ActivityLog

# Allowed transitions based on Workflow Specification
ALLOWED_TRANSITIONS = {
    PipelineStage.SCREENING: [PipelineStage.CANDIDATE_FORM, PipelineStage.REJECTED, PipelineStage.ON_HOLD],
    PipelineStage.CANDIDATE_FORM: [PipelineStage.SCREENING, PipelineStage.BRANCH_EVALUATION, PipelineStage.REJECTED, PipelineStage.ON_HOLD],
    PipelineStage.BRANCH_EVALUATION: [PipelineStage.CANDIDATE_FORM, PipelineStage.HQ_EVALUATION, PipelineStage.REJECTED, PipelineStage.ON_HOLD],
    PipelineStage.HQ_EVALUATION: [PipelineStage.BRANCH_EVALUATION, PipelineStage.HIRED, PipelineStage.REJECTED, PipelineStage.ON_HOLD],
    
    # ON_HOLD can resume to previous stage, but for MVP we allow returning to any active stage.
    PipelineStage.ON_HOLD: [
        PipelineStage.SCREENING, PipelineStage.CANDIDATE_FORM, 
        PipelineStage.BRANCH_EVALUATION, PipelineStage.HQ_EVALUATION, 
        PipelineStage.REJECTED
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

        # Validate Branch Evaluations completion before moving to HQ
        if target_stage == PipelineStage.HQ_EVALUATION:
            from app.models.evaluation import Evaluation
            from app.models.enums import EvaluationType, InterviewStatus
            evals = db.scalars(sa.select(Evaluation).where(Evaluation.candidate_id == candidate.id)).all()
            branch_types = {EvaluationType.BRANCH_HR, EvaluationType.DEPT_HEAD, EvaluationType.GM_LEVEL, EvaluationType.TECHNICAL_TEST}
            completed_types = {e.type for e in evals if e.status == InterviewStatus.EVALUATED and e.verdict is not None}
            if not branch_types.issubset(completed_types):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot transition to HQ Evaluation. All local branch evaluations and technical test must be completed."
                )

        # Initialize evaluations on stage change
        if target_stage == PipelineStage.BRANCH_EVALUATION:
            from app.models.evaluation import Evaluation
            from app.models.enums import EvaluationType, InterviewStatus
            for etype in [EvaluationType.BRANCH_HR, EvaluationType.DEPT_HEAD, EvaluationType.GM_LEVEL, EvaluationType.TECHNICAL_TEST]:
                existing = db.scalar(sa.select(Evaluation).where(
                    Evaluation.candidate_id == candidate.id,
                    Evaluation.type == etype
                ))
                if not existing:
                    db.add(Evaluation(
                        candidate_id=candidate.id,
                        type=etype,
                        status=InterviewStatus.PENDING_SCHEDULE
                    ))

        elif target_stage == PipelineStage.HQ_EVALUATION:
            from app.models.evaluation import Evaluation
            from app.models.enums import EvaluationType, InterviewStatus
            existing = db.scalar(sa.select(Evaluation).where(
                Evaluation.candidate_id == candidate.id,
                Evaluation.type == EvaluationType.HQ_INTERVIEW
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
        
        # db.commit() is intentionally left to the API layer so multiple operations can be transactionally bound.
        # But we flush to get IDs.
        db.flush()
        
        return candidate
