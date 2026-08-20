import { lazy, type ComponentType } from 'react';

const RELOAD_KEY = 'rp:chunk-reload';

export function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [\w.-]+ failed|Unable to preload CSS/i.test(
    message,
  );
}

/** Reload once after a deploy when the browser still holds an old JS shell. */
export function reloadOnceForStaleChunk(error: unknown): boolean {
  if (!isStaleChunkError(error) || typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem(RELOAD_KEY)) {
      sessionStorage.removeItem(RELOAD_KEY);
      return false;
    }
    sessionStorage.setItem(RELOAD_KEY, '1');
  } catch {
    window.location.reload();
    return true;
  }
  window.location.reload();
  return true;
}

export function clearStaleChunkReloadFlag() {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    /* ignore */
  }
}

export function lazyRetry(factory: () => Promise<{ default: ComponentType<any> }>) {
  return lazy(() =>
    factory()
      .then((mod) => {
        clearStaleChunkReloadFlag();
        return mod;
      })
      .catch((error: unknown) => {
        if (reloadOnceForStaleChunk(error)) {
          return new Promise<{ default: ComponentType<any> }>(() => undefined);
        }
        throw error;
      }),
  );
}
