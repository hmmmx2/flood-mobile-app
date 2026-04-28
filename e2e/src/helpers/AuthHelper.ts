/**
 * AuthHelper — reusable authentication actions for E2E tests.
 *
 * Use loginAs() / loginAsTestUser() in before() hooks so each spec
 * starts from an authenticated state without repeating login steps.
 */
import { loginScreen } from '../pageObjects/LoginScreen';
import { homeScreen } from '../pageObjects/HomeScreen';
import { profileScreen } from '../pageObjects/ProfileScreen';
import { moreScreen } from '../pageObjects/MoreScreen';
import { bottomTabBar } from '../pageObjects/BottomTabBar';
import { REGULAR_USER, ADMIN_USER, type TestUser } from '../data/TestData';

export class AuthHelper {
  /**
   * Perform a full login flow from the login screen.
   * Waits for the home screen to confirm successful login.
   *
   * @throws if login fails or home screen does not appear within timeout
   */
  async loginAs(email: string, password: string): Promise<void> {
    await loginScreen.waitForScreen();
    await loginScreen.login(email, password);

    // Wait for home screen — success indicator
    await browser.waitUntil(
      async () => {
        try {
          return await (await homeScreen.createPostBar).isDisplayed();
        } catch {
          return false;
        }
      },
      {
        timeout: 30000,
        interval: 1000,
        timeoutMsg: `Login as ${email} did not navigate to Home within 30s`,
      },
    );
  }

  /**
   * Login as the default regular (community member) test user.
   */
  async loginAsTestUser(): Promise<void> {
    await this.loginAs(REGULAR_USER.email, REGULAR_USER.password);
  }

  /**
   * Login as the admin test user.
   */
  async loginAsAdmin(): Promise<void> {
    await this.loginAs(ADMIN_USER.email, ADMIN_USER.password);
  }

  /**
   * Login as an arbitrary TestUser object.
   */
  async loginAsUser(user: TestUser): Promise<void> {
    await this.loginAs(user.email, user.password);
  }

  /**
   * Logout from the app. Navigates to More → Profile → Logout,
   * then verifies the login screen is shown.
   */
  async logout(): Promise<void> {
    try {
      await bottomTabBar.goToMore();
      await moreScreen.waitForScreen();
      await moreScreen.tapProfile();
      await profileScreen.waitForScreen();
      await profileScreen.logout();
    } catch {
      // If More → Profile path fails, try More → Logout directly
      try {
        await bottomTabBar.goToMore();
        await moreScreen.tapLogout();
        await moreScreen.dismissNativeAlert('OK');
      } catch {
        // As a last resort, terminate and restart the app to clear state
        await driver.terminateApp('com.floodcommunity.app');
        await driver.activateApp('com.floodcommunity.app');
      }
    }

    // Verify we're back on the login screen
    await browser.waitUntil(
      async () => {
        try {
          return await (await loginScreen.emailInput).isDisplayed();
        } catch {
          return false;
        }
      },
      { timeout: 15000, interval: 500, timeoutMsg: 'Login screen did not appear after logout' },
    );
  }

  /**
   * Check whether the app is currently showing the home (authenticated) screen.
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      return await (await homeScreen.createPostBar).isDisplayed();
    } catch {
      return false;
    }
  }

  /**
   * Ensure the app is logged out before a test that needs a clean state.
   * If already on the login screen, does nothing.
   */
  async ensureLoggedOut(): Promise<void> {
    const loggedIn = await this.isLoggedIn();
    if (loggedIn) {
      await this.logout();
    }
  }

  /**
   * Force the app to a fresh state by resetting app data.
   * More aggressive than logout — clears AsyncStorage tokens.
   *
   * Android: uses adb clear data via Appium
   * iOS: terminates + activates the app (AsyncStorage persists in
   *      simulator data unless fullReset capability is used)
   */
  async resetAppState(): Promise<void> {
    if (driver.isAndroid) {
      await driver.terminateApp('com.floodcommunity.app');
      await driver.execute('mobile: clearApp', { appId: 'com.floodcommunity.app' });
      await driver.activateApp('com.floodcommunity.app');
    } else {
      await driver.terminateApp('com.floodcommunity.app');
      await driver.activateApp('com.floodcommunity.app');
    }
    await loginScreen.waitForScreen();
  }
}

export const authHelper = new AuthHelper();
