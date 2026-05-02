/**
 * BottomTabBar POM
 *
 * Handles navigation via the bottom tab bar present on all authenticated screens.
 *
 * Tab bar is rendered by Expo Router's tab layout in app/(app)/_layout.tsx.
 * React Navigation tab items receive accessibility labels equal to the tab name.
 *
 * Required testIDs / accessibilityLabels (set via tabBarAccessibilityLabel in _layout.tsx):
 *   tab-home       → "Home" tab
 *   tab-community  → "Community" tab
 *   tab-blog       → "Blog" tab
 *   tab-map        → "Map" tab
 *   tab-more       → "More" tab
 *
 * Fallback: React Navigation sets accessibilityLabel on each tab item equal
 * to the tab name (e.g. "Home, tab, 1 of 5"). We also handle label-based matching.
 */
import { BasePage } from './BasePage';

export class BottomTabBar extends BasePage {
  /** Home/Feed tab */
  get homeTab(): ChainablePromiseElement {
    return this.el('tab-home');
  }

  /** Community tab */
  get communityTab(): ChainablePromiseElement {
    return this.el('tab-community');
  }

  /** Blog tab */
  get blogTab(): ChainablePromiseElement {
    return this.el('tab-blog');
  }

  /** Map tab */
  get mapTab(): ChainablePromiseElement {
    return this.el('tab-map');
  }

  /** More tab */
  get moreTab(): ChainablePromiseElement {
    return this.el('tab-more');
  }

  /** Fallback: locate tab by its text label when no testID is set. */
  private tabByLabel(label: string): ChainablePromiseElement {
    return this.byTextContains(label);
  }

  async waitForScreen(): Promise<void> {
    await this.homeTab.waitForDisplayed({ timeout: this.DEFAULT_TIMEOUT });
  }

  async goToHome(): Promise<void> {
    try {
      await this.homeTab.click();
    } catch {
      await this.tabByLabel('Home').click();
    }
  }

  async goToCommunity(): Promise<void> {
    try {
      await this.communityTab.click();
    } catch {
      await this.tabByLabel('Community').click();
    }
  }

  async goToBlog(): Promise<void> {
    try {
      await this.blogTab.click();
    } catch {
      await this.tabByLabel('Blog').click();
    }
  }

  async goToMap(): Promise<void> {
    try {
      await this.mapTab.click();
    } catch {
      await this.tabByLabel('Map').click();
    }
  }

  async goToMore(): Promise<void> {
    try {
      await this.moreTab.click();
    } catch {
      await this.tabByLabel('More').click();
    }
  }

  /** Broadcasts tab (admin role direct tab) */
  get broadcastsTab(): ChainablePromiseElement {
    return this.el('tab-broadcasts');
  }

  async goToBroadcasts(): Promise<void> {
    try {
      await this.broadcastsTab.click();
    } catch {
      await this.tabByLabel('Broadcasts').click();
    }
  }

  /** Alerts tab (community role direct tab) */
  get alertsTab(): ChainablePromiseElement {
    return this.el('tab-alerts');
  }

  /** Sensors tab (community + admin direct tab) */
  get sensorsTab(): ChainablePromiseElement {
    return this.el('tab-sensors');
  }

  /** Profile tab (community role direct tab) */
  get profileTab(): ChainablePromiseElement {
    return this.el('tab-profile');
  }

  async goToAlerts(): Promise<void> {
    try {
      await this.alertsTab.click();
    } catch {
      await this.tabByLabel('Alerts').click();
    }
  }

  async goToSensors(): Promise<void> {
    try {
      await this.sensorsTab.click();
    } catch {
      await this.tabByLabel('Sensors').click();
    }
  }

  async goToProfile(): Promise<void> {
    try {
      await this.profileTab.click();
    } catch {
      await this.tabByLabel('Profile').click();
    }
  }

  /**
   * Check whether a specific tab is currently selected/active.
   * React Navigation sets aria-selected on the active tab item.
   */
  async isTabActive(tabTestId: string): Promise<boolean> {
    try {
      const tab = await $(`~${tabTestId}`);
      const selected = await tab.getAttribute('selected');
      return selected === 'true';
    } catch {
      return false;
    }
  }
}

export const bottomTabBar = new BottomTabBar();
