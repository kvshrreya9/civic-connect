import { createComplaint } from '../services/complaintService.js'
import { getErrorMessage, isRetryableError } from '../services/api.js'
import { getStoredToken } from '../services/authService.js'
import { listQueue, onQueueChange, removeQueueItem, updateQueueItem } from './complaintQueue.js'

const MAX_BACKOFF_MS = 5 * 60 * 1000
const BASE_BACKOFF_MS = 5000
const STALE_SENDING_MS = 2 * 60 * 1000
const listeners = new Set()
let running = false
let state = { syncing: false, lastSyncAt: null, lastResult: null }

function setState(changes) {
  state = { ...state, ...changes }
  listeners.forEach((listener) => listener(state))
}

export function subscribe(listener) {
  listeners.add(listener)
  listener(state)
  return () => listeners.delete(listener)
}

export function getState() {
  return state
}

function backoff(attempts) {
  return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1))
}

/** Send every due queued complaint once. Safe to call repeatedly; a lock prevents overlap. */
export async function processQueue({ force = false } = {}) {
  if (running || (typeof navigator !== 'undefined' && !navigator.onLine) || !getStoredToken()) return { sent: 0, failed: 0 }
  running = true
  setState({ syncing: true })
  let sent = 0
  let failed = 0
  try {
    const items = await listQueue()
    for (const item of items) {
      const staleSending = item.status === 'sending' && Date.now() - (item.sendingSince || 0) > STALE_SENDING_MS
      if (item.status === 'sending' && !staleSending && !force) continue
      if (item.status === 'failed' && !force) continue
      if (!force && item.status === 'pending' && item.nextAttemptAt > Date.now()) continue
      await updateQueueItem(item.id, { status: 'sending', sendingSince: Date.now() })
      try {
        const files = item.files.map((f) => ({ blob: f.blob, name: f.name }))
        // item.id is the Idempotency-Key: if a previous attempt reached the server, it returns the same complaint.
        const result = await createComplaint(item.payload, files, item.id)
        await removeQueueItem(item.id)
        sent += 1
        window.dispatchEvent(new CustomEvent('complaint:synced', { detail: { queueId: item.id, complaint: result.complaint } }))
      } catch (error) {
        const attempts = item.attempts + 1
        if (isRetryableError(error)) {
          await updateQueueItem(item.id, {
            status: 'pending', attempts, lastError: getErrorMessage(error), nextAttemptAt: Date.now() + backoff(attempts),
          })
          if (!error.response) break
        } else {
          failed += 1
          await updateQueueItem(item.id, { status: 'failed', attempts, lastError: getErrorMessage(error) })
        }
      }
    }
  } catch (error) {
    console.warn('Offline queue processing failed', error)
  } finally {
    running = false
    setState({ syncing: false, lastSyncAt: new Date().toISOString(), lastResult: { sent, failed } })
  }
  return { sent, failed }
}

async function requestBackgroundSync() {
  try {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return
    const registration = await navigator.serviceWorker.ready
    await registration.sync?.register('sync-complaints')
  } catch {
    /* Background Sync is optional */
  }
}

export function start() {
  if (typeof window === 'undefined') return () => {}
  const onOnline = () => processQueue()
  const onMessage = (event) => {
    if (event.data?.type === 'SYNC_COMPLAINTS') processQueue()
  }
  window.addEventListener('online', onOnline)
  navigator.serviceWorker?.addEventListener('message', onMessage)
  const unsubscribeQueue = onQueueChange(() => requestBackgroundSync())
  const interval = window.setInterval(() => processQueue(), 30000)
  const initial = window.setTimeout(() => processQueue(), 1500)
  return () => {
    window.removeEventListener('online', onOnline)
    navigator.serviceWorker?.removeEventListener('message', onMessage)
    unsubscribeQueue()
    window.clearInterval(interval)
    window.clearTimeout(initial)
  }
}

const syncManager = { start, processQueue, subscribe, getState }
export default syncManager
