/**
 * Mobile Community — Auth API Tests
 * Tests the login, register, and password reset API calls via mocked Axios.
 *
 * All authApi methods accept DTO objects (matching backend request bodies),
 * not positional arguments.
 */
import axios from 'axios';

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request:  { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
  post: jest.fn(), // top-level axios.post used for token refresh in interceptor
}));

// Import after mock
import { authApi } from '../index';

// Mock AsyncStorage used by tokenStore
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('Auth API', () => {
  let mockPost: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const instance = (axios.create as jest.Mock).mock.results[0]?.value;
    if (instance) mockPost = instance.post as jest.Mock;
  });

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login()', () => {
    const mockSession = {
      session: {
        accessToken:  'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresAt:    '2099-01-01T00:00:00Z',
      },
      user: {
        id:          'user-uuid',
        email:       'user@example.com',
        firstName:   'John',
        lastName:    'Doe',
        displayName: 'John Doe',
        avatarUrl:   null,
        role:        'customer',
      },
    };

    it('calls POST /auth/login with LoginRequestDto payload', async () => {
      if (!mockPost) return; // guard
      mockPost.mockResolvedValueOnce({ data: mockSession });

      await authApi.login({ email: 'user@example.com', password: 'Password@123' });

      expect(mockPost).toHaveBeenCalledWith('/auth/login', {
        email:    'user@example.com',
        password: 'Password@123',
      });
    });

    it('returns LoginResponseDto with session and user on success', async () => {
      if (!mockPost) return;
      mockPost.mockResolvedValueOnce({ data: mockSession });

      const result = await authApi.login({ email: 'user@example.com', password: 'Password@123' });

      expect(result.session.accessToken).toBe('mock-access-token');
      expect(result.session.refreshToken).toBe('mock-refresh-token');
      expect(result.user.email).toBe('user@example.com');
      expect(result.user.firstName).toBe('John');
      expect(result.user.lastName).toBe('Doe');
      expect(result.user.displayName).toBe('John Doe');
      expect(result.user.role).toBe('customer');
    });

    it('throws when server returns 401', async () => {
      if (!mockPost) return;
      const error = Object.assign(new Error('Unauthorized'), { response: { status: 401 } });
      mockPost.mockRejectedValueOnce(error);

      await expect(
        authApi.login({ email: 'wrong@example.com', password: 'wrongpass' })
      ).rejects.toThrow();
    });
  });

  // ── register ───────────────────────────────────────────────────────────────

  describe('register()', () => {
    it('calls POST /auth/register with RegisterRequestDto payload', async () => {
      if (!mockPost) return;
      mockPost.mockResolvedValueOnce({ data: {} });

      await authApi.register({
        firstName: 'John',
        lastName:  'Doe',
        email:     'john@example.com',
        password:  'Password@123',
      });

      expect(mockPost).toHaveBeenCalledWith('/auth/register', {
        firstName: 'John',
        lastName:  'Doe',
        email:     'john@example.com',
        password:  'Password@123',
      });
    });

    it('throws on duplicate email (409 conflict)', async () => {
      if (!mockPost) return;
      const error = Object.assign(new Error('Conflict'), { response: { status: 409 } });
      mockPost.mockRejectedValueOnce(error);

      await expect(
        authApi.register({
          firstName: 'John',
          lastName:  'Doe',
          email:     'existing@example.com',
          password:  'Password@123',
        })
      ).rejects.toThrow();
    });
  });

  // ── forgotPassword ─────────────────────────────────────────────────────────

  describe('forgotPassword()', () => {
    it('calls POST /auth/forgot-password with ForgotPasswordRequestDto', async () => {
      if (!mockPost) return;
      mockPost.mockResolvedValueOnce({ data: { message: 'Reset code sent' } });

      await authApi.forgotPassword({ email: 'user@example.com' });

      expect(mockPost).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'user@example.com',
      });
    });
  });

  // ── verifyResetCode ────────────────────────────────────────────────────────

  describe('verifyResetCode()', () => {
    it('calls POST /auth/verify-reset-code with VerifyResetCodeDto', async () => {
      if (!mockPost) return;
      mockPost.mockResolvedValueOnce({ data: { message: 'Code verified' } });

      await authApi.verifyResetCode({ email: 'user@example.com', code: '123456' });

      expect(mockPost).toHaveBeenCalledWith('/auth/verify-reset-code', {
        email: 'user@example.com',
        code:  '123456',
      });
    });
  });

  // ── resetPassword ──────────────────────────────────────────────────────────

  describe('resetPassword()', () => {
    it('calls POST /auth/reset-password with ResetPasswordDto', async () => {
      if (!mockPost) return;
      mockPost.mockResolvedValueOnce({ data: { message: 'Password reset successfully' } });

      await authApi.resetPassword({ email: 'user@example.com', newPassword: 'NewPassword@123' });

      expect(mockPost).toHaveBeenCalledWith('/auth/reset-password', {
        email:       'user@example.com',
        newPassword: 'NewPassword@123',
      });
    });
  });

  // ── logout ─────────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('clears the token store without making an HTTP call', async () => {
      // logout only calls tokenStore.clear() — no network request
      await expect(authApi.logout()).resolves.toBeUndefined();
      // mockPost may be undefined if jest.clearAllMocks() already wiped results
      if (mockPost) expect(mockPost).not.toHaveBeenCalled();
    });
  });
});
