"""Run external alert side effects only after the database transaction commits."""
import logging

from sqlalchemy import event
from sqlalchemy.orm import Session

from ..extensions import db

logger = logging.getLogger(__name__)
_registered = False


def defer(fn, *args, **kwargs):
    db.session.info.setdefault("after_commit", []).append((fn, args, kwargs))


def _run(session):
    tasks = session.info.pop("after_commit", [])
    for fn, args, kwargs in tasks:
        try:
            fn(*args, **kwargs)
        except Exception as exc:  # never break the request because a side channel failed
            logger.warning("After-commit task failed: %s", exc)


def _discard(session):
    session.info.pop("after_commit", None)


def register_after_commit():
    global _registered
    if _registered:
        return
    event.listen(Session, "after_commit", _run)
    event.listen(Session, "after_soft_rollback", lambda session, previous: _discard(session))
    _registered = True
