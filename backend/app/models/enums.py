import enum


class BusinessType(enum.StrEnum):
    mess = "mess"


class Language(enum.StrEnum):
    en = "en"
    hi = "hi"
    mr = "mr"


class UserRole(enum.StrEnum):
    owner = "owner"
    customer = "customer"
