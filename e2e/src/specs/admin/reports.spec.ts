/**
 * Admin Reports — E2E Test Suite
 *
 * Tests community report moderation screen (app/(app)/reports.tsx)
 *
 * Coverage:
 *  ✅ Reports list loads
 *  ✅ Status filter chips are accessible
 *  ✅ Filtering by "pending" shows only pending reports
 *  ✅ Filtering by "all" restores full list
 *  ✅ Report cards show a status value
 */

import { expect } from '@wdio/globals';
import { reportsScreen } from '../../pageObjects/ReportsScreen';
import { authHelper } from '../../helpers/AuthHelper';
import { bottomTabBar } from '../../pageObjects/BottomTabBar';
import { moreScreen } from '../../pageObjects/MoreScreen';

describe('Admin Reports Screen', () => {
  before(async () => {
    await authHelper.loginAsAdmin();
  });

  after(async () => {
    await authHelper.logout();
  });

  beforeEach(async () => {
    await bottomTabBar.goToMore();
    await moreScreen.waitForScreen();
    await moreScreen.tapReports();
    await reportsScreen.waitForScreen();
  });

  it('should load the reports list', async () => {
    const isVisible = await (await reportsScreen.reportsList).isDisplayed();
    expect(isVisible).toBe(true);
  });

  it('should display filter chips', async () => {
    const allChip = await reportsScreen.filterAll;
    expect(await allChip.isDisplayed()).toBe(true);
    const pendingChip = await reportsScreen.filterPending;
    expect(await pendingChip.isDisplayed()).toBe(true);
  });

  it('should show reports when list loads', async () => {
    await reportsScreen.waitForReportsLoaded();
    const count = await reportsScreen.getReportCount();
    expect(count).toBeGreaterThan(0);
  });

  it('should display a status value on each report card', async () => {
    await reportsScreen.waitForReportsLoaded();
    const statuses = await reportsScreen.getReportStatuses();
    expect(statuses.length).toBeGreaterThan(0);
    const validStatuses = ['pending', 'reviewed', 'resolved'];
    statuses.forEach((status) => {
      expect(validStatuses).toContain(status.toLowerCase());
    });
  });

  it('should filter reports to only pending when "Pending" chip is tapped', async () => {
    await reportsScreen.waitForReportsLoaded();
    await reportsScreen.filterByStatus('pending');
    const statuses = await reportsScreen.getReportStatuses();
    if (statuses.length > 0) {
      statuses.forEach((status) => {
        expect(status.toLowerCase()).toBe('pending');
      });
    }
  });

  it('should restore full list when "All" chip is tapped after filtering', async () => {
    await reportsScreen.waitForReportsLoaded();
    const initialCount = await reportsScreen.getReportCount();
    await reportsScreen.filterByStatus('pending');
    await reportsScreen.filterByStatus('all');
    const restoredCount = await reportsScreen.getReportCount();
    expect(restoredCount).toBe(initialCount);
  });
});
