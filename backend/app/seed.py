"""Safe, idempotent Greater Chennai Corporation preset configuration."""
import json
import random
from pathlib import Path

from flask import current_app
from sqlalchemy import or_

from .extensions import db
from .models import (
    AuditLog, Complaint, DuplicateCandidate, Notification, Office, RiskAlert, User, Ward,
)
from .services import department_routing_service, image_storage_service

DEMO_DOMAIN = "civicconnect.demo"


def _user(name, email, role, password, office=None, legacy_email=None):
    user = User.query.filter_by(email=email).first()
    if user:
        if legacy_email:
            legacy_user = User.query.filter_by(email=legacy_email).first()
            if legacy_user:
                legacy_user.is_active = False
        user.name = name
        user.role = role
        user.office = office
        user.is_active = True
        return user, False
    if legacy_email:
        user = User.query.filter_by(email=legacy_email).first()
        if user:
            user.name = name
            user.email = email
            user.role = role
            user.office = office
            user.is_active = True
            return user, False
    user = User(name=name, email=email, role=role, office=office)
    user.set_password(password)
    db.session.add(user)
    return user, True


def _office(code, name, office_type, lat, lng):
    office = Office.query.filter_by(code=code).first()
    if office:
        office.name = name
        office.office_type = office_type
        office.latitude = lat
        office.longitude = lng
        office.address = f"{name} office (demo location - replace with the real address)"
        office.is_active = True
        return office
    office = Office(code=code, name=name, office_type=office_type, latitude=lat, longitude=lng,
                    address=f"{name} office (demo location - replace with the real address)")
    db.session.add(office)
    db.session.flush()
    return office


def _ward(office, code, name, rings):
    ward = Ward.query.filter_by(office_id=office.id, code=code).first()
    if ward:
        ward.name = name
        ward.boundary_type = "polygon"
        ward.center_lat = None
        ward.center_lng = None
        ward.radius_m = None
        ward.polygon = rings
        ward.is_active = True
        return
    db.session.add(Ward(
        office=office, code=code, name=name, boundary_type="polygon", polygon=rings,
    ))


def seed_demo_data(with_complaints=False):
    department_routing_service.ensure_default_departments()
    cfg = current_app.config
    password = cfg["DEMO_PASSWORD"]
    boundary_file = Path(__file__).parent / "data" / "chennai_gcc_zones.json"
    with boundary_file.open(encoding="utf-8") as source:
        zones = json.load(source)
    if len(zones) != 15:
        raise RuntimeError(f"Expected 15 GCC zone boundaries, found {len(zones)}")

    legacy_offices = Office.query.filter(
        or_(Office.code.like("MUN-%"), Office.code.in_(("CCM", "NGP")))
    ).all()
    legacy_office_ids = {office.id for office in legacy_offices}
    for office in legacy_offices:
        office.is_active = False
        for ward in office.wards:
            ward.is_active = False
    if legacy_office_ids:
        User.query.filter(
            User.office_id.in_(legacy_office_ids),
            User.email.like(f"%@{DEMO_DOMAIN}"),
            User.role != "admin",
        ).update({"is_active": False}, synchronize_session=False)
    User.query.filter(
        User.email == f"asha@{DEMO_DOMAIN}", User.role == "citizen",
    ).update({"is_active": False}, synchronize_session=False)

    offices = []
    for index, zone in enumerate(zones, start=1):
        office_name = f"Zone {index} - {zone['name']}"
        office = _office(
            zone["code"], office_name, "corporation", zone["latitude"], zone["longitude"],
        )
        offices.append(office)

    for index, (office, zone) in enumerate(zip(offices, zones), start=1):
        _ward(office, f"ZONE-{index:02d}", office.name, zone["rings"])

    created = []
    for name, email, role, office in [
        ("GCC Administrator", f"admin@{DEMO_DOMAIN}", "admin", None),
    ]:
        _, is_new = _user(name, email, role, password, office)
        if is_new:
            created.append(email)
    for office, zone in zip(offices, zones):
        for role_name, role, email_prefix in [
            ("Officer", "officer", "officer"),
            ("Field Worker", "field_worker", "worker"),
        ]:
            email = f"{email_prefix}.{zone['slug']}@{DEMO_DOMAIN}"
            _, is_new = _user(
                f"{office.name} {role_name}",
                email,
                role,
                password,
                office,
            )
            if is_new:
                created.append(email)
    from .services import alert_service, jurisdiction_service, notification_service
    for complaint in Complaint.query.all():
        ward, office = jurisdiction_service.resolve(complaint.latitude, complaint.longitude)
        if complaint.office_id == (office.id if office else None) and complaint.ward_id == (ward.id if ward else None):
            continue
        previous_office_id = complaint.office_id
        jurisdiction_service.apply_routing(complaint)
        alert_service.on_office_changed(complaint, previous_office_id)
        notification_service.notify_responsible(
            complaint,
            "Complaint routing updated",
            f"{complaint.reference}: {complaint.title}",
            "reassigned",
            dedupe_key=f"zone-reroute:{complaint.id}:{complaint.office_id or 'unmapped'}",
        )
    db.session.commit()

    message = (
        f"Preset Greater Chennai Corporation zones ready for 15 official zones. "
        f"Accounts created: {', '.join(created) or 'none (already present)'}. "
        f"Password: DEMO_PASSWORD. Citizens must sign up in /signup before logging in."
    )
    if with_complaints:
        message += " " + _seed_complaints(cfg["DEMO_CENTER_LAT"], cfg["DEMO_CENTER_LNG"])
    return message


def _seed_complaints(lat, lng):
    from .services import complaint_service

    citizen = User.query.filter(
        User.role == "citizen", User.is_active.is_(True),
    ).order_by(User.id).first()
    if citizen is None:
        return "No citizen account exists; sign up before using --with-complaints."

    rng = random.Random(7)
    samples = [
        ("Deep pothole at bus stop junction", "pothole", "high", True, 120),
        ("Garbage not collected for 4 days", "garbage", "medium", False, 40),
        ("Burst water pipeline flooding street", "water_leakage", "critical", True, 150),
        ("Streetlights out on entire stretch", "streetlight", "high", True, 250),
        ("Blocked storm drain causing waterlogging", "drainage", "high", False, 60),
    ]
    count = 0
    for title, category, severity, safety, affected in samples:
        complaint_service.create_complaint(citizen, {
            "title": title, "description": f"{title}. Reported as sample demo data.",
            "category": category, "severity": severity, "safety_risk": "true" if safety else "false",
            "affected_count": affected, "latitude": lat + rng.uniform(-0.01, 0.01),
            "longitude": lng + rng.uniform(-0.01, 0.01), "address": "Demo locality",
        }, [])
        count += 1
    return f"Created {count} sample complaints."


def remove_demo_complaints():
    """Remove only complaints reported by demo accounts, with their dependent rows and photos."""
    demo_ids = [u.id for u in User.query.filter(User.email.like(f"%@{DEMO_DOMAIN}")).all()]
    complaints = Complaint.query.filter(Complaint.citizen_id.in_(demo_ids)).all() if demo_ids else []
    ids = [c.id for c in complaints]
    if not ids:
        return "No demo complaints found."
    files = [img.filename for c in complaints for img in c.images]
    DuplicateCandidate.query.filter(
        (DuplicateCandidate.complaint_id.in_(ids)) | (DuplicateCandidate.candidate_id.in_(ids))
    ).delete(synchronize_session=False)
    RiskAlert.query.filter(RiskAlert.complaint_id.in_(ids)).delete(synchronize_session=False)
    Notification.query.filter(Notification.complaint_id.in_(ids)).delete(synchronize_session=False)
    AuditLog.query.filter(AuditLog.complaint_id.in_(ids)).delete(synchronize_session=False)
    Complaint.query.filter(Complaint.duplicate_of_id.in_(ids)).update({"duplicate_of_id": None}, synchronize_session=False)
    for complaint in complaints:
        db.session.delete(complaint)
    db.session.commit()
    for name in files:
        image_storage_service.delete_file(name)
    return f"Removed {len(ids)} demo complaints."
