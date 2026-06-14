const DB_NAME = 'japan-tracker-photos'
const STORE_NAME = 'photos'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Save a data URL photo keyed by expense ID. */
export async function savePhoto(expenseId: string, dataUrl: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(dataUrl, expenseId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Get a single photo data URL, or null if not found. */
export async function getPhoto(expenseId: string): Promise<string | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(expenseId)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

/** Delete a photo when its expense is deleted. */
export async function deletePhoto(expenseId: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(expenseId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Return all expense IDs that have a stored photo. */
export async function getPhotoIds(): Promise<string[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAllKeys()
    req.onsuccess = () => resolve(req.result as string[])
    req.onerror = () => reject(req.error)
  })
}

/**
 * Fetch only the photos for the given expense IDs (limited access — avoids
 * loading every trip's photos into memory). Missing IDs are simply absent
 * from the returned map.
 */
export async function getPhotosByIds(expenseIds: string[]): Promise<Map<string, string>> {
  if (expenseIds.length === 0) return new Map()
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const map = new Map<string, string>()
    for (const id of expenseIds) {
      const req = store.get(id)
      req.onsuccess = () => { if (req.result != null) map.set(id, req.result) }
    }
    tx.oncomplete = () => resolve(map)
    tx.onerror = () => reject(tx.error)
  })
}
