/**
 * Admin Blog Management — E2E Test Suite
 *
 * Tests admin blog management screen (app/(app)/admin-blogs.tsx)
 *
 * Coverage:
 *  ✅ Admin blogs list loads
 *  ✅ Blog cards are visible in the list
 *  ✅ Create new blog button is accessible
 */

import { expect } from '@wdio/globals';
import { adminBlogsScreen } from '../../pageObjects/AdminBlogsScreen';
import { authHelper } from '../../helpers/AuthHelper';
import { bottomTabBar } from '../../pageObjects/BottomTabBar';
import { moreScreen } from '../../pageObjects/MoreScreen';

describe('Admin Blog Management Screen', () => {
  before(async () => {
    await authHelper.loginAsAdmin();
  });

  after(async () => {
    await authHelper.logout();
  });

  beforeEach(async () => {
    await bottomTabBar.goToMore();
    await moreScreen.waitForScreen();
    await moreScreen.tapAdminBlogs();
    await adminBlogsScreen.waitForScreen();
  });

  it('should load the admin blogs list', async () => {
    const isVisible = await (await adminBlogsScreen.blogsList).isDisplayed();
    expect(isVisible).toBe(true);
  });

  it('should display blog cards when posts exist', async () => {
    await adminBlogsScreen.waitForBlogsLoaded();
    const count = await adminBlogsScreen.getBlogCount();
    expect(count).toBeGreaterThan(0);
  });

  it('should display the create new blog button', async () => {
    const isVisible = await (await adminBlogsScreen.createButton).isDisplayed();
    expect(isVisible).toBe(true);
  });
});
