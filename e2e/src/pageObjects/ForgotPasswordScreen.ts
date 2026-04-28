/**
 * ForgotPasswordScreen POM
 *
 * Corresponding app screen: app/(auth)/forgot-password.tsx
 *
 * The forgot-password flow typically has multiple steps:
 *   Step 1: Enter email → request reset code
 *   Step 2: Enter reset code
 *   Step 3: Enter new password + confirm
 *
 * Required testIDs:
 *   forgot-email-input    → Email input (step 1)
 *   forgot-submit-button  → "Send Reset Code" button (step 1)
 *   reset-code-input      → OTP/code input (step 2)
 *   verify-code-button    → "Verify Code" button (step 2)
 *   new-password-input    → New password field (step 3)
 *   confirm-new-password  → Confirm new password (step 3)
 *   update-password-button → "Update Password" button (step 3)
 *   back-to-login-link    → Back navigation link
 */
import { BasePage } from './BasePage';

export class ForgotPasswordScreen extends BasePage {
  // Step 1 – Email submission
  get emailInput(): ChainablePromiseElement {
    return this.el('forgot-email-input');
  }

  get submitButton(): ChainablePromiseElement {
    return this.el('forgot-submit-button');
  }

  // Step 2 – Reset code
  get resetCodeInput(): ChainablePromiseElement {
    return this.el('reset-code-input');
  }

  get verifyCodeButton(): ChainablePromiseElement {
    return this.el('verify-code-button');
  }

  // Step 3 – New password
  get newPasswordInput(): ChainablePromiseElement {
    return this.el('new-password-input');
  }

  get confirmNewPasswordInput(): ChainablePromiseElement {
    return this.el('confirm-new-password');
  }

  get updatePasswordButton(): ChainablePromiseElement {
    return this.el('update-password-button');
  }

  get backToLoginLink(): ChainablePromiseElement {
    return this.el('back-to-login-link');
  }

  async waitForScreen(): Promise<void> {
    await this.emailInput.waitForDisplayed({ timeout: this.DEFAULT_TIMEOUT });
  }

  async submitEmail(email: string): Promise<void> {
    await this.waitForScreen();
    await this.emailInput.setValue(email);
    await this.hideKeyboard();
    await this.submitButton.click();
  }

  async submitResetCode(code: string): Promise<void> {
    await this.resetCodeInput.waitForDisplayed({ timeout: this.DEFAULT_TIMEOUT });
    await this.resetCodeInput.setValue(code);
    await this.hideKeyboard();
    await this.verifyCodeButton.click();
  }

  async submitNewPassword(password: string, confirm: string): Promise<void> {
    await this.newPasswordInput.waitForDisplayed({ timeout: this.DEFAULT_TIMEOUT });
    await this.newPasswordInput.setValue(password);
    await this.confirmNewPasswordInput.setValue(confirm);
    await this.hideKeyboard();
    await this.updatePasswordButton.click();
  }

  async getAlertAndDismiss(): Promise<string> {
    let message = '';
    try {
      await browser.waitUntil(
        async () => { try { return !!(await browser.getAlertText()); } catch { return false; } },
        { timeout: 8000, interval: 500 },
      );
      message = (await browser.getAlertText()) ?? '';
    } catch { /* no alert */ }
    await this.dismissNativeAlert('OK');
    return message;
  }
}

export const forgotPasswordScreen = new ForgotPasswordScreen();
