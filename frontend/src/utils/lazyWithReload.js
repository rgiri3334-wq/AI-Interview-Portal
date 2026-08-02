import React from 'react';

/**
 * React.lazy wrapper that recovers from stale-deployment chunk errors.
 *
 * When a new version is deployed, the chunk file hashes change and the old
 * ones are pruned. A browser still holding the previous index.html will request
 * a chunk hash that no longer exists; the SPA rewrite then returns index.html
 * (MIME "text/html"), and the dynamic import fails with:
 *   "Failed to fetch dynamically imported module" / "Failed to load module script".
 *
 * Fix: on the FIRST such failure, force one hard reload so the browser fetches
 * the fresh index.html (and matching chunk hashes). A sessionStorage guard
 * prevents an infinite reload loop if the chunk is genuinely missing.
 *
 * @param {() => Promise<any>} factory  the dynamic import factory
 * @param {string} key                  unique key per chunk (for the reload guard)
 */
export function lazyWithReload(factory, key = 'chunk') {
  const FLAG = `__chunk_reload_${key}`;
  return React.lazy(async () => {
    try {
      const mod = await factory();
      // Success — clear any previous reload guard so future stale deploys can heal too.
      try { sessionStorage.removeItem(FLAG); } catch (_) {}
      return mod;
    } catch (err) {
      let alreadyReloaded = false;
      try { alreadyReloaded = !!sessionStorage.getItem(FLAG); } catch (_) {}
      if (!alreadyReloaded) {
        try { sessionStorage.setItem(FLAG, '1'); } catch (_) {}
        window.location.reload();
        // Hold rendering until the reload happens.
        return new Promise(() => {});
      }
      // Already retried once — surface the error to the ErrorBoundary.
      throw err;
    }
  });
}
