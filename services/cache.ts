import * as FileSystem from 'expo-file-system';

const CACHE_DIR = `${FileSystem.cacheDirectory}app_cache/`;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type CacheEntry<T> = { data: T; ts: number };

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

function keyToPath(key: string) {
  // Replace any characters that aren't safe in a filename
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${CACHE_DIR}${safe}.json`;
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    await ensureDir();
    const entry: CacheEntry<T> = { data, ts: Date.now() };
    await FileSystem.writeAsStringAsync(keyToPath(key), JSON.stringify(entry), {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch {
    // Cache writes are best-effort — never throw
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const path = keyToPath(key);
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;

    const raw = await FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const entry: CacheEntry<T> = JSON.parse(raw);

    if (Date.now() - entry.ts > TTL_MS) {
      await FileSystem.deleteAsync(path, { idempotent: true });
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

export async function clearCache(): Promise<void> {
  try {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
  } catch {
    // ignore
  }
}
