/**
 * Unified Axios HTTP clients for FloodWatch
 *
 *   client    → flood-service-community (port 4001)  — auth, community, blogs, profile
 *   crmClient → flood-service-crm       (port 4002)  — dashboard, sensors, analytics,
 *                                                       broadcasts, reports, zones, users
 *
 * Both backends share the same JWT_SECRET, so a token issued by community is
 * accepted by the CRM backend. Users only need ONE account.
 *
 * Features:
 *  - Unified token storage under 'floodwatch_tokens'
 *  - JWT Bearer token injection on every request (both clients)
 *  - Silent token refresh on 401 (one retry, shared isRefreshing gate)
 */

import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LoginResponseDto, RefreshResponseDto } from './types';

const AUTH_BASE_URL =
  process.env.EXPO_PUBLIC_AUTH_API_URL ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4001';

const CRM_BASE_URL =
  process.env.EXPO_PUBLIC_CRM_API_URL ?? 'http://localhost:4002';

// ── Unified token store ──────────────────────────────────────────────────────

/**
 * Single token key shared by both clients.
 * Replaces the old 'community_tokens' and 'crm_admin_tokens' keys.
 */
const TOKEN_KEY = 'floodwatch_tokens';

type TokenSet = { accessToken: string; refreshToken: string };

async function readTokens(): Promise<TokenSet | null> {
  try {
    const raw = await AsyncStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function writeTokens(t: TokenSet | null): Promise<void> {
  try {
    if (t) await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(t));
    else await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

// ── Auth failure callback (avoids circular dependency with authStore) ─────────

let _onAuthFailure: (() => void) | null = null;

/** Call once at app startup to register a handler that runs when refresh fails. */
export function registerAuthFailureHandler(handler: () => void): void {
  _onAuthFailure = handler;
}

// ── Shared interceptor factory ───────────────────────────────────────────────

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

function attachAuthInterceptor(instance: AxiosInstance): void {
  instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const tokens = await readTokens();
    if (tokens?.accessToken) {
      const headers = AxiosHeaders.from(config.headers);
      headers.set('Authorization', `Bearer ${tokens.accessToken}`);
      config.headers = headers;
    }
    return config;
  });
}

function attachRefreshInterceptor(instance: AxiosInstance): void {
  instance.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
      if (!original) throw error;

      const tokens = await readTokens();

      if (
        error.response?.status === 401 &&
        !original._retry &&
        tokens?.refreshToken
      ) {
        original._retry = true;

        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = axios
            .post<RefreshResponseDto>(`${AUTH_BASE_URL}/auth/refresh`, {
              refreshToken: tokens.refreshToken,
            })
            .then(async (res) => {
              const newTokens: TokenSet = {
                accessToken: res.data.accessToken,
                refreshToken: res.data.refreshToken ?? tokens.refreshToken,
              };
              await writeTokens(newTokens);
              return newTokens.accessToken;
            })
            .catch(async (err) => {
              await writeTokens(null);
              _onAuthFailure?.();
              throw err;
            })
            .finally(() => {
              isRefreshing = false;
              refreshPromise = null;
            });
        }

        const newToken = await refreshPromise!;
        const headers = AxiosHeaders.from(original.headers);
        headers.set('Authorization', `Bearer ${newToken}`);
        original.headers = headers;
        return instance.request(original);
      }

      throw error;
    }
  );
}

// ── Community client (port 4001) ─────────────────────────────────────────────

const client: AxiosInstance = axios.create({
  baseURL: AUTH_BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

attachAuthInterceptor(client);
attachRefreshInterceptor(client);

// ── CRM client (port 4002) ───────────────────────────────────────────────────

const crmClient: AxiosInstance = axios.create({
  baseURL: CRM_BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

attachAuthInterceptor(crmClient);
attachRefreshInterceptor(crmClient);

// ── Token store (exported for use in auth screens & store) ───────────────────

export const tokenStore = {
  async set(tokens: TokenSet): Promise<void> {
    await writeTokens(tokens);
  },
  async clear(): Promise<void> {
    await writeTokens(null);
  },
  async get(): Promise<TokenSet | null> {
    return readTokens();
  },
};

export { client, crmClient };
