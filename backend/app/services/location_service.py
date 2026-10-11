import math

from ..models import Complaint

EARTH_RADIUS_M = 6371000.0
METERS_PER_DEGREE_LAT = 111320.0


def haversine_m(lat1, lng1, lat2, lng2):
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(min(1.0, math.sqrt(a)))


def bounding_box(lat, lng, radius_m):
    d_lat = radius_m / METERS_PER_DEGREE_LAT
    d_lng = radius_m / (METERS_PER_DEGREE_LAT * max(math.cos(math.radians(lat)), 0.01))
    return lat - d_lat, lat + d_lat, lng - d_lng, lng + d_lng


def nearby_complaints(latitude, longitude, radius_m, category=None, exclude_id=None, statuses=None, since=None, limit=50):
    """Bounding-box prefilter in SQL, exact haversine distance in Python (works with or without PostGIS)."""
    min_lat, max_lat, min_lng, max_lng = bounding_box(latitude, longitude, radius_m)
    query = Complaint.query.filter(
        Complaint.latitude.between(min_lat, max_lat),
        Complaint.longitude.between(min_lng, max_lng),
    )
    if category:
        query = query.filter(Complaint.category == category)
    if exclude_id:
        query = query.filter(Complaint.id != exclude_id)
    if statuses:
        query = query.filter(Complaint.status.in_(statuses))
    if since is not None:
        query = query.filter(Complaint.created_at >= since)
    results = []
    for complaint in query.all():
        distance = haversine_m(latitude, longitude, complaint.latitude, complaint.longitude)
        if distance <= radius_m:
            results.append((complaint, round(distance, 1)))
    results.sort(key=lambda pair: pair[1])
    return results[:limit]


def refresh_related_counts(complaint):
    """related_count = other same-category reports nearby (any non-rejected status, recent window);
    report_count  = unique citizens reporting this issue (the same citizen submitting twice counts once).
    Every original complaint record is preserved; this only changes the counters."""
    from datetime import timedelta

    from flask import current_app

    from ..extensions import utcnow

    cfg = current_app.config
    since = (complaint.created_at or utcnow()) - timedelta(days=cfg["RELATED_WINDOW_DAYS"])
    nearby = [
        c for c, _ in nearby_complaints(
            complaint.latitude, complaint.longitude, cfg["RELATED_RADIUS_M"],
            category=complaint.category, exclude_id=complaint.id, since=since, limit=500,
        )
        if c.status != "rejected"
    ]
    complaint.related_count = len(nearby)
    complaint.report_count = len({complaint.citizen_id} | {c.citizen_id for c in nearby})
    return nearby
