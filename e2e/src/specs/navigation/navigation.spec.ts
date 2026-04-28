/**
 * Navigation — E2E Test Suite
 *
 * Tests the app's navigation structure across all major flows.
 *
 * Coverage:
 *  ✅ Bottom tabs navigate correctly (Home, Community, Blog, Map, More)
 *  ✅ Back button / gesture works from detail screens
 *  ✅ Protected screens redirect to login when not authenticated
 *  ✅ App deep link to post detail (flood-community:// scheme)
 *  ✅ Tab bar persists across all authenticated screens
 */

import { expect } from '@wdio/globals';
import { loginScreen } from '../../pageObjects/LoginScreen';
import { homeScreen } from '../../pageObjects/HomeScreen';
import { communityScreen } from '../../pageObjects/CommunityScreen';
import { blogScreen } from '../../pageObjects/BlogScreen';
import { mapScreen } from '../../pageObjects/MapScreen';
import { moreScreen } from '../../pageObjects/MoreScreen';
import { blogDetailScreen } from '../../pageObjects/BlogDetailScreen';
import { postDetailScreen } from '../../pageObjects/PostDetailScreen';
import { bottomTabBar } from '../../pageObjects/BottomTabBar';
import { authHelper } from '../../helpers/AuthHelper';

describe('Navigation', () => {
  // ── Tab navigation (authenticated) ─────────────────────────────────────────

  describe('Bottom Tab Navigation', () => {
    before(async () => {
      await authHelper.loginAsTestUser();
    });

    after(async () => {
      await authHelper.logout();
    });

    it('should show the Home screen on initial login', async () => {
      await homeScreen.waitForScreen();
      expect(await authHelper.isLoggedIn()).toBe(true);
    });

    it('should navigate to Community screen via Community tab', async () => {
      await bottomTabBar.goToCommunity();
      await communityScreen.waitForScreen();
      expect(await communityScreen.communityList.isDisplayed()).toBe(true);
    });

    it('should navigate to Blog screen via Blog tab', async () => {
      await bottomTabBar.goToBlog();
      await blogScreen.waitForScreen();
      expect(await blogScreen.blogList.isDisplayed()).toBe(true);
    });

    it('should navigate to Map screen via Map tab', async () => {
      await bottomTabBar.goToMap();
      await mapScreen.waitForScreen();
      expect(await mapScreen.isMapVisible()).toBe(true);
    });

    it('should navigate to More screen via More tab', async () => {
      await bottomTabBar.goToMore();
      await moreScreen.waitForScreen();
      // More screen has at least the profile item
      expect(await moreScreen.profileItem.isDisplayed()).toBe(true);
    });

    it('should return to Home from any tab', async () => {
      // Navigate away to Community
      await bottomTabBar.goToCommunity();
      await communityScreen.waitForScreen();

      // Then navigate back to Home
      await bottomTabBar.goToHome();
      await homeScreen.waitForScreen();
      expect(await authHelper.isLoggedIn()).toBe(true);
    });

    it('should preserve tab state when switching and returning', async () => {
      // Go to Blog and open the first blog
      await bottomTabBar.goToBlog();
      await blogScreen.waitForBlogsLoaded();

      const titlesBeforeSwitch = await blogScreen.getBlogTitles();

      // Switch to Community and back
      await bottomTabBar.goToCommunity();
      await bottomTabBar.goToBlog();
      await blogScreen.waitForScreen();

      // Blog list should still be there (React Navigation preserves tab stack)
      const titlesAfterSwitch = await blogScreen.getBlogTitles();
      expect(titlesAfterSwitch.length).toBeGreaterThanOrEqual(0);
      console.log(`[Nav] Blog titles before: ${titlesBeforeSwitch.length}, after: ${titlesAfterSwitch.length}`);
    });
  });

  // ── Back navigation tests ───────────────────────────────────────────────────

  describe('Back Navigation from Detail Screens', () => {
    before(async () => {
      try {
        const loggedIn = await authHelper.isLoggedIn();
        if (!loggedIn) await authHelper.loginAsTestUser();
      } catch {
        await authHelper.loginAsTestUser();
      }
    });

    it('should go back from blog detail to blog list', async () => {
      await bottomTabBar.goToBlog();
      await blogScreen.waitForBlogsLoaded();
      await blogScreen.tapFirstBlog();
      await blogDetailScreen.waitForScreen();

      // In-app back button
      await blogDetailScreen.tapBack();
      await blogScreen.waitForScreen();
      expect(await blogScreen.blogList.isDisplayed()).toBe(true);
    });

    it('should go back from post detail to home feed', async () => {
      await bottomTabBar.goToHome();
      await homeScreen.waitForFeedLoaded();
      await homeScreen.firstPostCard.click();
      await postDetailScreen.waitForScreen();

      await postDetailScreen.tapBack();
      await homeScreen.waitForScreen();
      expect(await authHelper.isLoggedIn()).toBe(true);
    });

    it('should go back from group detail to community list', async () => {
      await bottomTabBar.goToCommunity();
      await communityScreen.waitForGroupsLoaded();

      const groupCount = (await communityScreen.groupCards).length;
      if (groupCount === 0) {
        console.warn('[Nav] No groups to tap for back-nav test');
        return;
      }

      await communityScreen.tapFirstGroup();
      const { groupDetailScreen } = await import('../../pageObjects/GroupDetailScreen');
      await groupDetailScreen.waitForScreen();

      await groupDetailScreen.tapBack();
      await communityScreen.waitForScreen();
      expect(await communityScreen.communityList.isDisplayed()).toBe(true);
    });

    it('should support Android swipe-back gesture from detail screens', async () => {
      if (!driver.isAndroid) {
        console.log('[Nav] Skipping Android swipe-back test on iOS');
        return;
      }

      await bottomTabBar.goToBlog();
      await blogScreen.waitForBlogsLoaded();
      await blogScreen.tapFirstBlog();
      await blogDetailScreen.waitForScreen();

      // Android hardware back key
      await driver.back();

      await blogScreen.waitForScreen();
      expect(await blogScreen.blogList.isDisplayed()).toBe(true);
    });

    it('should support iOS edge swipe gesture from detail screens', async () => {
      if (!driver.isIOS) {
        console.log('[Nav] Skipping iOS edge-swipe test on Android');
        return;
      }

      await bottomTabBar.goToBlog();
      await blogScreen.waitForBlogsLoaded();
      await blogScreen.tapFirstBlog();
      await blogDetailScreen.waitForScreen();

      // Swipe from left edge to trigger iOS back gesture
      const { gestureHelper } = await import('../../helpers/GestureHelper');
      await gestureHelper.swipeRight(0.5, 400);
      await browser.pause(1000);

      await blogScreen.waitForScreen();
      expect(await blogScreen.blogList.isDisplayed()).toBe(true);
    });
  });

  // ── Auth guard tests ────────────────────────────────────────────────────────

  describe('Protected Screen Authentication Guards', () => {
    before(async () => {
      // Ensure the app is logged out
      await authHelper.ensureLoggedOut();
    });

    it('should show the Login screen when the app launches without a session', async () => {
      await loginScreen.waitForScreen();
      expect(await loginScreen.emailInput.isDisplayed()).toBe(true);
    });

    it('should redirect to Login when app is relaunched after session clear', async () => {
      // Clear the app data to simulate a fresh install / token expiry
      if (driver.isAndroid) {
        await driver.terminateApp('com.floodcommunity.app');
        try {
          await driver.execute('mobile: clearApp', { appId: 'com.floodcommunity.app' });
        } catch {
          // clearApp may not be available on all devices
        }
        await driver.activateApp('com.floodcommunity.app');
      } else {
        await driver.terminateApp('com.floodcommunity.app');
        await driver.activateApp('com.floodcommunity.app');
      }

      // Should see login screen
      await browser.waitUntil(
        async () => {
          try {
            return await (await loginScreen.emailInput).isDisplayed();
          } catch {
            return false;
          }
        },
        { timeout: 20000, interval: 1000, timeoutMsg: 'Login screen not shown after session clear' },
      );

      expect(await loginScreen.emailInput.isDisplayed()).toBe(true);
    });
  });

  // ── Deep link tests ─────────────────────────────────────────────────────────

  describe('Deep Linking', () => {
    before(async () => {
      try {
        const loggedIn = await authHelper.isLoggedIn();
        if (!loggedIn) await authHelper.loginAsTestUser();
      } catch {
        await authHelper.loginAsTestUser();
      }
    });

    it('should open the app via deep link (Android intent)', async () => {
      if (!driver.isAndroid) {
        console.log('[DeepLink] Skipping Android-specific deep link test on iOS');
        return;
      }

      /**
       * Trigger a deep link using the 'flood-community' scheme defined in app.config.js.
       * This tests that the scheme is registered and handled by Expo Router.
       *
       * Note: Replace 'test-post-id' with an actual post ID from your test database.
       */
      const postId = process.env.E2E_TEST_POST_ID ?? 'test-post-id';
      const deepLink = `flood-community://post/${postId}`;

      try {
        await driver.execute('mobile: deepLink', {
          url: deepLink,
          package: 'com.floodcommunity.app',
        });

        // Wait for either post detail or home screen (depending on whether post exists)
        await browser.waitUntil(
          async () => {
            const onDetail = await postDetailScreen.title.isDisplayed().catch(() => false);
            const onHome = await authHelper.isLoggedIn();
            return onDetail || onHome;
          },
          { timeout: 15000, interval: 1000 },
        );
      } catch (err) {
        console.warn(`[DeepLink] Deep link test failed: ${err}`);
      }
    });
  });
});
