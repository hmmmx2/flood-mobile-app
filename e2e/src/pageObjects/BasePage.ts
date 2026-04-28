/**
 * BasePage — shared utilities for all Page Object Models.
 *
 * Selector strategy for React Native (Expo):
 *   ~label   → accessibilityLabel / accessibilityIdentifier (PREFERRED)
 *   android= → UiAutomator2 expression (Android fallback)
 *   -ios=    → XCUITest expression (iOS fallback)
 *   xpath=   → Last resort; fragile against UI changes
 *
 * testID props added to components automatically become:
 *   Android: content-desc (also queryable as resource-id in some RN versions)
 *   iOS    : accessibilityIdentifier
 *
 * Always prefer ~testID over xpath. See README.md for which testIDs
 * to add to each component.
 */

export abstract class BasePage {
  /** Maximum time (ms) to wait for an element to appear. */
  protected readonly DEFAULT_TIMEOUT = 20000;

  /**
   * Wait for this screen to be visible before interacting.
   * Subclasses override with their screen-specific anchor element.
   */
  abstract waitForScreen(): Promise<void>;

  /**
   * Platform-aware element locator.
   *
   * On Android, React Native testID maps to the content-desc attribute.
   * The `~` selector (Accessibility ID) matches content-desc on Android
   * and accessibilityIdentifier on iOS — so it works cross-platform.
   */
  protected el(testId: string): ChainablePromiseElement {
    return $(`~${testId}`);
  }

  /**
   * Finds an element by its visible text (Android UiAutomator2).
   * Use when no testID is available.
   * NOTE: iOS equivalent would be: $(`-ios predicate string:label == "${text}"`)
   */
  protected byText(text: string): ChainablePromiseElement {
    if (driver.isAndroid) {
      return $(`android=new UiSelector().text("${text}")`);
    }
    return $(`-ios predicate string:label == "${text}"`);
  }

  /**
   * Finds an element by partial text (contains match).
   */
  protected byTextContains(text: string): ChainablePromiseElement {
    if (driver.isAndroid) {
      return $(`android=new UiSelector().textContains("${text}")`);
    }
    return $(`-ios predicate string:label CONTAINS "${text}"`);
  }

  /**
   * Dismiss a native Alert.alert() dialog that React Native shows.
   * On Android this is a native AlertDialog; on iOS it's a UIAlertController.
   */
  async dismissNativeAlert(buttonText: string = 'OK'): Promise<void> {
    try {
      const btn = await $(`~${buttonText}`);
      await btn.waitForDisplayed({ timeout: 5000 });
      await btn.click();
    } catch {
      // Alert may not be present — ignore
    }
  }

  /**
   * Hide the software keyboard if it is shown.
   * On Android, `hideKeyboard()` uses the BACK key strategy.
   * On iOS, it often requires tapping outside the input.
   */
  async hideKeyboard(): Promise<void> {
    try {
      if (driver.isAndroid) {
        const shown = await driver.isKeyboardShown();
        if (shown) await driver.hideKeyboard();
      }
    } catch { /* ignore */ }
  }

  /**
   * Scroll down once on a scrollable container by swiping up.
   * Useful when an element is below the fold.
   */
  async scrollDown(): Promise<void> {
    const { width, height } = await driver.getWindowSize();
    await driver.action('pointer')
      .move({ duration: 0, x: Math.floor(width * 0.5), y: Math.floor(height * 0.7) })
      .down({ button: 0 })
      .move({ duration: 600, x: Math.floor(width * 0.5), y: Math.floor(height * 0.3) })
      .up({ button: 0 })
      .perform();
  }

  /**
   * Scroll up once (swipe down) to reveal content above.
   */
  async scrollUp(): Promise<void> {
    const { width, height } = await driver.getWindowSize();
    await driver.action('pointer')
      .move({ duration: 0, x: Math.floor(width * 0.5), y: Math.floor(height * 0.3) })
      .down({ button: 0 })
      .move({ duration: 600, x: Math.floor(width * 0.5), y: Math.floor(height * 0.7) })
      .up({ button: 0 })
      .perform();
  }
}
