/**
 * Typed EXPO_PUBLIC_* environment variables.
 * These are statically embedded at bundle time by Metro.
 *
 * Add every new EXPO_PUBLIC_ variable here so TypeScript catches
 * missing declarations at compile time.
 */
declare namespace NodeJS {
  interface ProcessEnv {
    // ── Community backend (flood-service-community :4001) ──────────────────
    readonly EXPO_PUBLIC_API_BASE_URL: string;
    readonly EXPO_PUBLIC_AUTH_API_URL: string;

    // ── CRM backend (flood-service-crm :4002) ──────────────────────────────
    readonly EXPO_PUBLIC_CRM_API_URL: string;

    // ── Google Maps ────────────────────────────────────────────────────────
    readonly EXPO_PUBLIC_GOOGLE_MAPS_KEY: string;

    // ── Feature flags (optional) ───────────────────────────────────────────
    readonly EXPO_PUBLIC_API_MOCKING?: string;
  }
}
