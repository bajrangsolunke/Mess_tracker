from fastapi import APIRouter

from app.api.v1 import attendance, auth, members, plans

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(plans.router)
api_router.include_router(members.router)
api_router.include_router(attendance.router)
