/**
 * Admin Community Moderation — E2E Test Suite
 *
 * Tests admin community moderation screen (app/(app)/admin-community.tsx)
 *
 * Coverage:
 *  ✅ Community moderation list loads
 *  ✅ Post cards are visible
 *  ✅ Delete action exists on cards when posts are present
 */

import { expect } from '@wdio/globals';
import { adminCommunityScreen } from '../../pageObjects/AdminCommunityScreen';
import { authHelper } from '../../helpers/AuthHelper';
import { bottomTabBar } from '../../pageObjects/BottomTabBar';
import { moreScreen } from '../../pageObjects/MoreScreen';

describe('Admin Community Moderation Screen', () => {
  before(async () => {
    await authHelper.loginAsAdmin();
  });

  after(async () => {
    await authHelper.logout();
  });

  beforeEach(async () => {
    await bottomTabBar.goToMore();
    await moreScreen.waitForScreen();
    await moreScreen.tapAdminCommunity();
    await adminCommunityScreen.waitForScreen();
  });

  it('should load the community moderation list', async () => {
    const isVisible = await (await adminCommunityScreen.communityList).isDisplayed();
    expect(isVisible).toBe(true);
  });

  it('should display community post cards', async () => {
    await adminCommunityScreen.waitForPostsLoaded();
    const count = await adminCommunityScreen.getPostCount();
    expect(count).toBeGreaterThan(0);
  });

  it('should have a delete action on the first post card', async () => {
    await adminCommunityScreen.waitForPostsLoaded();
    const hasDelete = await adminCommunityScreen.deleteButtonExistsForFirstPost();
    expect(hasDelete).toBe(true);
  });
});
