/* Minimal promise wrapper around IndexedDB for drafts and the offline submission queue. */
const DB_NAME = 'civicconnect'
const DB_VERSION = 1
export const STORES = { drafts: 'drafts', queue: 'queue' }

let dbPromise = null

export function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORES.drafts)) db.createObjectStore(STORES.drafts, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(STORES.queue)) {
        const store = db.createObjectStore(STORES.queue, { keyPath: 'id' })
        store.createIndex('status', 'status')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  dbPromise.catch(() => {
    dbPromise = null
  })
  return dbPromise
}

async function run(storeName, mode, operation) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    const request = operation(store)
    tx.oncomplete = () => resolve(request?.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export const idbGet = (store, key) => run(store, 'readonly', (s) => s.get(key))
export const idbGetAll = (store) => run(store, 'readonly', (s) => s.getAll())
export const idbPut = (store, value) => run(store, 'readwrite', (s) => s.put(value))
export const idbDelete = (store, key) => run(store, 'readwrite', (s) => s.delete(key))
export const idbClear = (store) => run(store, 'readwrite', (s) => s.clear())
