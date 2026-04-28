/**
 * ProfileScreen POM
 *
 * Corresponding app screen: app/(app)/profile.tsx
 *
 * Required testIDs:
 *   profile-name         → User full name Text
 *   profile-email        → Email Text
 *   profile-bio          → Bio Text / TextInput
 *   profile-avatar       → Avatar image or initials View
 *   edit-profile-button  → "Edit Profile" button
 *   save-profile-button  → "Save" button (edit mode)
 *   logout-button        → "Logout" / "Sign Out" button
 *   profile-first-name-input → First name TextInput (edit mode)
 *   profile-last-name-input  → Last name TextInput (edit mode)
 */
import { BasePage } from './BasePage';

export class ProfileScreen extends BasePage {
  get userName(): ChainablePromiseElement {
    return this.el('profile-name');
  }

  get userEmail(): ChainablePromiseElement {
    return this.el('profile-email');
  }

  get userBio(): ChainablePromiseElement {
    return this.el('profile-bio');
  }

  get logoutButton(): ChainablePromiseElement {
    return this.el('logout-button');
  }

  get editProfileButton(): ChainablePromiseElement {
    return this.el('edit-profile-button');
  }

  get saveProfileButton(): ChainablePromiseElement {
    return this.el('save-profile-button');
  }

  get firstNameInput(): ChainablePromiseElement {
    return this.el('profile-first-name-input');
  }

  get lastNameInput(): ChainablePromiseElement {
    return this.el('profile-last-name-input');
  }

  async waitForScreen(): Promise<void> {
    await this.userName.waitForDisplayed({ timeout: this.DEFAULT_TIMEOUT });
  }

  async getNameText(): Promise<string> {
    return await this.userName.getText();
  }

  async getEmailText(): Promise<string> {
    try {
      return await this.userEmail.getText();
    } catch {
      return '';
    }
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
    // Confirm if a native dialog appears
    try {
      await browser.waitUntil(
        async () => {
          try { return !!(await browser.getAlertText()); } catch { return false; }
        },
        { timeout: 3000, interval: 300 },
      );
      await this.dismissNativeAlert('OK');
    } catch { /* no confirmation dialog */ }
  }

  async editName(firstName: string, lastName: string): Promise<void> {
    await this.editProfileButton.click();
    await this.firstNameInput.waitForDisplayed({ timeout: 8000 });
    await this.firstNameInput.clearValue();
    await this.firstNameInput.setValue(firstName);
    await this.lastNameInput.clearValue();
    await this.lastNameInput.setValue(lastName);
    await this.hideKeyboard();
    await this.saveProfileButton.click();
  }
}

export const profileScreen = new ProfileScreen();
