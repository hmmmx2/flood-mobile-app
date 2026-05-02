/**
 * ReportsScreen POM
 *
 * Corresponding app screen: app/(app)/reports.tsx
 *
 * Required testIDs:
 *   reports-list              → FlatList of report cards
 *   report-card               → Each report card
 *   report-card-status        → Status pill Text on each card
 *   report-mark-reviewed      → "Mark Reviewed" action button
 *   report-mark-resolved      → "Mark Resolved" action button
 *   reports-filter-all        → "All" filter chip
 *   reports-filter-pending    → "Pending" filter chip
 *   reports-filter-reviewed   → "Reviewed" filter chip
 *   reports-filter-resolved   → "Resolved" filter chip
 */
import { BasePage } from './BasePage';

export class ReportsScreen extends BasePage {
  get reportsList(): ChainablePromiseElement {
    return this.el('reports-list');
  }

  get reportCards(): ChainablePromiseArray {
    return $$('~report-card');
  }

  get firstReportCard(): ChainablePromiseElement {
    return $('~report-card');
  }

  get filterAll(): ChainablePromiseElement {
    return this.el('reports-filter-all');
  }

  get filterPending(): ChainablePromiseElement {
    return this.el('reports-filter-pending');
  }

  get filterReviewed(): ChainablePromiseElement {
    return this.el('reports-filter-reviewed');
  }

  get filterResolved(): ChainablePromiseElement {
    return this.el('reports-filter-resolved');
  }

  get markReviewedButton(): ChainablePromiseElement {
    return $('~report-mark-reviewed');
  }

  get markResolvedButton(): ChainablePromiseElement {
    return $('~report-mark-resolved');
  }

  async waitForScreen(): Promise<void> {
    await browser.waitUntil(
      async () => {
        try {
          return await (await this.reportsList).isDisplayed();
        } catch {
          return false;
        }
      },
      { timeout: this.DEFAULT_TIMEOUT, interval: 1000, timeoutMsg: 'Reports screen did not load' },
    );
  }

  async waitForReportsLoaded(): Promise<void> {
    await browser.waitUntil(
      async () => {
        const cards = await this.reportCards;
        return cards.length > 0;
      },
      { timeout: 20000, interval: 1000, timeoutMsg: 'Reports list did not populate' },
    );
  }

  async getReportCount(): Promise<number> {
    const cards = await this.reportCards;
    return cards.length;
  }

  async filterByStatus(status: 'all' | 'pending' | 'reviewed' | 'resolved'): Promise<void> {
    const map = {
      all: this.filterAll,
      pending: this.filterPending,
      reviewed: this.filterReviewed,
      resolved: this.filterResolved,
    };
    await map[status].click();
    await browser.pause(600);
  }

  async getReportStatuses(): Promise<string[]> {
    const statusEls = await $$('~report-card-status');
    const statuses: string[] = [];
    for (const el of statusEls) {
      statuses.push((await el.getText()).toLowerCase());
    }
    return statuses;
  }
}

export const reportsScreen = new ReportsScreen();
