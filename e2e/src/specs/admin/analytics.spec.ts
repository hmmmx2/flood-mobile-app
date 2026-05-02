/**
 * Admin Analytics — E2E Test Suite
 *
 * Tests analytics screen (app/(app)/analytics.tsx)
 *
 * Coverage:
 *  ✅ Analytics view renders without error
 *  ✅ At least one stat chip is displayed
 *  ✅ Stat chips contain non-empty text (numeric values)
 */

import { expect } from '@wdio/globals';
import { analyticsScreen } from '../../pageObjects/AnalyticsScreen';
import { authHelper } from '../../helpers/AuthHelper';
import { bottomTabBar } from '../../pageObjects/BottomTabBar';
import { moreScreen } from '../../pageObjects/MoreScreen';

describe('Admin Analytics Screen', () => {
  before(async () => {
    await authHelper.loginAsAdmin();
  });

  after(async () => {
    await authHelper.logout();
  });

  beforeEach(async () => {
    await bottomTabBar.goToMore();
    await moreScreen.waitForScreen();
    await moreScreen.tapAnalytics();
    await analyticsScreen.waitForScreen();
  });

  it('should render the analytics view', async () => {
    const isVisible = await (await analyticsScreen.analyticsView).isDisplayed();
    expect(isVisible).toBe(true);
  });

  it('should display at least one stat chip', async () => {
    await analyticsScreen.waitForStatsLoaded();
    const count = await analyticsScreen.getStatCount();
    expect(count).toBeGreaterThan(0);
  });

  it('should show non-empty text in stat chips', async () => {
    await analyticsScreen.waitForStatsLoaded();
    const texts = await analyticsScreen.getStatTexts();
    expect(texts.length).toBeGreaterThan(0);
    texts.forEach((text) => {
      expect(text.trim().length).toBeGreaterThan(0);
    });
  });
});
