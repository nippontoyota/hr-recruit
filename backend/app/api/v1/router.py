from fastapi import APIRouter

from app.api.v1 import auth, candidates, communications, followups, hr_interview

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(candidates.router)
api_router.include_router(communications.router)
api_router.include_router(followups.router)
api_router.include_router(hr_interview.router)
