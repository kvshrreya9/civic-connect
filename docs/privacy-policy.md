# Privacy

CivicConnect collects the minimum needed to fix public infrastructure and to show the public how well that works.

## What is collected

| Data | Why | Who sees it |
| --- | --- | --- |
| Name, email, optional phone | Account and notifications | The citizen; staff of the department handling their report |
| Password | Login | Nobody - stored only as a salted hash (Werkzeug) |
| Report text, category, severity, location, address | To find and fix the issue | Everyone (public map and dashboards), without the reporter's identity |
| Photos (report and resolution) | Evidence for crews and before/after verification | The reporting citizen and authorised staff of the responsible office only (short-lived signed links) |
| Supports, confirmations, disputes | Priority and accountability | Aggregated publicly; individual records visible to staff |

## Protections

- **Reporter identity is never public.** Other citizens and the public see "Verified citizen". Public map and dashboard endpoints contain no user identifiers.
- **Photo metadata is removed.** Photos are re-encoded in the browser before upload and again on the server; EXIF data including GPS coordinates, camera details and timestamps is not stored.
- **Faces are blurred** automatically on the server when OpenCV is available (`ENABLE_FACE_BLUR=true`). Detection is best-effort; citizens should avoid photographing people or number plates.
- **Images are resized** to at most 1600 px and stored under random file names, with citizen photos (`report/`) and resolution evidence (`resolution/`) kept separately. They are served only with a short-lived signature issued to people allowed to see the complaint.
- **Other citizens** opening a report (to support it) see a public summary only - no photos, evidence or history.
- **Internal staff notes** are never shown to citizens.
- **Secrets** (database credentials, signing keys) are read from environment variables and never committed.
- **Login attempts** are rate-limited per email.

## Third parties

- OpenStreetMap tile servers receive map tile requests from the browser.
- When enabled, OpenStreetMap Nominatim receives the coordinates of a pin to suggest an address. Set `GEOCODER_ENABLED=false` to disable this.

No data is sold or shared for advertising. No paid or key-based third-party service is required.

## Retention

Reports remain visible after resolution so the public record stays complete. Administrators can deactivate accounts (`users.is_active`). Uploaded files not referenced by any report can be removed with `flask images-maintenance --delete-orphans`.

This document describes the hackathon implementation and is not legal advice. A production deployment should be reviewed against local data-protection law.
