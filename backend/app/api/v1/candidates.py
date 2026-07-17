from fastapi import APIRouter
from .candidates_core import *
from .candidates_public import *
from .candidates_actions import *

router = APIRouter(prefix="/candidates", tags=["candidates"])


# In case some modules still import `router` from `candidates.py` (though router.py now imports them directly)
# router.include_router(core_router)
# router.include_router(public_router)
# router.include_router(actions_router)
