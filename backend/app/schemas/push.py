from pydantic import BaseModel, Field


class PushKeys(BaseModel):
    p256dh: str = Field(min_length=10, max_length=200)
    auth: str = Field(min_length=4, max_length=100)


class PushSubscriptionIn(BaseModel):
    """The browser's PushSubscription.toJSON()."""

    endpoint: str = Field(min_length=10, max_length=2000, pattern=r"^https://")
    keys: PushKeys


class PushKey(BaseModel):
    public_key: str
    enabled: bool
