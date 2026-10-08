from fastapi import APIRouter

from app.api.deps import DbSession
from app.core.config import get_settings
from app.schemas.dashboard import DashboardSummary
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_summary(db: DbSession):
    return dashboard_service.get_summary(db, get_settings().tz)
