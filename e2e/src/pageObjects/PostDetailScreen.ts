/**
 * PostDetailScreen POM
 *
 * Corresponding app screen: app/(app)/post/[id].tsx
 *
 * Required testIDs:
 *   post-detail-title    → Post title Text
 *   post-detail-content  → Post body Text
 *   post-detail-author   → Author name Text
 *   post-like-button     → Like/heart TouchableOpacity
 *   post-like-count      → Like count Text
 *   post-comment-input   → Comment TextInput
 *   post-comment-submit  → Submit comment button
 *   comment-item         → Each comment item (use $$ to get all)
 *   post-back-button     → Back navigation button
 */
import { BasePage } from './BasePage';

export class PostDetailScreen extends BasePage {
  get title(): ChainablePromiseElement {
    return this.el('post-detail-title');
  }

  get content(): ChainablePromiseElement {
    return this.el('post-detail-content');
  }

  get author(): ChainablePromiseElement {
    return this.el('post-detail-author');
  }

  get likeButton(): ChainablePromiseElement {
    return this.el('post-like-button');
  }

  get likeCount(): ChainablePromiseElement {
    return this.el('post-like-count');
  }

  get commentInput(): ChainablePromiseElement {
    return this.el('post-comment-input');
  }

  get commentSubmit(): ChainablePromiseElement {
    return this.el('post-comment-submit');
  }

  get commentItems(): ChainablePromiseArray {
    return $$('~comment-item');
  }

  get backButton(): ChainablePromiseElement {
    return this.el('post-back-button');
  }

  async waitForScreen(): Promise<void> {
    await this.title.waitForDisplayed({ timeout: this.DEFAULT_TIMEOUT });
  }

  async getTitleText(): Promise<string> {
    return await this.title.getText();
  }

  async getLikeCountText(): Promise<string> {
    return await this.likeCount.getText();
  }

  /**
   * Check whether the post has already been liked by inspecting
   * the icon name or the accessibility state.
   */
  async isLiked(): Promise<boolean> {
    try {
      // The heart icon is 'heart' when liked, 'heart-outline' when not
      // We look for an element with testID 'post-liked-indicator'
      const indicator = await $('~post-liked-indicator');
      return await indicator.isExisting();
    } catch {
      return false;
    }
  }

  async tapLike(): Promise<void> {
    await this.likeButton.click();
  }

  async submitComment(text: string): Promise<void> {
    await this.commentInput.setValue(text);
    await this.hideKeyboard();
    await this.commentSubmit.click();
  }

  async getCommentCount(): Promise<number> {
    const items = await this.commentItems;
    return items.length;
  }

  async tapBack(): Promise<void> {
    try {
      await this.backButton.click();
    } catch {
      await driver.back();
    }
  }
}

export const postDetailScreen = new PostDetailScreen();
