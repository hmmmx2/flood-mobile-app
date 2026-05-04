/**
 * UsersScreen POM
 *
 * Corresponding app screen: app/(app)/users.tsx
 *
 * Required testIDs:
 *   users-list        → FlatList of user cards
 *   user-card         → Each user card
 *   user-card-name    → User display name Text
 *   user-card-role    → Role badge Text
 *   users-search-input → Search TextInput
 */
import { BasePage } from './BasePage';

export class UsersScreen extends BasePage {
  get usersList(): ChainablePromiseElement {
    return this.el('users-list');
  }

  get userCards() {
    return $$('~user-card');
  }

  get searchInput(): ChainablePromiseElement {
    return this.el('users-search-input');
  }

  async waitForScreen(): Promise<void> {
    await browser.waitUntil(
      async () => {
        try {
          return await (await this.usersList).isDisplayed();
        } catch {
          return false;
        }
      },
      { timeout: this.DEFAULT_TIMEOUT, interval: 1000, timeoutMsg: 'Users screen did not load' },
    );
  }

  async waitForUsersLoaded(): Promise<void> {
    await browser.waitUntil(
      async () => {
        const cards = await this.userCards;
        return cards.length > 0;
      },
      { timeout: 20000, interval: 1000, timeoutMsg: 'Users list did not populate' },
    );
  }

  async getUserCount(): Promise<number> {
    const cards = await this.userCards;
    return cards.length;
  }

  async getUserNames(): Promise<string[]> {
    const nameEls = await $$('~user-card-name');
    const names: string[] = [];
    for (const el of nameEls) {
      names.push(await el.getText());
    }
    return names;
  }

  async getUserRoles(): Promise<string[]> {
    const roleEls = await $$('~user-card-role');
    const roles: string[] = [];
    for (const el of roleEls) {
      roles.push((await el.getText()).toLowerCase());
    }
    return roles;
  }

  async searchUsers(query: string): Promise<void> {
    const input = await this.searchInput;
    await input.waitForDisplayed({ timeout: 8000 });
    await input.clearValue();
    await input.setValue(query);
    await this.hideKeyboard();
    await browser.pause(600);
  }
}

export const usersScreen = new UsersScreen();
