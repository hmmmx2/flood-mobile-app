/**
 * HomeScreen POM — Customer feed view (app/(app)/index.tsx → CustomerFeedScreen)
 *
 * Required testIDs:
 *   feed-list         → FlatList component
 *   post-card         → Each PostCard View (use $$('~post-card') for all)
 *   post-card-title   → Post title Text inside PostCard
 *   post-author       → Author name Text inside PostCard
 *   post-timestamp    → Timestamp Text inside PostCard
 *   like-button       → Like TouchableOpacity inside PostCard
 *   comment-button    → Comment TouchableOpacity inside PostCard
 *   create-post-bar   → "Share a flood update" fake input bar
 *   create-post-title → Title TextInput inside create modal
 *   create-post-body  → Content TextInput inside create modal
 *   create-post-submit → "Post" button in create modal
 *   create-post-close → Close (×) button in modal header
 *   sort-new-tab      → "New" sort tab
 *   sort-top-tab      → "Top" sort tab
 *   alerts-button     → Notification bell in top bar
 */
import { BasePage } from './BasePage';

export class HomeScreen extends BasePage {
  /** The main feed FlatList. */
  get feedList(): ChainablePromiseElement {
    return this.el('feed-list');
  }

  /** All post cards currently rendered. */
  get postCards() {
    return $$('~post-card');
  }

  /** First visible post card. */
  get firstPostCard(): ChainablePromiseElement {
    return $('~post-card');
  }

  /** "Share a flood update" fake input bar (opens create modal). */
  get createPostBar(): ChainablePromiseElement {
    return this.el('create-post-bar');
  }

  /** Post title input inside the create-post modal. */
  get createPostTitleInput(): ChainablePromiseElement {
    return this.el('create-post-title');
  }

  /** Post body input inside the create-post modal. */
  get createPostBodyInput(): ChainablePromiseElement {
    return this.el('create-post-body');
  }

  /** "Post" submit button inside the create-post modal. */
  get createPostSubmitButton(): ChainablePromiseElement {
    return this.el('create-post-submit');
  }

  /** Close button in create-post modal. */
  get createPostCloseButton(): ChainablePromiseElement {
    return this.el('create-post-close');
  }

  get sortNewTab(): ChainablePromiseElement {
    return this.el('sort-new-tab');
  }

  get sortTopTab(): ChainablePromiseElement {
    return this.el('sort-top-tab');
  }

  get alertsButton(): ChainablePromiseElement {
    return this.el('alerts-button');
  }

  /** Activity indicator shown while the initial feed is loading. */
  get loadingIndicator(): ChainablePromiseElement {
    return this.el('feed-loading');
  }

  async waitForScreen(): Promise<void> {
    // Either the feed list or the create-post bar signals we are on Home
    await browser.waitUntil(
      async () => {
        try {
          const el = await this.createPostBar;
          return await el.isDisplayed();
        } catch {
          return false;
        }
      },
      { timeout: this.DEFAULT_TIMEOUT, interval: 1000, timeoutMsg: 'Home screen did not load' },
    );
  }

  /** Wait for post cards to appear (i.e. feed data loaded). */
  async waitForFeedLoaded(): Promise<void> {
    await browser.waitUntil(
      async () => {
        const cards = await this.postCards;
        return cards.length > 0;
      },
      { timeout: 30000, interval: 1000, timeoutMsg: 'Feed posts did not load within 30s' },
    );
  }

  /** Pull-to-refresh: swipe down from the top of the feed. */
  async pullToRefresh(): Promise<void> {
    const { width, height } = await driver.getWindowSize();
    await driver.action('pointer')
      .move({ duration: 0, x: Math.floor(width * 0.5), y: Math.floor(height * 0.25) })
      .down({ button: 0 })
      .move({ duration: 800, x: Math.floor(width * 0.5), y: Math.floor(height * 0.75) })
      .up({ button: 0 })
      .perform();
  }

  /** Open the create-post modal by tapping the fake input bar. */
  async openCreatePostModal(): Promise<void> {
    await this.createPostBar.click();
    await this.createPostTitleInput.waitForDisplayed({ timeout: 10000 });
  }

  /** Create a post through the modal. */
  async createPost(title: string, content?: string): Promise<void> {
    await this.openCreatePostModal();
    await this.createPostTitleInput.setValue(title);
    if (content) {
      await this.createPostBodyInput.setValue(content);
    }
    await this.hideKeyboard();
    await this.createPostSubmitButton.click();
  }

  /** Tap the like button on the first post card. */
  async likeFirstPost(): Promise<void> {
    const likeBtn = await $('~like-button');
    await likeBtn.click();
  }

  /**
   * Get the number of post cards currently visible in the feed.
   */
  async getPostCount(): Promise<number> {
    const cards = await this.postCards;
    return cards.length;
  }
}

export const homeScreen = new HomeScreen();
