from app.schemas.auth import LoginRequest, TokenResponse, UserResponse
from app.schemas.candidate import (
    CandidateCreate,
    CandidateResponse,
    CandidateUpdate,
    StageChangeRequest,
)
from app.schemas.common import ErrorResponse, MessageResponse, PaginatedResponse
from app.schemas.remark import RemarkCreate, RemarkResponse
from app.schemas.stage_history import StageHistoryResponse

__all__ = [
    "CandidateCreate",
    "CandidateResponse",
    "CandidateUpdate",
    "ErrorResponse",
    "LoginRequest",
    "MessageResponse",
    "PaginatedResponse",
    "RemarkCreate",
    "RemarkResponse",
    "StageChangeRequest",
    "StageHistoryResponse",
    "TokenResponse",
    "UserResponse",
]
