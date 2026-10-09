from fastapi import APIRouter

from app.api.v1 import (
    attendance,
    auth,
    billing,
    dashboard,
    leaves,
    members,
    membership,
    menus,
    operations,
    plans,
    pricing,
    tiffin,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(auth.org_router)
api_router.include_router(plans.router)
api_router.include_router(members.router)
api_router.include_router(membership.router)
api_router.include_router(pricing.router)
api_router.include_router(attendance.router)
api_router.include_router(leaves.router)
api_router.include_router(billing.router)
api_router.include_router(menus.router)
api_router.include_router(dashboard.router)
api_router.include_router(tiffin.router)
api_router.include_router(operations.router)
