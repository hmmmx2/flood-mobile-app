/**
 * Admin Dashboard — E2E Test Suite
 *
 * Tests the admin home screen (app/(app)/index.tsx admin branch → AdminDashboardScreen)
 *
 * Coverage:
 *  ✅ Dashboard view loads after admin login
 *  ✅ Stat chips are displayed with non-empty values
 *  ✅ Multiple stat chips are present
 */

import { expect } from '@wdio/globals';
import { dashboardScreen } from '../../pageObjects/DashboardScreen';
import { authHelper } from '../../helpers/AuthHelper';
import { bottomTabBar } from '../../pageObjects/BottomTabBar';

describe('Admin Dashboard Screen', () => {
  before(async () => {
    await authHelper.loginAsAdmin();
  });

  after(async () => {
    await authHelper.logout();
  });

  beforeEach(async () => {
    await bottomTabBar.goToHome();
    await dashboardScreen.waitForScreen();
  });

  it('should load the dashboard view', async () => {
    const isVisible = await (await dashboardScreen.dashboardView).isDisplayed();
    expect(isVisible).toBe(true);
  });

  it('should display at least one stat chip', async () => {
    await dashboardScreen.waitForStatsLoaded();
    const count = await dashboardScreen.getStatCount();
    expect(count).toBeGreaterThan(0);
  });

  it('should display stat chips with non-empty text', async () => {
    await dashboardScreen.waitForStatsLoaded();
    const texts = await dashboardScreen.getStatTexts();
    expect(texts.length).toBeGreaterThan(0);
    texts.forEach((text) => {
      expect(text.trim().length).toBeGreaterThan(0);
    });
  });
});
