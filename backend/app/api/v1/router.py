from fastapi import APIRouter

from app.api.v1 import auth, candidates_core, candidates_public, candidates_actions, communications, followups, hr_interview, evaluations

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(candidates_core.router)
api_router.include_router(candidates_public.router)
api_router.include_router(candidates_actions.router)
api_router.include_router(communications.router)
api_router.include_router(followups.router)
api_router.include_router(hr_interview.router)
api_router.include_router(evaluations.router)

