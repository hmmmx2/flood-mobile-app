/**
 * CommunityScreen POM
 *
 * Corresponding app screen: app/(app)/community.tsx
 *
 * Required testIDs:
 *   community-list       → FlatList/ScrollView of group cards
 *   group-card           → Each group card item
 *   group-card-name      → Group name Text inside group card
 *   group-search-input   → Search/filter TextInput
 *   join-button          → "Join" button on group card
 *   leave-button         → "Leave" button on group card
 *   create-group-button  → FAB or header button to create a group
 */
import { BasePage } from './BasePage';

export class CommunityScreen extends BasePage {
  get communityList(): ChainablePromiseElement {
    return this.el('community-list');
  }

  get groupCards(): ChainablePromiseArray {
    return $$('~group-card');
  }

  get firstGroupCard(): ChainablePromiseElement {
    return $('~group-card');
  }

  get searchInput(): ChainablePromiseElement {
    return this.el('group-search-input');
  }

  get joinButton(): ChainablePromiseElement {
    return this.el('join-button');
  }

  get leaveButton(): ChainablePromiseElement {
    return this.el('leave-button');
  }

  get createGroupButton(): ChainablePromiseElement {
    return this.el('create-group-button');
  }

  async waitForScreen(): Promise<void> {
    await browser.waitUntil(
      async () => {
        try {
          const el = await this.communityList;
          return await el.isDisplayed();
        } catch {
          return false;
        }
      },
      { timeout: this.DEFAULT_TIMEOUT, interval: 1000, timeoutMsg: 'Community screen did not load' },
    );
  }

  async waitForGroupsLoaded(): Promise<void> {
    await browser.waitUntil(
      async () => (await this.groupCards).length > 0,
      { timeout: 20000, interval: 1000, timeoutMsg: 'No groups loaded' },
    );
  }

  async searchGroups(query: string): Promise<void> {
    await this.searchInput.setValue(query);
    // Wait for list to filter
    await browser.pause(800);
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.clearValue();
    await browser.pause(500);
  }

  async tapFirstGroup(): Promise<void> {
    await this.firstGroupCard.click();
  }

  async getGroupNames(): Promise<string[]> {
    const nameEls = await $$('~group-card-name');
    const names: string[] = [];
    for (const el of nameEls) {
      names.push(await el.getText());
    }
    return names;
  }

  async tapJoinOnFirstGroup(): Promise<void> {
    await this.joinButton.click();
  }

  async tapLeaveOnFirstGroup(): Promise<void> {
    await this.leaveButton.click();
  }

  /** Dismiss a confirmation dialog for join/leave actions. */
  async confirmDialog(): Promise<void> {
    await this.dismissNativeAlert('OK');
  }

  async cancelDialog(): Promise<void> {
    await this.dismissNativeAlert('Cancel');
  }
}

export const communityScreen = new CommunityScreen();
