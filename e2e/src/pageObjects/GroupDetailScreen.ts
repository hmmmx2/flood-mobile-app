/**
 * GroupDetailScreen POM
 *
 * Corresponding app screen: app/(app)/g/[slug].tsx
 *
 * Required testIDs:
 *   group-name           → Group name / header Text
 *   group-description    → Group description Text
 *   group-posts-list     → Posts FlatList
 *   group-post-card      → Each post card inside group
 *   group-join-button    → "Join Group" button
 *   group-leave-button   → "Leave Group" button
 *   group-create-post-btn → "Create Post" FAB / button
 *   group-member-count   → Member count Text
 *   group-back-button    → Back navigation
 */
import { BasePage } from './BasePage';

export class GroupDetailScreen extends BasePage {
  get groupName(): ChainablePromiseElement {
    return this.el('group-name');
  }

  get groupDescription(): ChainablePromiseElement {
    return this.el('group-description');
  }

  get postsList(): ChainablePromiseElement {
    return this.el('group-posts-list');
  }

  get postCards(): ChainablePromiseArray {
    return $$('~group-post-card');
  }

  get joinButton(): ChainablePromiseElement {
    return this.el('group-join-button');
  }

  get leaveButton(): ChainablePromiseElement {
    return this.el('group-leave-button');
  }

  get createPostButton(): ChainablePromiseElement {
    return this.el('group-create-post-btn');
  }

  get memberCount(): ChainablePromiseElement {
    return this.el('group-member-count');
  }

  get backButton(): ChainablePromiseElement {
    return this.el('group-back-button');
  }

  async waitForScreen(): Promise<void> {
    await this.groupName.waitForDisplayed({ timeout: this.DEFAULT_TIMEOUT });
  }

  async getGroupNameText(): Promise<string> {
    return await this.groupName.getText();
  }

  async isJoined(): Promise<boolean> {
    try {
      return await this.leaveButton.isDisplayed();
    } catch {
      return false;
    }
  }

  async joinGroup(): Promise<void> {
    await this.joinButton.click();
    await this.dismissNativeAlert('OK');
  }

  async leaveGroup(): Promise<void> {
    await this.leaveButton.click();
    await this.dismissNativeAlert('OK');
  }

  async tapCreatePost(): Promise<void> {
    await this.createPostButton.click();
  }

  async tapBack(): Promise<void> {
    try {
      await this.backButton.click();
    } catch {
      await driver.back();
    }
  }
}

export const groupDetailScreen = new GroupDetailScreen();
