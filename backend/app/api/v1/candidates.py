from fastapi import APIRouter
from .candidates_core import *
from .candidates_public import *
from .candidates_actions import *

router = APIRouter(prefix="/candidates", tags=["candidates"])
