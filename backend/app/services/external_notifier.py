"""Optional email / SMS / voice calls for alerts, disabled unless configured.

Statuses recorded in the audit log:
  disabled  - provider not configured
  accepted  - provider accepted the message/call request (not confirmed delivery or answer)
  failed    - the provider rejected it or was unreachable
"""
import logging
import smtplib
from email.message import EmailMessage
from xml.sax.saxutils import escape

import requests
from flask import current_app
from sqlalchemy.orm import Session

from ..extensions import db
from ..models import AuditLog

logger = logging.getLogger(__name__)


def _email(to_address, subject, body):
    cfg = current_app.config
    if not cfg.get("SMTP_HOST") or not cfg.get("SMTP_FROM") or not to_address:
        return "disabled"
    msg = EmailMessage()
    msg["From"] = cfg["SMTP_FROM"]
    msg["To"] = to_address
    msg["Subject"] = subject
    msg.set_content(body)
    try:
        with smtplib.SMTP(cfg["SMTP_HOST"], cfg["SMTP_PORT"], timeout=10) as server:
            if cfg.get("SMTP_USE_TLS"):
                server.starttls()
            if cfg.get("SMTP_USER"):
                server.login(cfg["SMTP_USER"], cfg["SMTP_PASSWORD"])
            server.send_message(msg)
        return "accepted"
    except Exception as exc:
        logger.warning("Email alert failed: %s", exc)
        return "failed"


def _sms(phone, text):
    cfg = current_app.config
    if not cfg.get("SMS_WEBHOOK_URL") or not phone:
        return "disabled"
    try:
        headers = {"Authorization": f"Bearer {cfg['SMS_WEBHOOK_TOKEN']}"} if cfg.get("SMS_WEBHOOK_TOKEN") else {}
        response = requests.post(cfg["SMS_WEBHOOK_URL"], json={"to": phone, "message": text}, headers=headers, timeout=10)
        return "accepted" if response.ok else "failed"
    except requests.RequestException as exc:
        logger.warning("SMS alert failed: %s", exc)
        return "failed"


def _voice_call(phone, subject, body):
    cfg = current_app.config
    sid, token, from_number = (
        cfg.get("TWILIO_ACCOUNT_SID"),
        cfg.get("TWILIO_AUTH_TOKEN"),
        cfg.get("TWILIO_FROM_NUMBER"),
    )
    if not sid or not token or not from_number or not phone:
        return "disabled"
    twiml = f"<Response><Say voice=\"alice\">{escape(subject)}. {escape(body)}</Say></Response>"
    try:
        response = requests.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Calls.json",
            data={"To": phone, "From": from_number, "Twiml": twiml},
            auth=(sid, token),
            timeout=10,
        )
        return "accepted" if response.ok else "failed"
    except requests.RequestException as exc:
        logger.warning("Voice alert call failed: %s", exc)
        return "failed"


def send_alert(alert_id, recipients, subject, body, call_recipients=()):
    """Runs after commit. recipients = [(user_id, email, phone)]."""
    cfg = current_app.config
    twilio_ready = (
        cfg.get("TWILIO_ACCOUNT_SID")
        and cfg.get("TWILIO_AUTH_TOKEN")
        and cfg.get("TWILIO_FROM_NUMBER")
        and call_recipients
    )
    if not (
        cfg.get("SMTP_HOST")
        or cfg.get("SMS_WEBHOOK_URL")
        or twilio_ready
    ):
        return
    calls_by_recipient = {}
    for recipient_id, phone in call_recipients:
        calls_by_recipient[recipient_id] = _voice_call(phone, subject, body)
    results = []
    for user_id, email, phone in recipients:
        results.append({
            "user_id": user_id,
            "email": _email(email, subject, body),
            "sms": _sms(phone, body[:300]),
            "call": calls_by_recipient.get(user_id, "disabled"),
        })
    results.extend(
        {"recipient": recipient_id, "call": status}
        for recipient_id, status in calls_by_recipient.items()
        if isinstance(recipient_id, str)
    )
    try:
        with Session(db.engine) as audit_session:
            audit_session.add(AuditLog(
                action="alert.external_dispatch",
                entity_type="alert",
                entity_id=alert_id,
                details={
                    "results": results,
                    "note": "'accepted' means the provider accepted the message or call; delivery or call completion is not confirmed",
                },
            ))
            audit_session.commit()
    except Exception:
        logger.exception("Could not record external dispatch result for alert %s", alert_id)
