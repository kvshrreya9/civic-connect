from flask import Blueprint, jsonify, request

from ..services import geocoding_service, jurisdiction_service, location_service
from ..utils.validators import CATEGORIES, PHONE_RE, parse_int, validate_coordinates

bp = Blueprint("location", __name__, url_prefix="/api/location")


@bp.get("/reverse")
def reverse():
    lat, lng = validate_coordinates(request.args.get("lat"), request.args.get("lng"))
    return jsonify(geocoding_service.reverse_geocode(lat, lng))


@bp.get("/search")
def search():
    return jsonify({"results": geocoding_service.search(request.args.get("q", ""))})


@bp.get("/nearby")
def nearby():
    lat, lng = validate_coordinates(request.args.get("lat"), request.args.get("lng"))
    radius = parse_int(request.args.get("radius"), default=500, minimum=50, maximum=5000)
    category = request.args.get("category")
    results = location_service.nearby_complaints(
        lat, lng, radius, category=category if category in CATEGORIES else None, limit=30
    )
    items = [
        {**complaint.summary(), "distance_m": distance}
        for complaint, distance in results
        if complaint.status != "rejected"
    ]
    return jsonify({"items": items, "radius": radius})


@bp.get("/municipality-contact")
def municipality_contact():
    lat, lng = validate_coordinates(request.args.get("lat"), request.args.get("lng"))
    ward, office = jurisdiction_service.resolve(lat, lng)
    if not office:
        return jsonify({"office": None, "ward": None, "contact_phone": None})
    contact_phone = office.contact_phone
    if contact_phone and not PHONE_RE.match(contact_phone):
        contact_phone = None
    return jsonify({
        "office": office.to_brief(),
        "ward": ward.to_brief(),
        "contact_phone": contact_phone,
    })


@bp.get("/offices")
def offices():
    from ..models import Office

    entries = Office.query.filter_by(is_active=True).order_by(Office.name).all()
    return jsonify({"offices": [
        {"id": office.id, "name": office.name, "office_type": office.office_type}
        for office in entries
    ]})
