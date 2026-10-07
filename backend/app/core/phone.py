import re


def normalize_phone(raw: str) -> str:
    """Return a 10-digit Indian mobile number from loosely formatted input.

    Strips spaces, dashes, a leading '+91'/'91' country code and a leading '0'.
    Raises ValueError when the result is not exactly 10 digits.
    """
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if len(digits) != 10:
        raise ValueError("phone must be 10 digits")
    return digits
