/**
 * AdminCommunityScreen POM
 *
 * Corresponding app screen: app/(app)/admin-community.tsx
 *
 * Required testIDs:
 *   admin-community-list       → Main list/FlatList
 *   admin-community-post-card  → Each post card in moderation view
 *   admin-post-delete          → Delete action button per post
 */
import { BasePage } from './BasePage';

export class AdminCommunityScreen extends BasePage {
  get communityList(): ChainablePromiseElement {
    return this.el('admin-community-list');
  }

  get postCards() {
    return $$('~admin-community-post-card');
  }

  get firstDeleteButton(): ChainablePromiseElement {
    return $('~admin-post-delete');
  }

  async waitForScreen(): Promise<void> {
    await browser.waitUntil(
      async () => {
        try {
          return await (await this.communityList).isDisplayed();
        } catch {
          return false;
        }
      },
      { timeout: this.DEFAULT_TIMEOUT, interval: 1000, timeoutMsg: 'Admin community screen did not load' },
    );
  }

  async waitForPostsLoaded(): Promise<void> {
    await browser.waitUntil(
      async () => {
        const cards = await this.postCards;
        return cards.length > 0;
      },
      { timeout: 20000, interval: 1000, timeoutMsg: 'Admin community posts did not populate' },
    );
  }

  async getPostCount(): Promise<number> {
    const cards = await this.postCards;
    return cards.length;
  }

  async deleteButtonExistsForFirstPost(): Promise<boolean> {
    try {
      return await this.firstDeleteButton.isDisplayed();
    } catch {
      return false;
    }
  }
}

export const adminCommunityScreen = new AdminCommunityScreen();
