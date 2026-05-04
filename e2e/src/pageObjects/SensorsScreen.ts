/**
 * SensorsScreen POM
 *
 * Corresponding app screen: app/(app)/sensors.tsx
 *
 * Required testIDs:
 *   sensors-list         → FlatList of sensor cards
 *   sensor-card          → Each sensor card
 *   sensor-card-name     → Node name Text
 *   sensor-card-reading  → Water level reading Text
 *   sensor-card-status   → Status badge Text (Normal/Watch/Warning/Critical/Offline)
 *   sensor-card-area     → Area / location Text
 *   critical-indicator   → Visual indicator shown when status is Critical
 *   sensors-filter-bar   → Status filter row
 *   sensor-search-input  → Search TextInput
 */
import { BasePage } from './BasePage';

export class SensorsScreen extends BasePage {
  get sensorsList(): ChainablePromiseElement {
    return this.el('sensors-list');
  }

  get sensorCards() {
    return $$('~sensor-card');
  }

  get firstSensorCard(): ChainablePromiseElement {
    return $('~sensor-card');
  }

  get searchInput(): ChainablePromiseElement {
    return this.el('sensor-search-input');
  }

  get filterBar(): ChainablePromiseElement {
    return this.el('sensors-filter-bar');
  }

  async waitForScreen(): Promise<void> {
    await browser.waitUntil(
      async () => {
        try {
          return await (await this.sensorsList).isDisplayed();
        } catch {
          return false;
        }
      },
      { timeout: this.DEFAULT_TIMEOUT, interval: 1000, timeoutMsg: 'Sensors screen did not load' },
    );
  }

  async waitForSensorsLoaded(): Promise<void> {
    await browser.waitUntil(
      async () => (await this.sensorCards).length > 0,
      { timeout: 20000, interval: 1000, timeoutMsg: 'No sensor cards loaded' },
    );
  }

  async getSensorCount(): Promise<number> {
    const cards = await this.sensorCards;
    return cards.length;
  }

  async getSensorNames(): Promise<string[]> {
    const nameEls = await $$('~sensor-card-name');
    const names: string[] = [];
    for (const el of nameEls) {
      names.push(await el.getText());
    }
    return names;
  }

  async getSensorStatuses(): Promise<string[]> {
    const statusEls = await $$('~sensor-card-status');
    const statuses: string[] = [];
    for (const el of statusEls) {
      statuses.push(await el.getText());
    }
    return statuses;
  }

  /** Check whether any sensor card shows the critical visual indicator. */
  async hasCriticalSensors(): Promise<boolean> {
    try {
      const indicators = await $$('~critical-indicator');
      return indicators.length > 0;
    } catch {
      return false;
    }
  }

  async searchSensors(query: string): Promise<void> {
    await this.searchInput.setValue(query);
    await browser.pause(600);
  }
}

export const sensorsScreen = new SensorsScreen();
