import logging

import requests
from flask import current_app

logger = logging.getLogger(__name__)
_reverse_cache = {}
_search_cache = {}
_CACHE_LIMIT = 500


def _fallback(lat, lng):
    text = f"Near {lat:.5f}, {lng:.5f}"
    return {"address": text, "display_name": text, "source": "coordinates", "components": {}}


def _headers():
    return {"User-Agent": current_app.config["GEOCODER_USER_AGENT"], "Accept-Language": "en"}


def reverse_geocode(lat, lng):
    """Free OpenStreetMap Nominatim reverse geocoding with a coordinate fallback."""
    if not current_app.config.get("GEOCODER_ENABLED"):
        return _fallback(lat, lng)
    key = (round(lat, 5), round(lng, 5))
    if key in _reverse_cache:
        return _reverse_cache[key]
    try:
        response = requests.get(
            f"{current_app.config['GEOCODER_URL']}/reverse",
            params={"lat": lat, "lon": lng, "format": "jsonv2", "zoom": 18, "addressdetails": 1},
            headers=_headers(),
            timeout=current_app.config["GEOCODER_TIMEOUT"],
        )
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Reverse geocoding failed: %s", exc)
        return _fallback(lat, lng)
    display = data.get("display_name")
    if not display:
        return _fallback(lat, lng)
    parts = data.get("address") or {}
    locality = parts.get("suburb") or parts.get("neighbourhood") or parts.get("quarter")
    city = parts.get("city") or parts.get("town") or parts.get("village") or parts.get("county")
    short = ", ".join(p for p in [parts.get("house_number"), parts.get("road"), locality, city, parts.get("postcode")] if p)
    result = {
        "address": short or display,
        "display_name": display,
        "source": "nominatim",
        "components": {"road": parts.get("road"), "locality": locality, "city": city, "postcode": parts.get("postcode")},
    }
    if len(_reverse_cache) > _CACHE_LIMIT:
        _reverse_cache.clear()
    _reverse_cache[key] = result
    return result


def search(query, limit=5):
    query = (query or "").strip()
    if len(query) < 3 or not current_app.config.get("GEOCODER_ENABLED"):
        return []
    key = (query.lower(), limit)
    if key in _search_cache:
        return _search_cache[key]
    try:
        response = requests.get(
            f"{current_app.config['GEOCODER_URL']}/search",
            params={"q": query, "format": "jsonv2", "limit": limit},
            headers=_headers(),
            timeout=current_app.config["GEOCODER_TIMEOUT"],
        )
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Geocoding search failed: %s", exc)
        return []
    results = []
    for item in data:
        try:
            results.append(
                {"display_name": item.get("display_name"), "latitude": float(item["lat"]), "longitude": float(item["lon"])}
            )
        except (KeyError, TypeError, ValueError):
            continue
    if len(_search_cache) > _CACHE_LIMIT:
        _search_cache.clear()
    _search_cache[key] = results
    return results
