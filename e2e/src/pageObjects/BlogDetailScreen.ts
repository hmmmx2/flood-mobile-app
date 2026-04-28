/**
 * BlogDetailScreen POM
 *
 * Corresponding app screen: app/(app)/blog/[id].tsx
 *
 * Required testIDs:
 *   blog-detail-title    → Article title Text
 *   blog-detail-content  → Article body ScrollView/Text
 *   blog-detail-author   → Author name Text
 *   blog-back-button     → Back navigation button (← arrow)
 */
import { BasePage } from './BasePage';

export class BlogDetailScreen extends BasePage {
  get title(): ChainablePromiseElement {
    return this.el('blog-detail-title');
  }

  get content(): ChainablePromiseElement {
    return this.el('blog-detail-content');
  }

  get author(): ChainablePromiseElement {
    return this.el('blog-detail-author');
  }

  /**
   * Back button — on Android the hardware/gesture back works too.
   * For reliability, we prefer tapping the in-app back button.
   */
  get backButton(): ChainablePromiseElement {
    return this.el('blog-back-button');
  }

  async waitForScreen(): Promise<void> {
    await this.title.waitForDisplayed({ timeout: this.DEFAULT_TIMEOUT });
  }

  async getTitleText(): Promise<string> {
    return await this.title.getText();
  }

  async getContentText(): Promise<string> {
    try {
      return await this.content.getText();
    } catch {
      return '';
    }
  }

  async tapBack(): Promise<void> {
    try {
      await this.backButton.click();
    } catch {
      // Fall back to Android hardware back key
      await driver.back();
    }
  }
}

export const blogDetailScreen = new BlogDetailScreen();
