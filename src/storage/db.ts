import { Song, DEFAULT_FX } from '../types/music';

const DB_NAME = 'fretboard_studio_db';
const DB_VERSION = 1;
const STORE_SONGS = 'songs';
const STORE_SETTINGS = 'settings';

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_SONGS)) {
        db.createObjectStore(STORE_SONGS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function dbSaveSong(song: Song): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SONGS, 'readwrite');
      const store = tx.objectStore(STORE_SONGS);
      const req = store.put(song);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fallback to localStorage
    try {
      localStorage.setItem(`song_${song.id}`, JSON.stringify(song));
      const songListJson = localStorage.getItem('song_index') || '[]';
      const songList: string[] = JSON.parse(songListJson);
      if (!songList.includes(song.id)) {
        songList.push(song.id);
        localStorage.setItem('song_index', JSON.stringify(songList));
      }
    } catch {}
  }
}

export async function dbGetSong(id: string): Promise<Song | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SONGS, 'readonly');
      const store = tx.objectStore(STORE_SONGS);
      const req = store.get(id);
      req.onsuccess = () => {
        const raw = req.result;
        if (raw) {
          // Normalize and guarantee fx and timestamps
          const song: Song = {
            ...raw,
            fx: { ...DEFAULT_FX, ...(raw.fx || {}) },
          };
          resolve(song);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const raw = localStorage.getItem(`song_${id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...parsed, fx: { ...DEFAULT_FX, ...(parsed.fx || {}) } };
      }
    } catch {}
    return null;
  }
}

export async function dbGetAllSongs(): Promise<Song[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SONGS, 'readonly');
      const store = tx.objectStore(STORE_SONGS);
      const req = store.getAll();
      req.onsuccess = () => {
        const songs: Song[] = (req.result || []).map((raw) => ({
          ...raw,
          fx: { ...DEFAULT_FX, ...(raw.fx || {}) },
        }));
        // Sort descending by updatedAt
        songs.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        resolve(songs);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    const songs: Song[] = [];
    try {
      const songListJson = localStorage.getItem('song_index') || '[]';
      const songList: string[] = JSON.parse(songListJson);
      for (const id of songList) {
        const raw = localStorage.getItem(`song_${id}`);
        if (raw) songs.push(JSON.parse(raw));
      }
      songs.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    } catch {}
    return songs;
  }
}

export async function dbDeleteSong(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SONGS, 'readwrite');
      const store = tx.objectStore(STORE_SONGS);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      localStorage.removeItem(`song_${id}`);
      const songListJson = localStorage.getItem('song_index') || '[]';
      let songList: string[] = JSON.parse(songListJson);
      songList = songList.filter((sId) => sId !== id);
      localStorage.setItem('song_index', JSON.stringify(songList));
    } catch {}
  }
}

export async function dbGetSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SETTINGS, 'readonly');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result && req.result.value !== undefined) {
          resolve(req.result.value as T);
        } else {
          resolve(defaultValue);
        }
      };
      req.onerror = () => resolve(defaultValue);
    });
  } catch {
    try {
      const val = localStorage.getItem(`pref_${key}`);
      if (val !== null) return JSON.parse(val) as T;
    } catch {}
    return defaultValue;
  }
}

export async function dbSetSetting<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SETTINGS, 'readwrite');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.put({ key, value });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      localStorage.setItem(`pref_${key}`, JSON.stringify(value));
    } catch {}
  }
}
