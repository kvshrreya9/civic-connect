import { STORES, idbDelete, idbGet, idbGetAll, idbPut } from './db.js'

const DRAFT_ID = 'current-complaint'
const listeners = new Set()

function emit() {
  listeners.forEach((listener) => {
    try {
      listener()
    } catch {
      /* ignore listener errors */
    }
  })
}

export function onQueueChange(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Queue a complaint. The id doubles as the server Idempotency-Key, so retries never duplicate. */
export async function enqueueComplaint({ id, payload, files = [], userId }) {
  const item = {
    id,
    userId: userId || null,
    payload,
    files: files.map((f) => ({ name: f.name, type: f.blob?.type || 'image/jpeg', blob: f.blob, hash: f.hash || null })),
    status: 'pending',
    attempts: 0,
    lastError: null,
    nextAttemptAt: Date.now(),
    createdAt: new Date().toISOString(),
  }
  await idbPut(STORES.queue, item)
  emit()
  return item
}

export async function listQueue() {
  const items = (await idbGetAll(STORES.queue)) || []
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function getQueueItem(id) {
  return idbGet(STORES.queue, id)
}

export async function updateQueueItem(id, changes) {
  const item = await idbGet(STORES.queue, id)
  if (!item) return null
  const updated = { ...item, ...changes }
  await idbPut(STORES.queue, updated)
  emit()
  return updated
}

export async function removeQueueItem(id) {
  await idbDelete(STORES.queue, id)
  emit()
}

export async function retryQueueItem(id) {
  return updateQueueItem(id, { status: 'pending', nextAttemptAt: Date.now(), lastError: null })
}

export async function saveDraft(draft) {
  await idbPut(STORES.drafts, { ...draft, id: DRAFT_ID, savedAt: new Date().toISOString() })
}

export async function loadDraft() {
  return idbGet(STORES.drafts, DRAFT_ID)
}

export async function clearDraft() {
  await idbDelete(STORES.drafts, DRAFT_ID)
}
