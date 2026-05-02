/**
 * Admin Broadcasts — E2E Test Suite
 *
 * Tests broadcast management screen (app/(app)/broadcasts.tsx)
 *
 * Coverage:
 *  ✅ Broadcasts list loads
 *  ✅ Create broadcast button is accessible
 *  ✅ Tapping create button opens the compose form
 *  ✅ Message input field is fillable
 *  ✅ Submit button is present in the form
 */

import { expect } from '@wdio/globals';
import { broadcastsScreen } from '../../pageObjects/BroadcastsScreen';
import { authHelper } from '../../helpers/AuthHelper';
import { bottomTabBar } from '../../pageObjects/BottomTabBar';

describe('Admin Broadcasts Screen', () => {
  before(async () => {
    await authHelper.loginAsAdmin();
  });

  after(async () => {
    await authHelper.logout();
  });

  beforeEach(async () => {
    await bottomTabBar.goToBroadcasts();
    await broadcastsScreen.waitForScreen();
  });

  it('should load the broadcasts list', async () => {
    const isVisible = await (await broadcastsScreen.broadcastsList).isDisplayed();
    expect(isVisible).toBe(true);
  });

  it('should display the create broadcast button', async () => {
    const isVisible = await (await broadcastsScreen.createButton).isDisplayed();
    expect(isVisible).toBe(true);
  });

  it('should open the compose form when create button is tapped', async () => {
    await broadcastsScreen.tapCreateButton();
    const messageInput = await broadcastsScreen.messageInput;
    await messageInput.waitForDisplayed({ timeout: 8000 });
    expect(await messageInput.isDisplayed()).toBe(true);
  });

  it('should allow typing a message in the broadcast form', async () => {
    await broadcastsScreen.tapCreateButton();
    await broadcastsScreen.fillBroadcastForm('E2E test broadcast message');
    const input = await broadcastsScreen.messageInput;
    const value = await input.getText();
    expect(value).toContain('E2E test broadcast');
  });

  it('should display a submit button inside the broadcast form', async () => {
    await broadcastsScreen.tapCreateButton();
    const submitBtn = await broadcastsScreen.submitButton;
    await submitBtn.waitForDisplayed({ timeout: 8000 });
    expect(await submitBtn.isDisplayed()).toBe(true);
  });
});
