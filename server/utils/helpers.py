from datetime import datetime, timezone


def as_aware_utc(dt: datetime) -> datetime:
    """Dates read back from MongoDB are naive UTC; make them aware so they
    can be compared against utcnow()."""
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def time_ago(dt: datetime) -> str:
    """Format a datetime as a human-readable 'X units ago' string."""
    dt = as_aware_utc(dt)

    seconds = max(0, int((utcnow() - dt).total_seconds()))

    minutes, _ = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)
    days = hours // 24

    if days > 365:
        value, unit = days // 365, "year"
    elif days > 30:
        value, unit = days // 30, "month"
    elif days > 0:
        value, unit = days, "day"
    elif hours > 0:
        value, unit = hours, "hour"
    elif minutes > 0:
        value, unit = minutes, "minute"
    else:
        return "just now"

    return f"{value} {unit}{'s' if value > 1 else ''} ago"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)