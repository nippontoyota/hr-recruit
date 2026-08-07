from typing import Optional
import sqlalchemy as sa
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.candidate import Candidate
from app.models.user import User
from app.models.enums import PipelineStage, ActivityType
from app.models.stage_history import StageHistory
from app.models.activity_log import ActivityLog

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

