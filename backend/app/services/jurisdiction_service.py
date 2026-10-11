"""Location-based routing to the responsible municipality / panchayat office.

Routing only uses boundaries an administrator has configured (ward circles or polygons).
If no configured ward contains the point, the complaint is placed in the unassigned
administrative queue - it is never sent to an arbitrary office.
"""
from ..extensions import db
from ..models import Office, Ward
from . import audit_service, location_service


def point_in_polygon(lat, lng, polygon):
    """Ray casting for a ring or rings, with optional interior holes."""
    if not polygon:
        return False
    rings = [polygon] if isinstance(polygon[0][0], (int, float)) else polygon
    if not rings or len(rings[0]) < 3:
        return False

    def in_ring(ring):
        inside = False
        j = len(ring) - 1
        for i in range(len(ring)):
            yi, xi = float(ring[i][0]), float(ring[i][1])
            yj, xj = float(ring[j][0]), float(ring[j][1])
            if (yi > lat) != (yj > lat):
                x_cross = (xj - xi) * (lat - yi) / ((yj - yi) or 1e-12) + xi
                if lng < x_cross:
                    inside = not inside
            j = i
        return inside

    return in_ring(rings[0]) and not any(in_ring(hole) for hole in rings[1:])


def ward_contains(ward, lat, lng):
    if ward.boundary_type == "polygon":
        return point_in_polygon(lat, lng, ward.polygon)
    if ward.center_lat is None or ward.center_lng is None or not ward.radius_m:
        return False
    return location_service.haversine_m(lat, lng, ward.center_lat, ward.center_lng) <= ward.radius_m


def _ward_area_hint(ward):
    """Smaller areas win when wards overlap (after explicit match_priority)."""
    if ward.boundary_type == "circle":
        return ward.radius_m or float("inf")
    return 0.0


def resolve(lat, lng):
    """Return (ward, office) for a point, or (None, None) when no configured boundary matches."""
    candidates = (
        Ward.query.join(Office)
        .filter(Ward.is_active.is_(True), Office.is_active.is_(True))
        .all()
    )
    matches = [w for w in candidates if ward_contains(w, lat, lng)]
    if not matches:
        return None, None
    matches.sort(key=lambda w: (-(w.match_priority or 0), _ward_area_hint(w), w.id))
    ward = matches[0]
    return ward, ward.office


def apply_routing(complaint, actor=None):
    """Set ward / office on a complaint from its coordinates and record the routing decision."""
    from . import department_routing_service

    ward, office = resolve(complaint.latitude, complaint.longitude)
    complaint.ward = ward
    complaint.office = office
    complaint.routing_status = "routed" if office else "unmapped"
    department_routing_service.record_assignment(
        complaint, complaint.department, reason="auto_routing" if office else "unmapped",
        note=(f"Routed to {office.name} ({ward.name}) by location" if office
              else "No configured ward contains this location - placed in the administrative queue"),
        office=office,
    )
    audit_service.record(
        "complaint.routed" if office else "complaint.unmapped", "complaint", complaint.id, actor=actor,
        complaint=complaint, office_id=office.id if office else None, ward_id=ward.id if ward else None,
    )
    return office


def office_distance_m(complaint):
    office = complaint.office
    if not office or office.latitude is None or office.longitude is None:
        return None
    return round(location_service.haversine_m(complaint.latitude, complaint.longitude, office.latitude, office.longitude), 1)


def reroute_unmapped(actor=None):
    """Re-run routing for unmapped complaints (e.g. after an admin adds wards)."""
    from ..models import Complaint
    from . import alert_service, notification_service

    routed = 0
    for complaint in Complaint.query.filter(Complaint.office_id.is_(None)).all():
        office = apply_routing(complaint, actor)
        if office:
            routed += 1
            alert_service.on_office_changed(complaint, None, actor)
            notification_service.notify_office(
                office.id, "New complaint for your office",
                f"{complaint.reference}: {complaint.title}", "new_complaint", complaint.id,
                dedupe_key=f"office-new:{complaint.id}:{office.id}",
            )
    db.session.commit()
    return routed
