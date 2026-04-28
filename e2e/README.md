# FloodWatch Mobile — E2E Test Suite

Appium + WebdriverIO + TypeScript end-to-end tests for the FloodWatch Community mobile app (`com.floodcommunity.app`).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Directory Structure](#directory-structure)
4. [Environment Configuration](#environment-configuration)
5. [Running Tests](#running-tests)
6. [Test Coverage](#test-coverage)
7. [Page Object Models](#page-object-models)
8. [Required testID Props — Developer Guide](#required-testid-props--developer-guide)
9. [iOS Setup](#ios-setup)
10. [CI/CD](#cicd)
11. [Reporting](#reporting)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org) |
| Java JDK | 17 | `brew install openjdk@17` / [adoptium.net](https://adoptium.net) |
| Android SDK | API 35 | Via Android Studio or `sdkmanager` |
| Appium | 2.x | `npm install -g appium` |
| UiAutomator2 driver | 3.x | `appium driver install uiautomator2` |
| Android Emulator or Physical Device | API 24+ | AVD Manager |
| FloodWatch APK | release build | See [Building the APK](#building-the-apk) |

### Building the APK

```bash
# From the flood-mobile-app directory:
npm install
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
# APK will be at: android/app/build/outputs/apk/release/app-release.apk
```

---

## Quick Start

```bash
# 1. Install test dependencies
cd flood-mobile-app/e2e
npm install

# 2. Install Appium drivers
appium driver install uiautomator2

# 3. Configure environment
cp .env.test.example .env.test
# Edit .env.test with your test credentials

# 4. Start an Android emulator (or connect a physical device)
emulator -avd Pixel_6_API_35 -no-snapshot-save &
adb wait-for-device

# 5. Start Appium server (or let WebdriverIO start it automatically)
appium --port 4723 &

# 6. Run all tests
npm test

# Run a specific suite
npm run test:auth
npm run test:feed
npm run test:community
```

---

## Directory Structure

```
e2e/
├── package.json              # Standalone test package
├── tsconfig.json             # TypeScript config
├── wdio.conf.ts              # Android WebdriverIO config
├── wdio.conf.ios.ts          # iOS WebdriverIO config
├── .env.test.example         # Environment variable template
├── .github/
│   └── workflows/
│       └── mobile-e2e.yml    # GitHub Actions CI workflow
├── screenshots/              # Auto-saved screenshots on test failure
├── allure-results/           # Raw Allure test result data
├── allure-report/            # Generated HTML report
└── src/
    ├── pageObjects/          # Page Object Model classes
    │   ├── BasePage.ts         # Shared utilities
    │   ├── LoginScreen.ts
    │   ├── RegisterScreen.ts
    │   ├── ForgotPasswordScreen.ts
    │   ├── HomeScreen.ts
    │   ├── CommunityScreen.ts
    │   ├── BlogScreen.ts
    │   ├── BlogDetailScreen.ts
    │   ├── PostDetailScreen.ts
    │   ├── GroupDetailScreen.ts
    │   ├── MapScreen.ts
    │   ├── AlertsScreen.ts
    │   ├── SensorsScreen.ts
    │   ├── ProfileScreen.ts
    │   ├── MoreScreen.ts
    │   └── BottomTabBar.ts
    ├── helpers/
    │   ├── AuthHelper.ts       # Login/logout shortcuts
    │   ├── WaitHelper.ts       # Explicit wait utilities
    │   └── GestureHelper.ts    # Swipe, scroll, long-press
    ├── data/
    │   └── TestData.ts         # Test fixtures and credentials
    └── specs/
        ├── auth/
        │   ├── login.spec.ts
        │   ├── register.spec.ts
        │   └── forgot-password.spec.ts
        ├── feed/
        │   └── home.spec.ts
        ├── community/
        │   └── community.spec.ts
        ├── blog/
        │   └── blog.spec.ts
        ├── sensors/
        │   └── sensors.spec.ts
        ├── alerts/
        │   └── alerts.spec.ts
        ├── navigation/
        │   └── navigation.spec.ts
        └── profile/
            └── profile.spec.ts
```

---

## Environment Configuration

Create `e2e/.env.test` (copy from `.env.test.example`):

```env
E2E_USER_EMAIL=testuser@floodwatch.test
E2E_USER_PASSWORD=TestPass123!
E2E_ADMIN_EMAIL=admin@floodwatch.test
E2E_ADMIN_PASSWORD=AdminPass123!
ANDROID_DEVICE=emulator-5554
ANDROID_VERSION=14.0
```

**Important:** `.env.test` is git-ignored. Never commit real credentials.

### Test Database Requirements

Before running E2E tests, ensure the staging/test backend has:

1. **Regular user account** — matches `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`
2. **Admin account** — matches `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`
3. **At least 1 community group** (for community tests)
4. **At least 3 blog articles** (for blog tests)
5. **At least 1 sensor node** (for sensor/map tests)

---

## Running Tests

```bash
# All tests (Android)
npm test

# All tests (iOS)
npm run test:ios

# Individual suites
npm run test:auth          # Login, Register, Forgot Password
npm run test:feed          # Home feed
npm run test:community     # Community groups
npm run test:blog          # Blog list + detail
npm run test:sensors       # Sensors list + map
npm run test:alerts        # Flood alerts
npm run test:navigation    # Tab nav + back nav + auth guards
npm run test:profile       # Profile + logout

# Run a specific spec file
npx wdio run wdio.conf.ts --spec src/specs/auth/login.spec.ts

# Run tests matching a pattern
npx wdio run wdio.conf.ts --spec "**/auth/**"
```

---

## Test Coverage

| Suite | File | Tests |
|-------|------|-------|
| Login | `auth/login.spec.ts` | Valid login, invalid email, wrong password, empty fields, navigation, session persistence |
| Register | `auth/register.spec.ts` | Full registration, missing field, duplicate email, short password, password mismatch |
| Forgot Password | `auth/forgot-password.spec.ts` | Email submit, invalid email, wrong code, valid code, new password |
| Home / Feed | `feed/home.spec.ts` | Feed loads, post card fields, pagination, pull-to-refresh, like toggle, create post |
| Community | `community/community.spec.ts` | Group list, search/filter, group detail, join/leave, create post in group |
| Blog | `blog/blog.spec.ts` | Blog list, featured section, blog detail, title/content, back navigation |
| Sensors | `sensors/sensors.spec.ts` | Sensor list, names/statuses, critical indicator, search filter |
| Map | `sensors/sensors.spec.ts` | Map loads, map view visible, markers accessible, callout on tap |
| Alerts | `alerts/alerts.spec.ts` | Alert list, severity display, filter by severity, empty state |
| Navigation | `navigation/navigation.spec.ts` | All bottom tabs, back from detail screens, auth guard, deep links |
| Profile | `profile/profile.spec.ts` | Profile display, name matches user, logout flow, session cleared |

---

## Page Object Models

Each POM inherits from `BasePage` which provides:

- `this.el(testId)` — primary selector via `~accessibilityId`
- `this.byText(text)` — Android UiAutomator2 / iOS predicate text selector
- `this.dismissNativeAlert(buttonText)` — closes `Alert.alert()` dialogs
- `this.hideKeyboard()` — dismisses software keyboard
- `this.scrollDown()` / `this.scrollUp()` — viewport swipes

### Selector Strategy (Priority Order)

```
1.  ~testId          → accessibilityLabel / testID (React Native)  ← PREFERRED
2.  android=         → UiAutomator2 expression (Android fallback)
3.  -ios=            → XCUITest predicate / class chain (iOS fallback)
4.  xpath=           → Last resort — fragile, avoid
```

---

## Required testID Props — Developer Guide

The test suite relies on `testID` props to locate elements. Add the following `testID` attributes to the corresponding React Native components.

> **Note:** In React Native, `testID` maps to:
> - **Android:** `content-desc` attribute (queryable as `~testId`)
> - **iOS:** `accessibilityIdentifier` (queryable as `~testId`)

### `app/(auth)/login.tsx`

```tsx
<TextInput testID="email-input" ... />
<TextInput testID="password-input" ... />
<TouchableOpacity testID="login-button" ... />
<TouchableOpacity testID="forgot-password-link" ... />
<TouchableOpacity testID="register-link" ... />
<TouchableOpacity testID="show-password-btn" ... />
```

### `app/(auth)/register.tsx`

```tsx
<TextInput testID="first-name-input" ... />
<TextInput testID="last-name-input" ... />
<TextInput testID="email-input" ... />
<TextInput testID="password-input" ... />
<TextInput testID="confirm-password-input" ... />
<TouchableOpacity testID="register-button" ... />
<TouchableOpacity testID="back-to-login-link" ... />
<Text testID="inline-error" ... />            {/* Validation error */}
```

### `app/(auth)/forgot-password.tsx`

```tsx
<TextInput testID="forgot-email-input" ... />
<TouchableOpacity testID="forgot-submit-button" ... />
<TextInput testID="reset-code-input" ... />
<TouchableOpacity testID="verify-code-button" ... />
<TextInput testID="new-password-input" ... />
<TextInput testID="confirm-new-password" ... />
<TouchableOpacity testID="update-password-button" ... />
```

### `app/(app)/index.tsx` (CustomerFeedScreen)

```tsx
<FlatList testID="feed-list" ... />

{/* Inside PostCard */}
<View testID="post-card" ... />
<Text testID="post-author" ... />
<Text testID="post-timestamp" ... />
<Text testID="post-like-count" ... />
<TouchableOpacity testID="like-button" ... />
<TouchableOpacity testID="comment-button" ... />

{/* Create post bar */}
<TouchableOpacity testID="create-post-bar" ... />

{/* Create post modal */}
<TextInput testID="create-post-title" ... />
<TextInput testID="create-post-body" ... />
<TouchableOpacity testID="create-post-submit" ... />
<TouchableOpacity testID="create-post-close" ... />

{/* Sort tabs */}
<TouchableOpacity testID="sort-new-tab" ... />
<TouchableOpacity testID="sort-top-tab" ... />

{/* Top bar notification bell */}
<TouchableOpacity testID="alerts-button" ... />
```

### `app/(app)/community.tsx`

```tsx
<FlatList testID="community-list" ... />
<View testID="group-card" ... />           {/* Each group card */}
<Text testID="group-card-name" ... />
<TouchableOpacity testID="join-button" ... />
<TouchableOpacity testID="leave-button" ... />
<TextInput testID="group-search-input" ... />
```

### `app/(app)/blog.tsx`

```tsx
<FlatList testID="blog-list" ... />
<View testID="blog-card" ... />
<Text testID="blog-card-title" ... />
<View testID="featured-section" ... />
```

### `app/(app)/blog/[id].tsx`

```tsx
<Text testID="blog-detail-title" ... />
<ScrollView testID="blog-detail-content" ... />
<Text testID="blog-detail-author" ... />
<TouchableOpacity testID="blog-back-button" ... />
```

### `app/(app)/post/[id].tsx`

```tsx
<Text testID="post-detail-title" ... />
<Text testID="post-detail-content" ... />
<Text testID="post-detail-author" ... />
<TouchableOpacity testID="post-like-button" ... />
<Text testID="post-like-count" ... />
<TextInput testID="post-comment-input" ... />
<TouchableOpacity testID="post-comment-submit" ... />
<View testID="comment-item" ... />           {/* Each comment */}
<TouchableOpacity testID="post-back-button" ... />
```

### `app/(app)/g/[slug].tsx`

```tsx
<Text testID="group-name" ... />
<Text testID="group-description" ... />
<FlatList testID="group-posts-list" ... />
<View testID="group-post-card" ... />
<TouchableOpacity testID="group-join-button" ... />
<TouchableOpacity testID="group-leave-button" ... />
<TouchableOpacity testID="group-create-post-btn" ... />
<Text testID="group-member-count" ... />
```

### `app/(app)/map.tsx`

```tsx
<MapView testID="map-view" ... />
<ActivityIndicator testID="map-loading" ... />
{/* Inside each Marker's custom callout: */}
<Text testID="map-callout-title" ... />
<Text testID="map-callout-status" ... />
```

### `app/(app)/alerts.tsx`

```tsx
<FlatList testID="alerts-list" ... />
<View testID="alert-card" ... />
<Text testID="alert-card-severity" ... />
<Text testID="alert-card-location" ... />
<TouchableOpacity testID="severity-filter-all" ... />
<TouchableOpacity testID="severity-filter-critical" ... />
<TouchableOpacity testID="severity-filter-warning" ... />
<TouchableOpacity testID="severity-filter-watch" ... />
<View testID="alerts-empty-state" ... />
```

### `app/(app)/sensors.tsx`

```tsx
<FlatList testID="sensors-list" ... />
<View testID="sensor-card" ... />
<Text testID="sensor-card-name" ... />
<Text testID="sensor-card-status" ... />
<Text testID="sensor-card-reading" ... />
<View testID="critical-indicator" ... />   {/* Only render when status=Critical */}
<TextInput testID="sensor-search-input" ... />
```

### `app/(app)/profile.tsx`

```tsx
<Text testID="profile-name" ... />
<Text testID="profile-email" ... />
<Text testID="profile-bio" ... />
<TouchableOpacity testID="logout-button" ... />
<TouchableOpacity testID="edit-profile-button" ... />
<TouchableOpacity testID="save-profile-button" ... />
<TextInput testID="profile-first-name-input" ... />
<TextInput testID="profile-last-name-input" ... />
```

### `app/(app)/more.tsx`

```tsx
<TouchableOpacity testID="more-profile-item" ... />
<TouchableOpacity testID="more-alerts-item" ... />
<TouchableOpacity testID="more-safety-item" ... />
<TouchableOpacity testID="more-broadcasts-item" ... />
<TouchableOpacity testID="more-sensors-item" ... />
<TouchableOpacity testID="more-logout-item" ... />
<Text testID="more-username" ... />
```

### `app/(app)/_layout.tsx` (Bottom Tab Bar)

```tsx
// In each Tab.Screen, add tabBarAccessibilityLabel and testID via tabBarButton:
<Tabs.Screen
  name="index"
  options={{
    tabBarAccessibilityLabel: 'tab-home',
    tabBarTestID: 'tab-home',
  }}
/>
<Tabs.Screen name="community" options={{ tabBarTestID: 'tab-community' }} />
<Tabs.Screen name="blog"      options={{ tabBarTestID: 'tab-blog' }} />
<Tabs.Screen name="map"       options={{ tabBarTestID: 'tab-map' }} />
<Tabs.Screen name="more"      options={{ tabBarTestID: 'tab-more' }} />
```

---

## iOS Setup

1. macOS with Xcode 15+ required
2. Install the XCUITest driver:
   ```bash
   appium driver install xcuitest
   ```
3. Build the iOS app:
   ```bash
   cd flood-mobile-app
   npx expo run:ios --configuration Release
   ```
4. Set `IOS_APP_PATH` in `.env.test` to the built `.app` bundle path
5. Run:
   ```bash
   npm run test:ios
   ```

**iOS-specific notes:**
- `Alert.alert()` renders as `UIAlertController` — dismissed with `~OK` / `~Cancel`
- Hardware keyboard: use `returnKeyType` and submit key rather than `hideKeyboard()`
- Back gesture: swipe from the left edge (x≈5) to trigger `UINavigationController` pop
- Maps: tap coordinates are relative to the device screen resolution

---

## CI/CD

The GitHub Actions workflow in `.github/workflows/mobile-e2e.yml`:

1. Spins up an Android emulator (API 35, Pixel 6 profile)
2. Installs Appium 2 + UiAutomator2 driver
3. Starts Appium server on port 4723
4. Runs all WebdriverIO tests
5. Generates and uploads an Allure report artifact
6. Uploads failure screenshots on test failure

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `E2E_USER_EMAIL` | Regular test user email |
| `E2E_USER_PASSWORD` | Regular test user password |
| `E2E_ADMIN_EMAIL` | Admin test user email |
| `E2E_ADMIN_PASSWORD` | Admin test user password |
| `STAGING_API_URL` | Community backend URL |
| `STAGING_CRM_URL` | CRM backend URL |

---

## Reporting

### Allure Report

```bash
# After a test run:
npm run allure:generate    # Generate HTML report from results
npm run allure:open        # Open report in browser
```

### Spec Reporter (Console)

The spec reporter prints results to the console during the run:
```
[chrome #0-0] Running: Login Screen
[chrome #0-0]   ✓ should login with valid credentials (3.2s)
[chrome #0-0]   ✓ should show error for invalid email (1.8s)
[chrome #0-0]   ✗ should show "Login failed" for wrong password
```

### Screenshots

Failure screenshots are automatically saved to `e2e/screenshots/` with the pattern:
```
failure_{test_title}_{timestamp}.png
```

---

## Troubleshooting

### "Could not find a connected Android device"

```bash
adb devices           # Verify device is listed
adb kill-server
adb start-server
```

### "App not installed" / "appPackage not found"

1. Verify the APK path in `wdio.conf.ts` or `APK_PATH` env var
2. The APK must be a **debug** or **release** build (not just the JS bundle)
3. Check `appium:appPackage` matches `com.floodcommunity.app` in the built APK

### "Element not found" for `~testId`

The testID has not been added to the component yet. See the [Required testID Props](#required-testid-props--developer-guide) section above and add the appropriate `testID` prop to the component.

### Tests time out on animations

Add `appium:disableWindowAnimation: true` (already in `wdio.conf.ts`). Also ensure developer options → "Animator duration scale" is set to 0 on the emulator.

### Appium fails to start

```bash
# Check if port is already in use
lsof -i :4723    # macOS/Linux
netstat -ano | findstr :4723   # Windows

# Restart Appium
pkill -f appium
appium --port 4723
```

### React Native New Architecture (Hermes)

The app uses Expo SDK 55 with New Architecture enabled. If interactions are unresponsive:
- Ensure `appium-uiautomator2-driver` is ≥ 3.x
- Use `appium:newCommandTimeout: 300` (already configured)
- Avoid `browser.pause()` — use explicit waits instead

### iOS "WebDriverAgent build failed"

```bash
xcodebuild -project WebDriverAgent.xcodeproj -scheme WebDriverAgentRunner \
  -destination 'platform=iOS Simulator,name=iPhone 15' test
```
Check Xcode signing certificates and provisioning profiles.
