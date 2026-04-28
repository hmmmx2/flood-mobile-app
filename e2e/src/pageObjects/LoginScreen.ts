/**
 * LoginScreen POM
 *
 * Corresponding app screen: app/(auth)/login.tsx
 *
 * Required testIDs to add to components (see README.md):
 *   email-input        → TextInput for email address
 *   password-input     → TextInput for password
 *   login-button       → TouchableOpacity "Sign In"
 *   forgot-password-link → TouchableOpacity "Forgot password?"
 *   register-link      → TouchableOpacity "Create a community account"
 *   show-password-btn  → TouchableOpacity eye icon toggle
 *
 * The current login.tsx uses Alert.alert() for errors, so there is no
 * inline error element — dismissNativeAlert() is used instead.
 */
import { BasePage } from './BasePage';

export class LoginScreen extends BasePage {
  // ── Element accessors ────────────────────────────────────────────────────────

  /** Email address input field. */
  get emailInput(): ChainablePromiseElement {
    return this.el('email-input');
  }

  /** Password input field. */
  get passwordInput(): ChainablePromiseElement {
    return this.el('password-input');
  }

  /** "Sign In" submit button. */
  get loginButton(): ChainablePromiseElement {
    return this.el('login-button');
  }

  /**
   * Native alert error message.
   * On Android: android.widget.TextView inside an AlertDialog.
   * On iOS: UIAlertController message label.
   * Use getAlertText() rather than interacting with this element directly.
   */
  get nativeAlertMessage(): ChainablePromiseElement {
    if (driver.isAndroid) {
      return $('android=new UiSelector().resourceId("android:id/message")');
    }
    return $('-ios predicate string:type == "XCUIElementTypeStaticText"');
  }

  /** "Forgot password?" link. */
  get forgotPasswordLink(): ChainablePromiseElement {
    return this.el('forgot-password-link');
  }

  /** "Create a community account" register link. */
  get registerLink(): ChainablePromiseElement {
    return this.el('register-link');
  }

  /** Loading indicator shown while login is in flight. */
  get loadingIndicator(): ChainablePromiseElement {
    return this.el('login-loading');
  }

  // ── Screen guard ────────────────────────────────────────────────────────────

  /** Wait until the login screen is visible. */
  async waitForScreen(): Promise<void> {
    await this.emailInput.waitForDisplayed({ timeout: this.DEFAULT_TIMEOUT });
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Fill credentials and tap Sign In.
   * Waits for the button to be enabled before tapping.
   */
  async login(email: string, password: string): Promise<void> {
    await this.waitForScreen();
    await this.emailInput.clearValue();
    await this.emailInput.setValue(email);
    await this.hideKeyboard();
    await this.passwordInput.clearValue();
    await this.passwordInput.setValue(password);
    await this.hideKeyboard();
    await this.loginButton.waitForEnabled({ timeout: 10000 });
    await this.loginButton.click();
  }

  /**
   * Retrieve the text of the native Alert.alert() error dialog.
   * Returns an empty string if no alert is visible.
   */
  async getAlertText(): Promise<string> {
    try {
      // WebdriverIO exposes the native alert text via getAlertText()
      const text = await browser.getAlertText();
      return text ?? '';
    } catch {
      return '';
    }
  }

  /**
   * Wait for and read the native error alert, then dismiss it.
   * Returns the full message text (title + body concatenated).
   */
  async getErrorAndDismiss(): Promise<string> {
    let message = '';
    try {
      await browser.waitUntil(
        async () => {
          try {
            const t = await browser.getAlertText();
            return !!t;
          } catch {
            return false;
          }
        },
        { timeout: 10000, interval: 500 },
      );
      message = (await browser.getAlertText()) ?? '';
    } catch { /* alert might not appear */ }
    await this.dismissNativeAlert('OK');
    return message;
  }

  /** Navigate to the Forgot Password screen. */
  async tapForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
  }

  /** Navigate to the Register screen. */
  async tapRegister(): Promise<void> {
    await this.registerLink.click();
  }
}

export const loginScreen = new LoginScreen();
