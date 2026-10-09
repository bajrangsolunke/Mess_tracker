from datetime import date

from pydantic import BaseModel


class CreditOut(BaseModel):
    """Tiffins of the current pack: ``left`` counts every pack usable that day."""

    total: int
    used: int
    left: int
    start: date
    end: date
    use_by: date  # leftovers lapse after this day
