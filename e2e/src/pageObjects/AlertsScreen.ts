/**
 * AlertsScreen POM
 *
 * Corresponding app screen: app/(app)/alerts.tsx
 *
 * Required testIDs:
 *   alerts-list          → FlatList of alert cards
 *   alert-card           → Each alert card
 *   alert-card-severity  → Severity badge Text (e.g. "Critical", "Warning")
 *   alert-card-location  → Location Text
 *   alert-card-message   → Alert message Text
 *   severity-filter-all      → "All" filter chip
 *   severity-filter-critical → "Critical" filter chip
 *   severity-filter-warning  → "Warning" filter chip
 *   severity-filter-watch    → "Watch" filter chip
 *   alerts-empty-state   → Empty state view when no alerts
 */
import { BasePage } from './BasePage';

export class AlertsScreen extends BasePage {
  get alertsList(): ChainablePromiseElement {
    return this.el('alerts-list');
  }

  get alertCards(): ChainablePromiseArray {
    return $$('~alert-card');
  }

  get firstAlertCard(): ChainablePromiseElement {
    return $('~alert-card');
  }

  get filterAll(): ChainablePromiseElement {
    return this.el('severity-filter-all');
  }

  get filterCritical(): ChainablePromiseElement {
    return this.el('severity-filter-critical');
  }

  get filterWarning(): ChainablePromiseElement {
    return this.el('severity-filter-warning');
  }

  get filterWatch(): ChainablePromiseElement {
    return this.el('severity-filter-watch');
  }

  get emptyState(): ChainablePromiseElement {
    return this.el('alerts-empty-state');
  }

  async waitForScreen(): Promise<void> {
    await browser.waitUntil(
      async () => {
        try {
          return await (await this.alertsList).isDisplayed();
        } catch {
          return false;
        }
      },
      { timeout: this.DEFAULT_TIMEOUT, interval: 1000, timeoutMsg: 'Alerts screen did not load' },
    );
  }

  async waitForAlertsLoaded(): Promise<void> {
    await browser.waitUntil(
      async () => {
        const cards = await this.alertCards;
        if (cards.length > 0) return true;
        try {
          return await (await this.emptyState).isDisplayed();
        } catch {
          return false;
        }
      },
      { timeout: 20000, interval: 1000 },
    );
  }

  async getAlertCount(): Promise<number> {
    const cards = await this.alertCards;
    return cards.length;
  }

  async filterBySeverity(level: 'all' | 'critical' | 'warning' | 'watch'): Promise<void> {
    const map = {
      all: this.filterAll,
      critical: this.filterCritical,
      warning: this.filterWarning,
      watch: this.filterWatch,
    };
    await map[level].click();
    await browser.pause(500);
  }

  async getAlertSeverities(): Promise<string[]> {
    const badgeEls = await $$('~alert-card-severity');
    const severities: string[] = [];
    for (const el of badgeEls) {
      severities.push((await el.getText()).toLowerCase());
    }
    return severities;
  }
}

export const alertsScreen = new AlertsScreen();
