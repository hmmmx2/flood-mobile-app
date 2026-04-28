/**
 * Mobile Community — Auth Store Tests
 *
 * Tests the Zustand useAuthStore which holds:
 *   - user: AuthUser | null
 *   - isLoading: boolean
 *
 * Actions under test:
 *   - setUser(user)   — sets the logged-in user and clears the loading flag
 *   - logout()        — clears tokenStore (AsyncStorage) and nulls the user
 *
 * Note: Token refresh is handled by the Axios interceptor in client.ts, NOT
 * by the store. Login is performed in components via authApi.login(), which
 * returns a LoginResponseDto; the component then calls setUser(data.user).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock the API client so the real axios (and Expo's fetch polyfill) never loads
jest.mock('../../api/client', () => ({
  client:    { post: jest.fn(), get: jest.fn(), patch: jest.fn(), delete: jest.fn(), interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } } },
  crmClient: { post: jest.fn(), get: jest.fn(), patch: jest.fn(), delete: jest.fn(), interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } } },
  tokenStore: {
    set:   jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    get:   jest.fn().mockResolvedValue(null),
  },
}));

import { useAuthStore } from '../authStore';
import type { AuthUser } from '../../api/types';

/** Backend shape after v2 UserSummaryDto — includes firstName, lastName, displayName. */
const MOCK_USER: AuthUser = {
  id:          'user-uuid',
  email:       'user@example.com',
  firstName:   'John',
  lastName:    'Doe',
  displayName: 'John Doe',
  role:        'customer',
  avatarUrl:   undefined,
};

describe('useAuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store to its initial state before each test
    useAuthStore.setState({ user: null, isLoading: true });
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  describe('Initial state', () => {
    it('starts with null user and isLoading true', () => {
      const { user, isLoading } = useAuthStore.getState();
      expect(user).toBeNull();
      expect(isLoading).toBe(true);
    });
  });

  // ── setUser ────────────────────────────────────────────────────────────────

  describe('setUser()', () => {
    it('stores the user object and sets isLoading to false', () => {
      useAuthStore.getState().setUser(MOCK_USER);

      const { user, isLoading } = useAuthStore.getState();
      expect(user).not.toBeNull();
      expect(user?.id).toBe('user-uuid');
      expect(user?.email).toBe('user@example.com');
      expect(user?.firstName).toBe('John');
      expect(user?.lastName).toBe('Doe');
      expect(user?.displayName).toBe('John Doe');
      expect(user?.role).toBe('customer');
      expect(isLoading).toBe(false);
    });

    it('clears the user when called with null, sets isLoading to false', () => {
      // First put a user in
      useAuthStore.getState().setUser(MOCK_USER);
      expect(useAuthStore.getState().user).not.toBeNull();

      // Then clear
      useAuthStore.getState().setUser(null);
      const { user, isLoading } = useAuthStore.getState();
      expect(user).toBeNull();
      expect(isLoading).toBe(false);
    });
  });

  // ── logout ─────────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('clears the user from state', async () => {
      useAuthStore.getState().setUser(MOCK_USER);
      expect(useAuthStore.getState().user).not.toBeNull();

      await useAuthStore.getState().logout();

      expect(useAuthStore.getState().user).toBeNull();
    });

    it('removes tokens by calling tokenStore.clear()', async () => {
      const { tokenStore } = require('../../api/client');

      await useAuthStore.getState().logout();

      expect(tokenStore.clear).toHaveBeenCalled();
    });

    it('can be called when already logged out without error', async () => {
      await expect(useAuthStore.getState().logout()).resolves.toBeUndefined();
    });
  });

  // ── User shape ─────────────────────────────────────────────────────────────

  describe('User data shape', () => {
    it('stores all AuthUser fields including displayName from backend v2', () => {
      useAuthStore.getState().setUser(MOCK_USER);

      const { user } = useAuthStore.getState();
      // Verify the full v2 user shape with separate name fields
      expect(user?.firstName).toBe('John');
      expect(user?.lastName).toBe('Doe');
      expect(user?.displayName).toBe('John Doe');
    });
  });
});
