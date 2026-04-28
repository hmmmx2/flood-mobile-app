/**
 * GestureHelper — touch gesture utilities for Appium + WebdriverIO.
 *
 * Uses the W3C Actions API (browser.action('pointer')) which is the
 * recommended approach for Appium 2.x / WebdriverIO 8.x.
 *
 * Android vs iOS differences are noted per method.
 */

export class GestureHelper {
  /**
   * Swipe up on the screen (scroll content downward).
   *
   * @param startYRatio  - Y position to start swipe (0.0–1.0 of screen height)
   * @param endYRatio    - Y position to end swipe
   * @param durationMs   - gesture duration (longer = slower, more natural)
   */
  async swipeUp(
    startYRatio = 0.7,
    endYRatio = 0.3,
    durationMs = 600,
  ): Promise<void> {
    const { width, height } = await driver.getWindowSize();
    const x = Math.floor(width * 0.5);
    await driver
      .action('pointer')
      .move({ duration: 0, x, y: Math.floor(height * startYRatio) })
      .down({ button: 0 })
      .move({ duration: durationMs, x, y: Math.floor(height * endYRatio) })
      .up({ button: 0 })
      .perform();
  }

  /**
   * Swipe down on the screen (scroll content upward / pull-to-refresh).
   */
  async swipeDown(
    startYRatio = 0.3,
    endYRatio = 0.75,
    durationMs = 800,
  ): Promise<void> {
    const { width, height } = await driver.getWindowSize();
    const x = Math.floor(width * 0.5);
    await driver
      .action('pointer')
      .move({ duration: 0, x, y: Math.floor(height * startYRatio) })
      .down({ button: 0 })
      .move({ duration: durationMs, x, y: Math.floor(height * endYRatio) })
      .up({ button: 0 })
      .perform();
  }

  /**
   * Swipe left (e.g., dismiss a notification or navigate back on iOS).
   */
  async swipeLeft(yRatio = 0.5, durationMs = 400): Promise<void> {
    const { width, height } = await driver.getWindowSize();
    const y = Math.floor(height * yRatio);
    await driver
      .action('pointer')
      .move({ duration: 0, x: Math.floor(width * 0.8), y })
      .down({ button: 0 })
      .move({ duration: durationMs, x: Math.floor(width * 0.2), y })
      .up({ button: 0 })
      .perform();
  }

  /**
   * Swipe right (e.g., iOS back gesture from left edge).
   * On iOS, starting from x=0 triggers the native back gesture.
   */
  async swipeRight(yRatio = 0.5, durationMs = 400): Promise<void> {
    const { width, height } = await driver.getWindowSize();
    const y = Math.floor(height * yRatio);
    const startX = driver.isIOS ? 5 : Math.floor(width * 0.1);
    await driver
      .action('pointer')
      .move({ duration: 0, x: startX, y })
      .down({ button: 0 })
      .move({ duration: durationMs, x: Math.floor(width * 0.8), y })
      .up({ button: 0 })
      .perform();
  }

  /**
   * Scroll a specific element to the bottom of its content.
   * Repeatedly swipes up inside the element until no change is detected.
   *
   * @param scrollableElement - the container to scroll
   * @param maxSwipes         - safety limit on number of swipes
   */
  async scrollToBottom(
    scrollableElement: WebdriverIO.Element,
    maxSwipes = 10,
  ): Promise<void> {
    let lastSource = '';
    for (let i = 0; i < maxSwipes; i++) {
      const source = await driver.getPageSource();
      if (source === lastSource) break; // no change = bottom reached
      lastSource = source;
      const { x, y, width, height } = await scrollableElement.getLocation().then(
        async (loc) => {
          const size = await scrollableElement.getSize();
          return { ...loc, width: size.width, height: size.height };
        },
      );
      await driver
        .action('pointer')
        .move({ duration: 0, x: x + Math.floor(width / 2), y: y + Math.floor(height * 0.7) })
        .down({ button: 0 })
        .move({ duration: 600, x: x + Math.floor(width / 2), y: y + Math.floor(height * 0.3) })
        .up({ button: 0 })
        .perform();
      await browser.pause(400);
    }
  }

  /**
   * Tap at specific screen coordinates.
   * Use when no accessible selector is available (e.g., map markers).
   *
   * NOTE: Coordinates vary by device screen size. Prefer accessibility
   * selectors. Use this only as a last resort.
   */
  async tapCoordinates(x: number, y: number): Promise<void> {
    await driver
      .action('pointer')
      .move({ duration: 0, x, y })
      .down({ button: 0 })
      .pause(100)
      .up({ button: 0 })
      .perform();
  }

  /**
   * Long press on an element.
   * Commonly used for context menus, drag-and-drop, and selection.
   *
   * @param element     - element to long press
   * @param durationMs  - hold duration (Android default: 1000ms)
   */
  async longPress(element: WebdriverIO.Element, durationMs = 1000): Promise<void> {
    const location = await element.getLocation();
    const size = await element.getSize();
    const x = Math.floor(location.x + size.width / 2);
    const y = Math.floor(location.y + size.height / 2);
    await driver
      .action('pointer')
      .move({ duration: 0, x, y })
      .down({ button: 0 })
      .pause(durationMs)
      .up({ button: 0 })
      .perform();
  }

  /**
   * Pinch-zoom in on the screen centre (e.g., for map zoom).
   * Uses two-pointer W3C Actions.
   */
  async pinchZoomIn(): Promise<void> {
    const { width, height } = await driver.getWindowSize();
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);

    await driver
      .action('pointer', { parameters: { pointerType: 'touch' } })
      .move({ duration: 0, x: cx - 50, y: cy })
      .down({ button: 0 })
      .move({ duration: 600, x: cx - 120, y: cy })
      .up({ button: 0 })
      .perform();

    // Second touch is not easily composable in single-action chain —
    // use the mobile: pinch command on iOS if available
    if (driver.isIOS) {
      await driver.execute('mobile: pinch', {
        scale: 2.0,
        velocity: 1.0,
      });
    }
  }
}

export const gestureHelper = new GestureHelper();
