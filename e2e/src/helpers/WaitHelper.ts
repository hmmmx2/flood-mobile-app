/**
 * WaitHelper — reusable waiting utilities for Appium + WebdriverIO.
 *
 * Prefer these over browser.pause() — explicit waits make tests
 * faster and more resilient than fixed sleeps.
 */

export class WaitHelper {
  private readonly DEFAULT_TIMEOUT = 20000;
  private readonly DEFAULT_INTERVAL = 500;

  /**
   * Wait until an element matching the given selector is visible on screen.
   * Uses Accessibility ID selector by default.
   */
  async waitForElement(
    selector: string,
    timeout: number = this.DEFAULT_TIMEOUT,
  ): Promise<WebdriverIO.Element> {
    const el = await $(`~${selector}`);
    await el.waitForDisplayed({ timeout });
    return el;
  }

  /**
   * Wait until an element is no longer visible (hidden or removed from DOM).
   */
  async waitForElementNotVisible(
    selector: string,
    timeout: number = this.DEFAULT_TIMEOUT,
  ): Promise<void> {
    const el = await $(`~${selector}`);
    await el.waitForDisplayed({ timeout, reverse: true });
  }

  /**
   * Wait until an element is enabled (not disabled).
   * Useful for buttons that become active after form validation.
   */
  async waitForElementEnabled(
    selector: string,
    timeout: number = this.DEFAULT_TIMEOUT,
  ): Promise<WebdriverIO.Element> {
    const el = await $(`~${selector}`);
    await el.waitForEnabled({ timeout });
    return el;
  }

  /**
   * Wait until a custom condition function returns true.
   *
   * @param condition - async function that returns true when condition is met
   * @param timeout   - max wait time in ms
   * @param message   - error message shown if timeout expires
   */
  async waitForCondition(
    condition: () => Promise<boolean>,
    timeout: number = this.DEFAULT_TIMEOUT,
    message: string = 'Condition not met within timeout',
  ): Promise<void> {
    await browser.waitUntil(condition, {
      timeout,
      interval: this.DEFAULT_INTERVAL,
      timeoutMsg: message,
    });
  }

  /**
   * Wait until a native Alert dialog appears and return its text.
   * Optionally auto-dismisses with the specified button.
   */
  async waitForNativeAlert(
    timeout: number = 10000,
    dismissWith?: string,
  ): Promise<string> {
    let text = '';
    await browser.waitUntil(
      async () => {
        try {
          text = (await browser.getAlertText()) ?? '';
          return !!text;
        } catch {
          return false;
        }
      },
      { timeout, interval: 300, timeoutMsg: 'Native alert did not appear' },
    );
    if (dismissWith) {
      try {
        await browser.acceptAlert();
      } catch {
        const btn = await $(`~${dismissWith}`);
        await btn.click();
      }
    }
    return text;
  }

  /**
   * Simulate "network idle" — waits for loading spinners to disappear.
   * Use after navigation actions that trigger API calls.
   *
   * Looks for common loading indicator testIDs. Pass custom selector
   * if your screen uses a different testID.
   */
  async waitForLoadingSpinnerGone(
    loadingSelector = 'feed-loading',
    timeout = 30000,
  ): Promise<void> {
    await browser.waitUntil(
      async () => {
        try {
          const el = await $(`~${loadingSelector}`);
          return !(await el.isDisplayed());
        } catch {
          return true; // element not found = no spinner
        }
      },
      { timeout, interval: 500, timeoutMsg: 'Loading spinner did not disappear' },
    );
  }

  /**
   * Wait for a text string to appear somewhere on screen.
   * Useful when you don't have a testID but know the expected copy.
   */
  async waitForTextOnScreen(text: string, timeout = 15000): Promise<void> {
    if (driver.isAndroid) {
      const el = $(`android=new UiSelector().textContains("${text}")`);
      await el.waitForDisplayed({ timeout });
    } else {
      const el = $(`-ios predicate string:label CONTAINS "${text}"`);
      await el.waitForDisplayed({ timeout });
    }
  }

  /**
   * Wait for the app to return from background / splash screen.
   */
  async waitForAppReady(anchorTestId = 'email-input', timeout = 30000): Promise<void> {
    await this.waitForElement(anchorTestId, timeout);
  }
}

export const waitHelper = new WaitHelper();
