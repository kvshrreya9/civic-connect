import re
from datetime import timedelta
from difflib import SequenceMatcher

from flask import current_app

from ..extensions import db, utcnow
from ..models import DuplicateCandidate
from . import image_similarity_service, location_service

STOPWORDS = {
    "the", "and", "for", "with", "this", "that", "there", "near", "from", "into", "have", "has", "are",
    "was", "were", "very", "our", "your", "road", "street", "area", "please", "issue", "problem",
}
EXCLUDED_STATUSES = ("rejected",)


def _tokens(text):
    return {w for w in re.findall(r"[a-z0-9]+", (text or "").lower()) if len(w) > 2 and w not in STOPWORDS}


def text_similarity(a, b):
    if not a or not b:
        return 0.0
    sequence = SequenceMatcher(None, a.lower(), b.lower()).ratio()
    tokens_a, tokens_b = _tokens(a), _tokens(b)
    jaccard = len(tokens_a & tokens_b) / len(tokens_a | tokens_b) if tokens_a and tokens_b else 0.0
    return round(0.5 * sequence + 0.5 * jaccard, 3)


def find_candidates(latitude, longitude, category, description, image_hashes=None, exclude_id=None, limit=5):
    """Score nearby same-category reports. Returns dicts; nothing is ever discarded."""
    radius = current_app.config["DUPLICATE_RADIUS_M"]
    since = utcnow() - timedelta(days=current_app.config["DUPLICATE_WINDOW_DAYS"])
    threshold = current_app.config["DUPLICATE_THRESHOLD"]
    hashes = image_similarity_service.clean_hashes(image_hashes)
    candidates = []
    for complaint, distance in location_service.nearby_complaints(
        latitude, longitude, radius, category=category, exclude_id=exclude_id, since=since
    ):
        if complaint.status in EXCLUDED_STATUSES:
            continue
        distance_score = max(0.0, 1 - distance / radius)
        text_score = text_similarity(description, f"{complaint.title} {complaint.description}")
        image_score = None
        other_hashes = [img.phash for img in complaint.report_images() if img.phash]
        if hashes and other_hashes:
            image_score = image_similarity_service.best_similarity(hashes, other_hashes)
        if image_score is None:
            score = 0.55 * distance_score + 0.45 * text_score
        else:
            score = 0.40 * distance_score + 0.35 * text_score + 0.25 * image_score
        if score >= threshold:
            candidates.append(
                {
                    "complaint": complaint,
                    "score": round(score, 3),
                    "distance_m": distance,
                    "text_similarity": text_score,
                    "image_similarity": image_score,
                }
            )
    candidates.sort(key=lambda c: c["score"], reverse=True)
    return candidates[:limit]


def serialize(candidates):
    return [
        {
            "complaint": c["complaint"].summary(),
            "score": c["score"],
            "distance_m": c["distance_m"],
            "text_similarity": c["text_similarity"],
            "image_similarity": c["image_similarity"],
        }
        for c in candidates
    ]


def record_candidates(complaint, candidates):
    for c in candidates:
        db.session.add(
            DuplicateCandidate(
                complaint_id=complaint.id,
                candidate_id=c["complaint"].id,
                score=c["score"],
                distance_m=c["distance_m"],
                text_similarity=c["text_similarity"],
                image_similarity=c["image_similarity"],
            )
        )
    complaint.possible_duplicate = bool(candidates)


def candidates_for(complaint):
    return (
        DuplicateCandidate.query.filter_by(complaint_id=complaint.id)
        .order_by(DuplicateCandidate.score.desc())
        .all()
    )


def resolve_candidate(candidate_row, action):
    if action == "confirm":
        candidate_row.status = "confirmed"
        candidate_row.complaint.duplicate_of_id = candidate_row.candidate_id
    elif action == "reject":
        candidate_row.status = "rejected"
        remaining = [
            c for c in candidates_for(candidate_row.complaint) if c.status != "rejected" and c.id != candidate_row.id
        ]
        candidate_row.complaint.possible_duplicate = bool(remaining)
        if candidate_row.complaint.duplicate_of_id == candidate_row.candidate_id:
            candidate_row.complaint.duplicate_of_id = None
    db.session.commit()
    return candidate_row
