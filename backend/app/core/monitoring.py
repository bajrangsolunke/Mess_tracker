"""Error alerts via Sentry, only when SENTRY_DSN is set. No personal data is sent:
request bodies, cookies and user details stay out, and member link secrets are masked."""

import re

from app.core.config import Settings

_TOKEN = re.compile(r"/(m|public/members)/[A-Za-z0-9_-]{16,32}")


def _scrub(event, _hint):
    request = event.get("request") or {}
    if "url" in request:
        request["url"] = _TOKEN.sub(r"/\1/[link]", request["url"])
    for key in ("data", "cookies", "headers", "query_string"):
        request.pop(key, None)
    event.pop("user", None)
    return event


def init_monitoring(cfg: Settings) -> None:
    if not cfg.sentry_dsn:
        return
    import sentry_sdk

    sentry_sdk.init(
        dsn=cfg.sentry_dsn,
        environment=cfg.env,
        send_default_pii=False,
        traces_sample_rate=0.0,
        before_send=_scrub,
    )
