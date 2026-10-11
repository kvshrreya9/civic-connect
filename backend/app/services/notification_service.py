"""Persistent in-app notifications. Idempotent via dedupe keys; committed with the triggering change."""
from ..extensions import db
from ..models import Notification, User
from ..models.user import OFFICER_ROLES


def _pending_keys():
    return db.session.info.setdefault("pending_notification_keys", set())


def notify(user_id, title, message, type_="info", complaint_id=None, dedupe_key=None):
    if not user_id:
        return None
    if dedupe_key:
        key = f"{dedupe_key}:u{user_id}"
        if key in _pending_keys() or Notification.query.filter_by(dedupe_key=key).first():
            return None
        _pending_keys().add(key)
    else:
        key = None
    notification = Notification(
        user_id=user_id, title=title[:160], message=message, type=type_, complaint_id=complaint_id, dedupe_key=key
    )
    db.session.add(notification)
    return notification


def office_officers(office_id):
    if not office_id:
        return []
    return User.query.filter(
        User.office_id == office_id, User.role.in_(("officer", "employee")), User.is_active.is_(True)
    ).all()


def admins():
    return User.query.filter_by(role="admin", is_active=True).all()


def notify_office(office_id, title, message, type_="info", complaint_id=None, dedupe_key=None, exclude_user_id=None):
    """Notify the officers responsible for an office. Unmapped complaints go to administrators."""
    recipients = office_officers(office_id) if office_id else admins()
    count = 0
    for member in recipients:
        if member.id != exclude_user_id and notify(member.id, title, message, type_, complaint_id, dedupe_key):
            count += 1
    return count


def notify_department(department_id, title, message, type_="info", complaint_id=None, exclude_user_id=None, dedupe_key=None):
    """Legacy department staff (role 'employee' without an office)."""
    if not department_id:
        return 0
    staff = User.query.filter(
        User.department_id == department_id, User.role.in_(OFFICER_ROLES), User.office_id.is_(None),
        User.is_active.is_(True), User.role != "admin",
    ).all()
    count = 0
    for member in staff:
        if member.id != exclude_user_id and notify(member.id, title, message, type_, complaint_id, dedupe_key):
            count += 1
    return count


def notify_responsible(complaint, title, message, type_="info", dedupe_key=None, exclude_user_id=None):
    count = notify_office(complaint.office_id, title, message, type_, complaint.id, dedupe_key, exclude_user_id)
    count += notify_department(complaint.department_id, title, message, type_, complaint.id, exclude_user_id, dedupe_key)
    return count


def list_for_user(user, limit=40, unread_only=False):
    query = Notification.query.filter_by(user_id=user.id)
    if unread_only:
        query = query.filter_by(is_read=False)
    items = query.order_by(Notification.created_at.desc(), Notification.id.desc()).limit(limit).all()
    unread = Notification.query.filter_by(user_id=user.id, is_read=False).count()
    return items, unread


def mark_read(user, notification_id):
    notification = Notification.query.filter_by(id=notification_id, user_id=user.id).first()
    if notification:
        notification.is_read = True
        db.session.commit()
    return notification


def mark_all_read(user):
    updated = Notification.query.filter_by(user_id=user.id, is_read=False).update({"is_read": True})
    db.session.commit()
    return updated
