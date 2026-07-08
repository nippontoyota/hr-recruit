from fastapi import APIRouter

from app.api.v1 import candidates

api_router = APIRouter()
api_router.include_router(candidates.router)
