from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo


def like_pattern(text: str) -> str:
    """Patrón %texto% para LIKE/ILIKE, escapando los comodines del usuario."""
    escaped = text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def start_of_day(day: date, tz: ZoneInfo) -> datetime:
    return datetime.combine(day, time.min, tzinfo=tz)


def end_of_day_exclusive(day: date, tz: ZoneInfo) -> datetime:
    return start_of_day(day + timedelta(days=1), tz)
