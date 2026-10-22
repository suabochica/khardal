import { createHash } from 'node:crypto';
import { CommerceError, type Collection, type Product } from '../models.ts';
import type { WooConfig } from './client.server.ts';

export interface CatalogSnapshot {
  products: Product[];
  collections: Collection[];
  searchOnly: string[];
}
export const WOO_CATALOG_TTL_MS = 30000;
export function catalogCacheKey(config: WooConfig): string {
  const identity = createHash('sha256')
    .update(`${config.consumerKey}\0${config.consumerSecret}`)
    .digest('hex');
  return `woo:v1:CO:COP:${config.url.replace(/\/+$/, '')}:${identity}`;
}
export function createWooCatalogCache(
  options: {
    now?: () => number;
    ttlMs?: number;
    maxEntries?: number;
    maxBytes?: number;
  } = {},
) {
  const {
    now = Date.now,
    ttlMs = WOO_CATALOG_TTL_MS,
    maxEntries = 4,
    maxBytes = 2 * 1024 * 1024,
  } = options;
  if (
    !Number.isFinite(ttlMs) ||
    ttlMs <= 0 ||
    ttlMs > 60000 ||
    !Number.isSafeInteger(maxEntries) ||
    maxEntries < 1 ||
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 1
  )
    throw new RangeError('Invalid catalog cache bounds.');
  type Entry = {
    expires: number;
    value?: CatalogSnapshot;
    pending?: Promise<CatalogSnapshot>;
  };
  const entries = new Map<string, Entry>();
  return {
    invalidate(key: string) {
      entries.delete(key);
    },
    size: () => entries.size,
    async load(
      key: string,
      loader: () => Promise<CatalogSnapshot>,
    ): Promise<CatalogSnapshot> {
      const existing = entries.get(key);
      if (existing?.value && existing.expires > now()) {
        entries.delete(key);
        entries.set(key, existing);
        return structuredClone(existing.value);
      }
      if (existing?.pending) return structuredClone(await existing.pending);
      entries.delete(key);
      while (entries.size >= maxEntries)
        entries.delete(entries.keys().next().value!);
      // Age starts before provider reads, not when a slow refresh finishes.
      const entry: Entry = { expires: now() + ttlMs };
      entries.set(key, entry);
      entry.pending = (async () => {
        try {
          const value = await loader();
          if (Buffer.byteLength(JSON.stringify(value)) > maxBytes)
            throw new CommerceError(
              'unavailable',
              'El catálogo supera el límite de caché configurado.',
            );
          if (entries.get(key) === entry) {
            entry.value = structuredClone(value);
            entry.pending = undefined;
            if (entry.expires <= now()) entries.delete(key);
          }
          return value;
        } catch (error) {
          if (entries.get(key) === entry) entries.delete(key);
          throw error;
        }
      })();
      return structuredClone(await entry.pending);
    },
  };
}
export type WooCatalogCache = ReturnType<typeof createWooCatalogCache>;
export const wooCatalogCache = createWooCatalogCache();
