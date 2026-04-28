/**
 * Register Screen — E2E Test Suite
 *
 * Tests user registration via app/(auth)/register.tsx
 *
 * Coverage:
 *  ✅ All required fields filled → success, navigates to home
 *  ✅ Missing required field (firstName) → validation error
 *  ✅ Email already registered → server error displayed
 *  ✅ Password too short → validation error
 *  ✅ Passwords don't match → validation error
 *  ✅ Invalid email format → validation error
 *  ✅ Back button returns to login screen
 */

import { expect } from '@wdio/globals';
import { registerScreen } from '../../pageObjects/RegisterScreen';
import { loginScreen } from '../../pageObjects/LoginScreen';
import { homeScreen } from '../../pageObjects/HomeScreen';
import { authHelper } from '../../helpers/AuthHelper';
import { newRegistrationUser, REGULAR_USER } from '../../data/TestData';

describe('Register Screen', () => {
  beforeEach(async () => {
    // Ensure we're on the login screen then navigate to register
    await authHelper.ensureLoggedOut();
    await loginScreen.waitForScreen();
    await loginScreen.tapRegister();
    await registerScreen.waitForScreen();
  });

  // ── Positive test cases ──────────────────────────────────────────────────────

  it('should successfully register a new account and navigate to Home', async () => {
    const newUser = newRegistrationUser();

    // Given: All required fields are filled with valid data
    await registerScreen.register({
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      password: newUser.password,
      confirmPassword: newUser.password,
    });

    // Then: On success, the app should navigate to the home screen
    await browser.waitUntil(
      async () => {
        const onHome = await authHelper.isLoggedIn();
        const alertText = await browser.getAlertText().catch(() => '');
        if (alertText) await browser.acceptAlert().catch(() => {});
        return onHome;
      },
      { timeout: 30000, interval: 1000, timeoutMsg: 'Did not navigate to Home after registration' },
    );

    expect(await authHelper.isLoggedIn()).toBe(true);
  });

  // ── Negative test cases ──────────────────────────────────────────────────────

  it('should show validation error when first name is missing', async () => {
    const newUser = newRegistrationUser();

    // Given: First name field is left empty
    // We skip firstNameInput and fill everything else
    await registerScreen.lastNameInput.setValue(newUser.lastName);
    await registerScreen.emailInput.setValue(newUser.email);
    await registerScreen.passwordInput.setValue(newUser.password);
    await registerScreen.confirmPasswordInput.setValue(newUser.password);
    await registerScreen.hideKeyboard();
    await registerScreen.registerButton.click();

    // Then: A validation error should appear (inline or native alert)
    const inlineError = await registerScreen.getInlineErrorText();
    const alertText = await registerScreen.getAlertAndDismiss();
    const hasError = inlineError.length > 0 || alertText.length > 0;
    expect(hasError).toBe(true);
  });

  it('should show error when registering with an email that already exists', async () => {
    // Given: An email that is already registered (REGULAR_USER)
    const newUser = newRegistrationUser();
    await registerScreen.register({
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: REGULAR_USER.email, // already taken
      password: newUser.password,
      confirmPassword: newUser.password,
    });

    // Then: The server should return a conflict error and it should be displayed
    const alertText = await registerScreen.getAlertAndDismiss();
    expect(alertText.toLowerCase()).toMatch(/exist|taken|already|registered|conflict/);
  });

  it('should show validation error when password is too short', async () => {
    const newUser = newRegistrationUser();

    await registerScreen.register({
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      password: '123',          // too short
      confirmPassword: '123',
    });

    const inlineError = await registerScreen.getInlineErrorText();
    const alertText = await registerScreen.getAlertAndDismiss();
    const hasError = inlineError.length > 0 || alertText.length > 0;
    expect(hasError).toBe(true);
  });

  it('should show error when passwords do not match', async () => {
    const newUser = newRegistrationUser();

    await registerScreen.register({
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      password: newUser.password,
      confirmPassword: 'DifferentPass999!', // mismatch
    });

    const inlineError = await registerScreen.getInlineErrorText();
    const alertText = await registerScreen.getAlertAndDismiss();
    const hasError = inlineError.length > 0 || alertText.length > 0;
    expect(hasError).toBe(true);
    const combinedText = (inlineError + alertText).toLowerCase();
    expect(combinedText).toMatch(/match|password|confirm/);
  });

  it('should show validation error for invalid email format', async () => {
    const newUser = newRegistrationUser();

    await registerScreen.register({
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: 'not-a-valid-email', // invalid format
      password: newUser.password,
      confirmPassword: newUser.password,
    });

    const inlineError = await registerScreen.getInlineErrorText();
    const alertText = await registerScreen.getAlertAndDismiss();
    const hasError = inlineError.length > 0 || alertText.length > 0;
    expect(hasError).toBe(true);
  });

  // ── Navigation tests ─────────────────────────────────────────────────────────

  it('should return to Login screen when back button is tapped', async () => {
    // When: The back/close button is tapped on the register screen
    await registerScreen.tapBackToLogin();

    // Then: The login screen should be visible again
    await loginScreen.waitForScreen();
    expect(await loginScreen.emailInput.isDisplayed()).toBe(true);
  });

  it('should return to Login screen when device back button is pressed (Android)', async () => {
    if (!driver.isAndroid) {
      console.log('[Register] Skipping Android back button test on iOS');
      return;
    }

    // When: Android hardware back button is pressed
    await driver.back();

    // Then: Login screen should be shown
    await loginScreen.waitForScreen();
    expect(await loginScreen.emailInput.isDisplayed()).toBe(true);
  });
});
