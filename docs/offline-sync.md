# Offline drafts and sync

## Drafts

The report form autosaves (800 ms debounce) to IndexedDB (`civicconnect` → `drafts`), including the compressed photo blobs and the request id. Reopening the form restores it. Drafts are cleared after a successful submit or when the user discards them.

## Queued submissions

When the device is offline, or the server is unreachable / returns 408, 429 or 5xx, the report is stored in the `queue` store:

```
{ id, payload, files: [{name, type, blob, hash}], status: pending|sending|failed,
  attempts, lastError, nextAttemptAt, createdAt }
```

The user is taken to **Saved offline** (`/citizen/offline`), where each item can be retried or deleted.

## Sync manager (`offline/syncManager.js`)

Runs on app start and is triggered by:

- the browser `online` event
- a 30-second interval
- a `SYNC_COMPLAINTS` message from the service worker (Background Sync, where supported)
- the **Send now** / **Retry** buttons

A module-level lock prevents overlapping passes. Each due item is sent; on a retryable error it is rescheduled with exponential backoff (5 s, 10 s, 20 s … capped at 5 min). Non-retryable errors (e.g. validation 4xx) mark the item `failed` with the server's message. If the network drops mid-pass, the pass stops early. Items stuck in `sending` for more than 2 minutes are retried.

## Exactly-once delivery

The queue item id is a client-generated UUID that is sent as the `Idempotency-Key` header and stored in `complaints.client_request_id` (unique). If a request reached the server but the response was lost, the retry returns the existing complaint with `200` and `idempotent_replay: true` instead of creating a second one. A concurrent race is caught by the unique constraint and resolved the same way. A key reused by a different user is rejected with `409`.

The same id is reused for online retries from the form, and the submit button is disabled while a request is in flight.

## Service worker (`src/sw.js`)

- Precaches the app shell; navigation requests fall back to the cached `index.html` offline.
- Cache-first for built assets, fonts and complaint images.
- Network-first (with cached fallback) for `/api/complaints/map`, `/api/dashboard/public`, `/api/departments/routing-rules` and map tiles.
- Other API calls are never cached.

The worker is registered in production builds, and in development when `VITE_ENABLE_SW=true`.
