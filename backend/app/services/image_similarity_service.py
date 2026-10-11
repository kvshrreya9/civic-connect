from ..utils.image_utils import hamming_distance, is_valid_hash


def similarity(hash_a, hash_b):
    """1.0 means visually identical (perceptual dHash), 0.0 means unrelated."""
    if not (is_valid_hash(hash_a) and is_valid_hash(hash_b)):
        return 0.0
    return round(1 - hamming_distance(hash_a, hash_b) / 64.0, 3)


def best_similarity(hashes_a, hashes_b):
    best = 0.0
    for a in hashes_a or []:
        for b in hashes_b or []:
            best = max(best, similarity(a, b))
    return best


def clean_hashes(values):
    return [v.lower() for v in (values or []) if isinstance(v, str) and is_valid_hash(v)][:5]
