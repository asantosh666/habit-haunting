export interface StorageAdapter {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

/** Backed by `localStorage`. Methods may throw when storage is unavailable or full. */
export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = globalThis.localStorage) {}
  get(key: string): string | null {
    return this.storage.getItem(key)
  }
  set(key: string, value: string): void {
    this.storage.setItem(key, value)
  }
  remove(key: string): void {
    this.storage.removeItem(key)
  }
}

/** In-memory fallback for when `localStorage` is unavailable (R9.5). */
export class MemoryStorageAdapter implements StorageAdapter {
  private readonly map = new Map<string, string>()
  get(key: string): string | null {
    return this.map.get(key) ?? null
  }
  set(key: string, value: string): void {
    this.map.set(key, value)
  }
  remove(key: string): void {
    this.map.delete(key)
  }
}
