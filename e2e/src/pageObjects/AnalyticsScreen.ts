/**
 * AnalyticsScreen POM
 *
 * Corresponding app screen: app/(app)/analytics.tsx
 *
 * Required testIDs:
 *   analytics-view      → Root ScrollView of analytics screen
 *   analytics-stat-chip → Each stat chip/card
 */
import { BasePage } from './BasePage';

export class AnalyticsScreen extends BasePage {
  get analyticsView(): ChainablePromiseElement {
    return this.el('analytics-view');
  }

  get statChips() {
    return $$('~analytics-stat-chip');
  }

  async waitForScreen(): Promise<void> {
    await browser.waitUntil(
      async () => {
        try {
          return await (await this.analyticsView).isDisplayed();
        } catch {
          return false;
        }
      },
      { timeout: this.DEFAULT_TIMEOUT, interval: 1000, timeoutMsg: 'Analytics screen did not load' },
    );
  }

  async waitForStatsLoaded(): Promise<void> {
    await browser.waitUntil(
      async () => {
        const chips = await this.statChips;
        return chips.length > 0;
      },
      { timeout: 20000, interval: 1000, timeoutMsg: 'Analytics stats did not load' },
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

export const analyticsScreen = new AnalyticsScreen();
