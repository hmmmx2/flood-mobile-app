/**
 * TestData — centralized fixture data for E2E tests.
 *
 * IMPORTANT: For CI/CD, override credentials using environment variables
 * (.env.test) rather than hardcoding production credentials here.
 * See README.md for setup instructions.
 *
 * Environment variable precedence:
 *   E2E_USER_EMAIL / E2E_USER_PASSWORD     → regular test user
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD   → admin test user
 */

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'admin';
}

/**
 * Regular community member account.
 * Must exist in the test/staging environment before tests run.
 */
export const REGULAR_USER: TestUser = {
  email: process.env.E2E_USER_EMAIL ?? 'testuser@floodwatch.test',
  password: process.env.E2E_USER_PASSWORD ?? 'TestPass123!',
  firstName: 'Test',
  lastName: 'User',
  role: 'customer',
};

/**
 * Admin account — used for admin-only screen tests.
 */
export const ADMIN_USER: TestUser = {
  email: process.env.E2E_ADMIN_EMAIL ?? 'admin@floodwatch.test',
  password: process.env.E2E_ADMIN_PASSWORD ?? 'AdminPass123!',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin',
};

/**
 * A second regular user for cross-user interaction tests
 * (e.g. liking another user's post).
 */
export const SECONDARY_USER: TestUser = {
  email: process.env.E2E_USER2_EMAIL ?? 'testuser2@floodwatch.test',
  password: process.env.E2E_USER2_PASSWORD ?? 'TestPass123!',
  firstName: 'Second',
  lastName: 'Tester',
  role: 'customer',
};

/**
 * A new account used in registration tests.
 * This account should NOT pre-exist in the database.
 * Uses a timestamp suffix to keep email unique across test runs.
 */
export function newRegistrationUser(): TestUser {
  const ts = Date.now();
  return {
    email: `e2e_new_${ts}@floodwatch.test`,
    password: 'NewUser123!',
    firstName: 'New',
    lastName: `User${ts}`,
    role: 'customer',
  };
}

// ── Invalid credential fixtures ──────────────────────────────────────────────

export const INVALID_CREDENTIALS = {
  wrongPassword: { email: REGULAR_USER.email, password: 'WrongPassword99!' },
  malformedEmail: { email: 'not-an-email', password: 'TestPass123!' },
  emptyEmail: { email: '', password: 'TestPass123!' },
  emptyPassword: { email: REGULAR_USER.email, password: '' },
  alreadyRegisteredEmail: REGULAR_USER.email,
};

// ── Post fixtures ─────────────────────────────────────────────────────────────

export const TEST_POST = {
  title: `E2E Test Post ${Date.now()}`,
  content: 'This is an automated E2E test post. Please ignore.',
};

export const TEST_COMMENT = {
  text: `E2E test comment ${Date.now()}`,
};

// ── Group fixtures ────────────────────────────────────────────────────────────

/** A known group slug that exists in the test environment. */
export const TEST_GROUP_SLUG = process.env.E2E_TEST_GROUP_SLUG ?? 'flood-kl';

// ── Sensor / Node fixtures ─────────────────────────────────────────────────────

/** A known node ID that should appear in the sensors list. */
export const TEST_NODE_ID = process.env.E2E_TEST_NODE_ID ?? 'NODE-001';

// ── Blog fixtures ─────────────────────────────────────────────────────────────

/** Title fragment of a blog article that exists in the test environment. */
export const TEST_BLOG_TITLE_FRAGMENT =
  process.env.E2E_TEST_BLOG_TITLE ?? 'Flood Safety';

// ── Reset code (for forgot-password test) ────────────────────────────────────

/**
 * The correct reset code is generated server-side; in a real test this would
 * be retrieved from a test email inbox (e.g. MailHog) or a test API endpoint.
 * Override via E2E_RESET_CODE.
 */
export const TEST_RESET_CODE = process.env.E2E_RESET_CODE ?? '123456';
