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


class MemberStatus(enum.StrEnum):
    active = "active"
    inactive = "inactive"


class MealType(enum.StrEnum):
    lunch = "lunch"
    dinner = "dinner"


class HolidayMeal(enum.StrEnum):
    lunch = "lunch"
    dinner = "dinner"
    all = "all"


class AttendanceStatus(enum.StrEnum):
    present = "present"
    absent = "absent"


class LeaveStatus(enum.StrEnum):
    approved = "approved"
    late = "late"
    rejected = "rejected"


class BillStatus(enum.StrEnum):
    unpaid = "unpaid"
    partial = "partial"
    paid = "paid"


class PaymentMethod(enum.StrEnum):
    cash = "cash"
    upi = "upi"
    bank = "bank"


class NotificationType(enum.StrEnum):
    payment_due = "payment_due"
    leave_decided = "leave_decided"
    announcement = "announcement"
    general = "general"


class MemberType(enum.StrEnum):
    dine_in = "dine_in"
    tiffin = "tiffin"
