/**
 * DashboardScreen POM
 *
 * Corresponding app screen: app/(app)/index.tsx (admin branch → AdminDashboardScreen)
 *
 * Required testIDs:
 *   dashboard-view       → Root ScrollView of admin dashboard
 *   analytics-stat-chip  → Each stat card/chip (shared with AnalyticsScreen)
 */
import { BasePage } from './BasePage';

export class DashboardScreen extends BasePage {
  get dashboardView(): ChainablePromiseElement {
    return this.el('dashboard-view');
  }

  get statChips(): ChainablePromiseArray {
    return $$('~analytics-stat-chip');
  }

  async waitForScreen(): Promise<void> {
    await browser.waitUntil(
      async () => {
        try {
          return await (await this.dashboardView).isDisplayed();
        } catch {
          return false;
        }
      },
      { timeout: this.DEFAULT_TIMEOUT, interval: 1000, timeoutMsg: 'Dashboard screen did not load' },
    );
  }

  async waitForStatsLoaded(): Promise<void> {
    await browser.waitUntil(
      async () => {
        const chips = await this.statChips;
        return chips.length > 0;
      },
      { timeout: 20000, interval: 1000, timeoutMsg: 'Dashboard stats did not load' },
    );
  }

  async getStatCount(): Promise<number> {
    const chips = await this.statChips;
    return chips.length;
  }

  async getStatTexts(): Promise<string[]> {
    const chips = await this.statChips;
    const texts: string[] = [];
    for (const chip of chips) {
      texts.push(await chip.getText());
    }
    return texts;
  }
}

export const dashboardScreen = new DashboardScreen();
