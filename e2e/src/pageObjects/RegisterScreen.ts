/**
 * RegisterScreen POM
 *
 * Corresponding app screen: app/(auth)/register.tsx
 *
 * Required testIDs:
 *   first-name-input    → firstName TextInput
 *   last-name-input     → lastName TextInput
 *   email-input         → email TextInput
 *   password-input      → password TextInput
 *   confirm-password-input → confirmPassword TextInput
 *   register-button     → Submit / "Create Account" button
 *   back-to-login-link  → "Already have an account? Sign in" link
 *   inline-error        → Inline validation error Text (if present)
 */
import { BasePage } from './BasePage';

export class RegisterScreen extends BasePage {
  get firstNameInput(): ChainablePromiseElement {
    return this.el('first-name-input');
  }

  get lastNameInput(): ChainablePromiseElement {
    return this.el('last-name-input');
  }

  get emailInput(): ChainablePromiseElement {
    return this.el('email-input');
  }

  get passwordInput(): ChainablePromiseElement {
    return this.el('password-input');
  }

  get confirmPasswordInput(): ChainablePromiseElement {
    return this.el('confirm-password-input');
  }

  get registerButton(): ChainablePromiseElement {
    return this.el('register-button');
  }

  get backToLoginLink(): ChainablePromiseElement {
    return this.el('back-to-login-link');
  }

  /** Inline error Text component (shown below invalid fields). */
  get inlineError(): ChainablePromiseElement {
    return this.el('inline-error');
  }

  async waitForScreen(): Promise<void> {
    await this.firstNameInput.waitForDisplayed({ timeout: this.DEFAULT_TIMEOUT });
  }

  /**
   * Fill all registration fields and tap the submit button.
   */
  async register(opts: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }): Promise<void> {
    await this.waitForScreen();
    await this.firstNameInput.setValue(opts.firstName);
    await this.lastNameInput.setValue(opts.lastName);
    await this.emailInput.setValue(opts.email);
    await this.passwordInput.setValue(opts.password);
    await this.confirmPasswordInput.setValue(opts.confirmPassword);
    await this.hideKeyboard();
    await this.registerButton.click();
  }

  /** Return the inline error text if present, empty string otherwise. */
  async getInlineErrorText(): Promise<string> {
    try {
      await this.inlineError.waitForDisplayed({ timeout: 5000 });
      return await this.inlineError.getText();
    } catch {
      return '';
    }
  }

  /** Read + dismiss a native alert error. */
  async getAlertAndDismiss(): Promise<string> {
    let message = '';
    try {
      await browser.waitUntil(
        async () => {
          try { return !!(await browser.getAlertText()); } catch { return false; }
        },
        { timeout: 10000, interval: 500 },
      );
      message = (await browser.getAlertText()) ?? '';
    } catch { /* no alert */ }
    await this.dismissNativeAlert('OK');
    return message;
  }

  async tapBackToLogin(): Promise<void> {
    await this.backToLoginLink.click();
  }
}

export const registerScreen = new RegisterScreen();
