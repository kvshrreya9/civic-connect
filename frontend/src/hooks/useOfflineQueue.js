import { useCallback, useEffect, useState } from 'react'
import { listQueue, onQueueChange, removeQueueItem, retryQueueItem } from '../offline/complaintQueue.js'
import syncManager from '../offline/syncManager.js'

export default function useOfflineQueue() {
  const [items, setItems] = useState([])
  const [syncState, setSyncState] = useState(syncManager.getState())
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    try {
      setItems(await listQueue())
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    reload()
    const offQueue = onQueueChange(reload)
    const offSync = syncManager.subscribe(setSyncState)
    return () => {
      offQueue()
      offSync()
    }
  }, [reload])

  const retry = useCallback(async (id) => {
    await retryQueueItem(id)
    await syncManager.processQueue({ force: true })
  }, [])

  const remove = useCallback(async (id) => {
    await removeQueueItem(id)
  }, [])

  const syncNow = useCallback(() => syncManager.processQueue({ force: true }), [])

  const pendingCount = items.filter((i) => i.status !== 'failed').length
  const failedCount = items.filter((i) => i.status === 'failed').length

  return { items, pendingCount, failedCount, syncing: syncState.syncing, lastSyncAt: syncState.lastSyncAt, error, retry, remove, syncNow, reload }
}
