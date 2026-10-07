import re

_MOBILE = re.compile(r"^[6-9][0-9]{9}$")


def normalize_phone(raw: str) -> str:
    """Return a 10-digit Indian mobile number from loosely formatted input.

    Accepts ASCII digits only (Devanagari or other Unicode digits are rejected), strips
    spaces, dashes, a leading '+91' / '91' / '0091' country code and a leading '0'.
    Raises ValueError unless the result matches an Indian mobile number (starts 6-9).
    """
    if not raw.isascii():
        raise ValueError("phone must use 0-9 digits")
    digits = re.sub(r"[^0-9]", "", raw)
    if digits.startswith("0091") and len(digits) == 14:
        digits = digits[4:]
    elif digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    elif digits.startswith("0") and len(digits) == 11:
        digits = digits[1:]
    if not _MOBILE.fullmatch(digits):
        raise ValueError("phone must be a valid 10-digit mobile number")
    return digits
