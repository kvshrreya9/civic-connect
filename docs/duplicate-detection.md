# Duplicate detection

Goal: help citizens find an existing report so they can support it, and help staff see clusters - **without ever discarding a citizen's report**.

## When it runs

1. **While the citizen types** - `POST /api/duplicates/check` is called (debounced) once a category, a pin and ~10 characters of text exist. Client-side image hashes are included when photos have been added.
2. **On submission** - the server re-runs the check with hashes computed from the stored images and saves matches in `duplicate_candidates`. The complaint is saved regardless; `possible_duplicate` is set when matches exist.

## Candidate selection

- Same category
- Within `DUPLICATE_RADIUS_M` (150 m), using a SQL bounding box then exact haversine distance
- Reported within `DUPLICATE_WINDOW_DAYS` (30 days)
- Not `rejected`

## Scoring

```
distance_score = 1 - distance / radius
text_score     = 0.5 × SequenceMatcher ratio + 0.5 × Jaccard(keyword tokens)
image_score    = best (1 - hamming(dHash_a, dHash_b) / 64) over photo pairs

with photos on both sides:  score = 0.40·distance + 0.35·text + 0.25·image
otherwise:                  score = 0.55·distance + 0.45·text
```

Candidates with `score ≥ 0.45` are returned (top 5). Stop-words and very short tokens are ignored for Jaccard.

### Image hashing

A 64-bit difference hash: the image is converted to grayscale, resized to 9×8, and each bit records whether a pixel is brighter than its right neighbour. The same algorithm runs in the browser (`imageService.computeImageHash`) and on the server (`utils/image_utils.compute_dhash`), so a pre-submit check can compare photos before they are uploaded. It is robust to resizing and recompression, not to large crops or rotations.

## What staff can do

On the complaint page, staff of the owning department can mark a candidate as **Link as duplicate** (sets `duplicate_of_id`) or **Not a duplicate**. Neither action deletes anything.

## What citizens see

A warning card listing nearby similar reports with distance, age, match percentage and a one-tap **Support this** button. Supporting raises that report's priority. The citizen may still submit their own report.
