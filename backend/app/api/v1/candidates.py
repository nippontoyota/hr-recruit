from fastapi import APIRouter
from .candidates_core import *
from .candidates_core import (
    _resume_extension, _safe_filename, _validate_resume_content_type,
    _read_resume_bytes, _validate_resume_magic, _get_resume_document,
    _document_out, _save_resume_for_candidate, _issue_pre_form, _store_whatsapp_invite
)
from .candidates_public import *
from .candidates_actions import *

router = APIRouter(prefix="/candidates", tags=["candidates"])

from .candidates_core import router as core_router
from .candidates_public import router as public_router
from .candidates_actions import router as actions_router

# In case some modules still import `router` from `candidates.py` (though router.py now imports them directly)
# router.include_router(core_router)
# router.include_router(public_router)
# router.include_router(actions_router)
