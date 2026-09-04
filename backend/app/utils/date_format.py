"""Consistent Indian date formatting for user-facing backend text."""

from datetime import date, datetime


def format_date_dmy(value: date | datetime | str | None) -> str:
    """Return a user-facing date as DD/MM/YYYY without changing stored values."""
    if value is None:
        return "-"
    if isinstance(value, datetime):
        value = value.date()
    if isinstance(value, date):
        return value.strftime("%d/%m/%Y")
    text = str(value).strip()
    if not text:
        return "-"
    for pattern in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%S%z", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(text, pattern).strftime("%d/%m/%Y")
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).strftime("%d/%m/%Y")
    except ValueError:
        return text
