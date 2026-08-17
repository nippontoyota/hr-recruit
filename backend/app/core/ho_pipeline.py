from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import PipelineStage
from app.models.stage_history import StageHistory

HO_HR_PIPELINE_STAGES = (
    PipelineStage.SENT_TO_HO,
    PipelineStage.HO_INTERVIEWS,
    PipelineStage.HO_HR_INTERVIEW,
    PipelineStage.HO_DEPT_INTERVIEW,
    PipelineStage.CSS,
    PipelineStage.SALARY_DETAILS,
    PipelineStage.FINAL_APPROVAL,
    PipelineStage.HIRED,
    PipelineStage.ON_HOLD,
    PipelineStage.REJECTED,
)

HO_HANDOVER_STAGES = (
    PipelineStage.SENT_TO_HO,
    PipelineStage.HO_INTERVIEWS,
    PipelineStage.HO_HR_INTERVIEW,
    PipelineStage.HO_DEPT_INTERVIEW,
    PipelineStage.CSS,
    PipelineStage.SALARY_DETAILS,
    PipelineStage.FINAL_APPROVAL,
    PipelineStage.HIRED,
)

HO_HR_STAGE_VALUES = frozenset(stage.value for stage in HO_HR_PIPELINE_STAGES)
HO_HANDOVER_STAGE_VALUES = frozenset(stage.value for stage in HO_HANDOVER_STAGES)


def stage_value(stage: PipelineStage | str | None) -> str:
    if stage is None:
        return ""
    if isinstance(stage, PipelineStage):
        return stage.value
    return str(stage)


def is_ho_pipeline_stage(stage: PipelineStage | str | None) -> bool:
    return stage_value(stage) in HO_HR_STAGE_VALUES


def handed_over_to_ho(candidate, db: Session | None = None) -> bool:
    """True once local HR has sent this candidate to Head Office (including later HO stages / hold / reject)."""
    if stage_value(getattr(candidate, "current_stage", None)) in HO_HANDOVER_STAGE_VALUES:
        return True
    if db is None:
        return False
    return candidate_reached_ho(db, candidate.id)


def candidate_reached_ho(db: Session, candidate_id) -> bool:
    """True once a candidate has entered the HO workflow (e.g. sent from branch)."""
    row = db.scalar(
        select(StageHistory.id)
        .where(
            StageHistory.candidate_id == candidate_id,
            StageHistory.to_stage.in_(
                (
                    PipelineStage.SENT_TO_HO,
                    PipelineStage.HO_INTERVIEWS,
                    PipelineStage.HO_HR_INTERVIEW,
                    PipelineStage.HO_DEPT_INTERVIEW,
                    PipelineStage.CSS,
                    PipelineStage.SALARY_DETAILS,
                    PipelineStage.FINAL_APPROVAL,
                    PipelineStage.HIRED,
                )
            ),
        )
        .limit(1)
    )
    return row is not None
