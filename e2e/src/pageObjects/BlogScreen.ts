/**
 * BlogScreen POM
 *
 * Corresponding app screen: app/(app)/blog.tsx
 *
 * Required testIDs:
 *   blog-list          → FlatList of blog cards
 *   blog-card          → Each blog card item
 *   blog-card-title    → Title Text inside blog card
 *   featured-section   → Featured blogs horizontal section
 *   blog-search-input  → Search TextInput (if present)
 */
import { BasePage } from './BasePage';

export class BlogScreen extends BasePage {
  get blogList(): ChainablePromiseElement {
    return this.el('blog-list');
  }

  get blogCards(): ChainablePromiseArray {
    return $$('~blog-card');
  }

  get firstBlogCard(): ChainablePromiseElement {
    return $('~blog-card');
  }

  get featuredSection(): ChainablePromiseElement {
    return this.el('featured-section');
  }

  get searchInput(): ChainablePromiseElement {
    return this.el('blog-search-input');
  }

  async waitForScreen(): Promise<void> {
    await browser.waitUntil(
      async () => {
        try {
          return await (await this.blogList).isDisplayed();
        } catch {
          return false;
        }
      },
      { timeout: this.DEFAULT_TIMEOUT, interval: 1000, timeoutMsg: 'Blog screen did not load' },
    );
  }

  async waitForBlogsLoaded(): Promise<void> {
    await browser.waitUntil(
      async () => (await this.blogCards).length > 0,
      { timeout: 20000, interval: 1000, timeoutMsg: 'No blogs loaded' },
    );
  }

  async tapFirstBlog(): Promise<void> {
    await this.firstBlogCard.click();
  }

  async getBlogTitles(): Promise<string[]> {
    const titleEls = await $$('~blog-card-title');
    const titles: string[] = [];
    for (const el of titleEls) {
      titles.push(await el.getText());
    }
    return titles;
  }

  async isFeaturedSectionVisible(): Promise<boolean> {
    try {
      return await this.featuredSection.isDisplayed();
    } catch {
      return false;
    }
  }
}

export const blogScreen = new BlogScreen();
