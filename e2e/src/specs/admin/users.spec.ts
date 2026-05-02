/**
 * Admin Users — E2E Test Suite
 *
 * Tests user management screen (app/(app)/users.tsx)
 *
 * Coverage:
 *  ✅ Users list loads with at least one entry
 *  ✅ User name is visible on each card
 *  ✅ User role badge is visible on each card
 *  ✅ Search input filters users by name
 */

import { expect } from '@wdio/globals';
import { usersScreen } from '../../pageObjects/UsersScreen';
import { authHelper } from '../../helpers/AuthHelper';
import { bottomTabBar } from '../../pageObjects/BottomTabBar';
import { moreScreen } from '../../pageObjects/MoreScreen';

describe('Admin Users Screen', () => {
  before(async () => {
    await authHelper.loginAsAdmin();
  });

  after(async () => {
    await authHelper.logout();
  });

  beforeEach(async () => {
    await bottomTabBar.goToMore();
    await moreScreen.waitForScreen();
    await moreScreen.tapUsers();
    await usersScreen.waitForScreen();
  });

  it('should load the users list', async () => {
    const isVisible = await (await usersScreen.usersList).isDisplayed();
    expect(isVisible).toBe(true);
  });

  it('should display at least one user', async () => {
    await usersScreen.waitForUsersLoaded();
    const count = await usersScreen.getUserCount();
    expect(count).toBeGreaterThan(0);
  });

  it('should display a non-empty name on each user card', async () => {
    await usersScreen.waitForUsersLoaded();
    const names = await usersScreen.getUserNames();
    expect(names.length).toBeGreaterThan(0);
    names.forEach((name) => {
      expect(name.trim().length).toBeGreaterThan(0);
    });
  });

  it('should display a role badge on each user card', async () => {
    await usersScreen.waitForUsersLoaded();
    const roles = await usersScreen.getUserRoles();
    expect(roles.length).toBeGreaterThan(0);
    const validRoles = ['admin', 'customer', 'user'];
    roles.forEach((role) => {
      expect(validRoles.some((v) => role.includes(v))).toBe(true);
    });
  });

  it('should filter users by name when search is used', async () => {
    await usersScreen.waitForUsersLoaded();
    const allNames = await usersScreen.getUserNames();

    if (allNames.length === 0) {
      console.warn('[Users] No users to search');
      return;
    }

    const searchTerm = allNames[0].split(' ')[0];
    await usersScreen.searchUsers(searchTerm);

    const filteredNames = await usersScreen.getUserNames();
    filteredNames.forEach((name) => {
      expect(name.toLowerCase()).toContain(searchTerm.toLowerCase());
    });
  });
});
