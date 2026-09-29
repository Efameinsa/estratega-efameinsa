// Helper to access Cloudflare bindings in production
// In local dev, these are undefined and we fall back to local SQLite/filesystem

export interface CloudflareEnv {
  DB: D1Database;
  R2: R2Bucket;
}

/**
 * Get Cloudflare bindings from the request context.
 * Returns undefined in local development.
 */
export function getCloudflareEnv(): CloudflareEnv | undefined {
  try {
    // @opennextjs/cloudflare injects bindings into process.env at runtime
    const env = (process.env as unknown as CloudflareEnv);
    if (env.DB && env.R2) return env;
    return undefined;
  } catch {
    return undefined;
  }
}

export function isCloudflare(): boolean {
  return typeof globalThis !== "undefined" && "DB" in (process.env as any);
}
