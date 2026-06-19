/**
 * IndexedDB-based cache utility for YouTube search results.
 * Replaces Supabase caching to eliminate egress costs.
 * 
 * Uses a single "cache" object store with:
 *   - key: the cache key (e.g. search query, "rec:videoId", "popular:artist")
 *   - value: { results, created_at }
 * 
 * Supports TTL-based expiry (default 7 days, configurable per call).
 */

const DB_NAME = "spotube_cache";
const DB_VERSION = 1;
const STORE_NAME = "youtube_cache";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.warn("IndexedDB open failed, cache disabled:", request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

export interface CacheEntry<T = any> {
  key: string;
  results: T;
  created_at: string;
}

/**
 * Get a cached value by key. Returns null if not found or expired.
 * @param key - The cache key
 * @param ttlMs - Time-to-live in milliseconds (default: 7 days)
 */
export async function cacheGet<T = any>(
  key: string,
  ttlMs: number = 7 * 24 * 60 * 60 * 1000
): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise<T | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry<T> | undefined;
        if (!entry || !entry.created_at) {
          resolve(null);
          return;
        }

        const age = Date.now() - new Date(entry.created_at).getTime();
        if (age > ttlMs) {
          // Expired — delete in background, return null
          try {
            const delTx = db.transaction(STORE_NAME, "readwrite");
            delTx.objectStore(STORE_NAME).delete(key);
          } catch { /* non-fatal */ }
          resolve(null);
          return;
        }

        resolve(entry.results);
      };

      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Set a cached value by key.
 * @param key - The cache key
 * @param results - The data to cache
 */
export async function cacheSet<T = any>(key: string, results: T): Promise<void> {
  try {
    const db = await openDB();
    return new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      const entry: CacheEntry<T> = {
        key,
        results,
        created_at: new Date().toISOString(),
      };

      store.put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        console.warn("Cache write failed (non-fatal):", tx.error);
        resolve();
      };
    });
  } catch {
    // IndexedDB unavailable — silently continue
  }
}

/**
 * Delete a specific cache entry.
 */
export async function cacheDelete(key: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // non-fatal
  }
}

/**
 * Clear all expired entries (housekeeping).
 * Call this periodically (e.g. on app start) to prevent bloat.
 */
export async function cachePurgeExpired(
  ttlMs: number = 7 * 24 * 60 * 60 * 1000
): Promise<number> {
  let purged = 0;
  try {
    const db = await openDB();
    return new Promise<number>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.openCursor();
      const now = Date.now();

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(purged);
          return;
        }

        const entry = cursor.value as CacheEntry;
        if (entry.created_at) {
          const age = now - new Date(entry.created_at).getTime();
          if (age > ttlMs) {
            cursor.delete();
            purged++;
          }
        }
        cursor.continue();
      };

      request.onerror = () => resolve(purged);
    });
  } catch {
    return purged;
  }
}
