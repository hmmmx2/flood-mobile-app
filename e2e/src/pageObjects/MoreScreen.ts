/**
 * MoreScreen POM
 *
 * Corresponding app screen: app/(app)/more.tsx
 *
 * The "More" tab is a menu screen that links to sub-screens.
 *
 * Required testIDs:
 *   more-profile-item    → "Profile" menu row
 *   more-alerts-item     → "Alerts" menu row
 *   more-safety-item     → "Safety" menu row
 *   more-broadcasts-item → "Broadcasts" menu row
 *   more-sensors-item    → "Sensors" menu row
 *   more-logout-item     → "Logout" menu row (if present here)
 *   more-username        → Displayed username / greeting
 */
import { BasePage } from './BasePage';

export class MoreScreen extends BasePage {
  get profileItem(): ChainablePromiseElement {
    return this.el('more-profile-item');
  }

  get alertsItem(): ChainablePromiseElement {
    return this.el('more-alerts-item');
  }

  get safetyItem(): ChainablePromiseElement {
    return this.el('more-safety-item');
  }

  get broadcastsItem(): ChainablePromiseElement {
    return this.el('more-broadcasts-item');
  }

  get sensorsItem(): ChainablePromiseElement {
    return this.el('more-sensors-item');
  }

  get logoutItem(): ChainablePromiseElement {
    return this.el('more-logout-item');
  }

  get displayedUsername(): ChainablePromiseElement {
    return this.el('more-username');
  }

  async waitForScreen(): Promise<void> {
    await browser.waitUntil(
      async () => {
        try {
          return await (await this.profileItem).isDisplayed();
        } catch {
          return false;
        }
      },
      { timeout: this.DEFAULT_TIMEOUT, interval: 1000, timeoutMsg: 'More screen did not load' },
    );
  }

  async tapProfile(): Promise<void> {
    await this.profileItem.click();
  }

  async tapAlerts(): Promise<void> {
    await this.alertsItem.click();
  }

  async tapSafety(): Promise<void> {
    await this.safetyItem.click();
  }

  async tapBroadcasts(): Promise<void> {
    await this.broadcastsItem.click();
  }

  async tapSensors(): Promise<void> {
    await this.sensorsItem.click();
  }

  async tapLogout(): Promise<void> {
    await this.logoutItem.click();
  }

  async getMenuItemLabels(): Promise<string[]> {
    // Collect all text elements in the more menu (accessible items)
    const items = await $$('android=new UiSelector().className("android.widget.TextView")');
    const labels: string[] = [];
    for (const item of items) {
      const text = await item.getText();
      if (text) labels.push(text);
    }
    return labels;
  }
}

export const moreScreen = new MoreScreen();
