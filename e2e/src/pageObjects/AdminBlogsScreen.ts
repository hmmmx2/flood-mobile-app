/**
 * AdminBlogsScreen POM
 *
 * Corresponding app screen: app/(app)/admin-blogs.tsx
 *
 * Required testIDs:
 *   admin-blogs-list    → FlatList of blog cards
 *   admin-blog-card     → Each blog management card
 *   create-blog-button  → Button to create a new blog post
 */
import { BasePage } from './BasePage';

export class AdminBlogsScreen extends BasePage {
  get blogsList(): ChainablePromiseElement {
    return this.el('admin-blogs-list');
  }

  get blogCards(): ChainablePromiseArray {
    return $$('~admin-blog-card');
  }

  get createButton(): ChainablePromiseElement {
    return this.el('create-blog-button');
  }

  async waitForScreen(): Promise<void> {
    await browser.waitUntil(
      async () => {
        try {
          return await (await this.blogsList).isDisplayed();
        } catch {
          return false;
        }
      },
      { timeout: this.DEFAULT_TIMEOUT, interval: 1000, timeoutMsg: 'Admin blogs screen did not load' },
    );
  }

  async waitForBlogsLoaded(): Promise<void> {
    await browser.waitUntil(
      async () => {
        const cards = await this.blogCards;
        return cards.length > 0;
      },
      { timeout: 20000, interval: 1000, timeoutMsg: 'Admin blogs list did not populate' },
    );
  }

  async getBlogCount(): Promise<number> {
    const cards = await this.blogCards;
    return cards.length;
  }

  async tapCreateButton(): Promise<void> {
    await this.createButton.click();
    await browser.pause(500);
  }
}

export const adminBlogsScreen = new AdminBlogsScreen();
