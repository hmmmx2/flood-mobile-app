/**
 * BroadcastsScreen POM
 *
 * Corresponding app screen: app/(app)/broadcasts.tsx
 *
 * Required testIDs:
 *   broadcasts-list           → FlatList of broadcast cards
 *   broadcast-card            → Each broadcast card
 *   create-broadcast-button   → FAB / button to open create form
 *   broadcast-severity-picker → Severity picker in create form
 *   broadcast-message-input   → Message TextInput in create form
 *   broadcast-zone-picker     → Zone picker in create form
 *   broadcast-submit-button   → Submit button in create form
 */
import { BasePage } from './BasePage';

export class BroadcastsScreen extends BasePage {
  get broadcastsList(): ChainablePromiseElement {
    return this.el('broadcasts-list');
  }

  get broadcastCards() {
    return $$('~broadcast-card');
  }

  get firstBroadcastCard(): ChainablePromiseElement {
    return $('~broadcast-card');
  }

  get createButton(): ChainablePromiseElement {
    return this.el('create-broadcast-button');
  }

  get severityPicker(): ChainablePromiseElement {
    return this.el('broadcast-severity-picker');
  }

  get messageInput(): ChainablePromiseElement {
    return this.el('broadcast-message-input');
  }

  get zonePicker(): ChainablePromiseElement {
    return this.el('broadcast-zone-picker');
  }

  get submitButton(): ChainablePromiseElement {
    return this.el('broadcast-submit-button');
  }

  async waitForScreen(): Promise<void> {
    await browser.waitUntil(
      async () => {
        try {
          return await (await this.broadcastsList).isDisplayed();
        } catch {
          return false;
        }
      },
      { timeout: this.DEFAULT_TIMEOUT, interval: 1000, timeoutMsg: 'Broadcasts screen did not load' },
    );
  }

  async waitForBroadcastsLoaded(): Promise<void> {
    await browser.waitUntil(
      async () => {
        const cards = await this.broadcastCards;
        return cards.length > 0;
      },
      { timeout: 20000, interval: 1000, timeoutMsg: 'Broadcasts list did not populate' },
    );
  }

  async getBroadcastCount(): Promise<number> {
    const cards = await this.broadcastCards;
    return cards.length;
  }

  async tapCreateButton(): Promise<void> {
    await this.createButton.click();
  }

  async fillBroadcastForm(message: string): Promise<void> {
    const input = await this.messageInput;
    await input.waitForDisplayed({ timeout: 8000 });
    await input.clearValue();
    await input.setValue(message);
    await this.hideKeyboard();
  }

  async submitForm(): Promise<void> {
    await this.submitButton.click();
    await browser.pause(1000);
  }
}

export const broadcastsScreen = new BroadcastsScreen();
