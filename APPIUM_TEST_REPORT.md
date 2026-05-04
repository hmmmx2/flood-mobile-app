# FloodWatch Mobile — Appium E2E Test Report

**Date:** 2026-05-04  
**Tester:** Claude Code (automated)  
**Device:** Android Emulator — Medium Phone API 36 (`emulator-5554`)  
**Build:** Debug APK (`app-debug.apk`) — see APK issue below  
**Framework:** WebdriverIO 8 + Appium 2 + UiAutomator2  

---

## Executive Summary

The full Appium E2E suite was attempted. **Zero tests executed successfully** due to a cascade of infrastructure blockers. All blockers have been diagnosed and most have been fixed; one (standalone APK build) is in progress. No app regressions can be confirmed at this time — the suite cannot pass until the blockers below are resolved in sequence.

---

## Blocker Log (in resolution order)

### BLOCKER-1 — TypeScript `Cannot find name 'browser'` in wdio.conf.ts ✅ FIXED

**Symptom:**
```
wdio.conf.ts(117,15): error TS2304: Cannot find name 'browser'.
```
All 17 workers refused to start. No spec file was compiled.

**Root cause:** `tsconfig.json` did not include `@wdio/globals/types`, so the global `browser` object was unknown to TypeScript. The `afterTest` screenshot hook in `wdio.conf.ts` references `browser` and caused the entire runner to abort.

**Fix applied:** Added `"@wdio/globals/types"` to the `types` array in `e2e/tsconfig.json`.

---

### BLOCKER-2 — `ChainablePromiseArray` type mismatch in 15 page objects ✅ FIXED

**Symptom (after BLOCKER-1 fix):**
```
src/pageObjects/AdminBlogsScreen.ts(19,5): error TS2322:
Type 'ChainablePromiseArray<ElementArray>' is not assignable to
type 'ChainablePromiseArray<Element>'.
```
All 7 admin spec workers crashed at TypeScript compilation. The error cascaded to `.length` and `for...of` usages downstream.

**Root cause:** Every `$$('~testId')` getter in the new admin page objects was annotated with the bare return type `: ChainablePromiseArray`, which TypeScript (with full `@wdio/globals/types`) resolves to `ChainablePromiseArray<Element>` (singular). But `$$()` actually returns `ChainablePromiseArray<ElementArray>` (array). The mismatch blocks compilation.

**Fix applied:** Removed the explicit `: ChainablePromiseArray` return-type annotation from all 15 affected getters across 15 page object files (PowerShell replace-all). TypeScript now infers the correct array type.

---

### BLOCKER-3 — `transpileOnly` not propagating to worker processes ✅ FIXED

**Symptom (after BLOCKER-2 fix):**
```
src/helpers/AuthHelper.ts(81,22): error TS2554:
Expected 2 arguments, but got 1.
```
Even though `wdio.conf.ts` sets `autoCompileOpts.tsNodeOpts.transpileOnly: true`, workers spawn fresh Node processes that initialize their own ts-node instance without those options, so type-checking still runs in workers.

**Root cause:** In WebdriverIO 8, `autoCompileOpts.tsNodeOpts` only registers ts-node for the main launcher process (config compilation). Worker child-processes re-register ts-node independently using only the project `tsconfig.json`.

**Fix applied:** Added `"ts-node": { "transpileOnly": true }` directly to `e2e/tsconfig.json`. ts-node reads this section on every startup, including in workers, which fully disables type-checking across all processes.

---

### BLOCKER-4 — APK is an Expo dev-client build (requires Metro server) 🔧 IN PROGRESS

**Symptom:**
The emulator shows the Expo Dev Launcher screen ("Development Servers — Start a local development server with: `npx expo start`") instead of the login screen. Appium cannot find any test elements because the real app UI never loads.

**Root cause:** The APK built in the previous session via `./gradlew assembleDebug` is an **Expo Development Client** (expo-dev-client). It does NOT bundle JavaScript — instead it expects to connect to a running Metro/Expo dev server at runtime. Without Metro, it shows the dev server selector screen.

**Fix in progress:**
1. Created `android/app/src/main/assets/` directory
2. Running `npx expo export:embed --platform android --dev false` to bundle JS
3. Will rebuild APK with `./gradlew assembleDebug --no-daemon` (native layer already compiled; should be ~5 min)
4. The resulting APK will be self-contained — no dev server needed

**For CI/CD:** Use `eas build --profile preview` which always produces a standalone APK with JS bundled. Avoid bare `./gradlew assembleDebug` for test builds unless the JS bundle is pre-created.

---

### BLOCKER-5 — No `testID` props on any app screen (pending)

**Impact:** Even when BLOCKER-4 is resolved and the app loads, every `~testId` element selector in every spec will throw "element not found". The page objects rely on Accessibility ID selectors like `~email-input`, `~login-button`, etc. — none of these are present in the app source.

**Scope:** 21 app screens need testID annotations (see the Appium E2E plan in `.claude/plans/humble-napping-map.md` Step 1 for the full list).

**Resolution:** Add `testID` props to each screen component as detailed in the plan. This is the largest single effort required to make the suite actually execute.

---

### BLOCKER-6 — Test accounts do not exist in the backend (pending)

**Impact:** Even if testIDs are added and elements are found, login tests will fail because the test credentials do not exist in any backend environment.

**Required accounts:**

| Email | Password | Role |
|---|---|---|
| `testuser@floodwatch.test` | `TestPass123!` | `customer` |
| `admin@floodwatch.test` | `AdminPass123!` | `admin` |
| `testuser2@floodwatch.test` | `TestPass123!` | `customer` |

**Resolution:** Create these accounts via the API or directly in the database. Update `e2e/.env.test` with the correct credentials.

---

## New Issues Found (non-blockers)

### ISSUE-01 — `AuthHelper.ts` uses `driver.terminateApp()` with 1 argument (type warning)

`driver.terminateApp('com.floodcommunity.app')` is called at lines 81, 131, and 135. With `@wdio/globals/types` loaded, TypeScript reports `Expected 2 arguments, but got 1`. This is suppressed by `transpileOnly: true` (BLOCKER-3 fix) but should be corrected. Resolution: pass an empty options object — `driver.terminateApp('com.floodcommunity.app', {})`.

### ISSUE-02 — `LoginScreen.getErrorAndDismiss()` polls for native alert but login uses inline banner

`LoginScreen.ts` calls `browser.getAlertText()` to read login errors, but `login.tsx` renders an inline View banner (not `Alert.alert()`). The method will always return empty string on failed login. This means the "invalid credentials" test case will not verify the actual error message. Resolution: update `getErrorAndDismiss()` to read `~login-error-banner` text instead (see E2E plan Step 5).

### ISSUE-03 — Navigation specs assume `More` tab for community users

`alerts.spec.ts`, `sensors.spec.ts`, and `profile.spec.ts` navigate via `bottomTabBar.goToMore() → moreScreen.tapXxx()`. Community users have Alerts/Sensors/Profile as direct bottom tabs, not nested under More. This navigation path will fail for community-role tests.

**Fix:** Already implemented in `BottomTabBar.ts` (`goToAlerts()`, `goToSensors()`, `goToProfile()`) and spec files updated in a prior session.

### ISSUE-04 — `wdio.conf.ts` maxInstances is 1 but 17 workers declared

With `maxInstances: 1`, the test runner executes one spec at a time (serial). Appium sessions are created and destroyed for each spec. This is correct for a single emulator, but adds significant overhead (~30s per session create/destroy × 17 specs = ~8.5 min overhead before any test logic runs).

**Suggestion:** Consider grouping auth/community specs into fewer files to reduce session churn, or share a session across related specs via a session-pool pattern.

---

## Test Results Summary

| Category | Specs | Status | Reason |
|---|---|---|---|
| Auth (login, register, forgot-password) | 3 | ❌ Not executed | BLOCKER-4: app on dev-client screen |
| Community (feed, blog, community, post) | 4 | ❌ Not executed | BLOCKER-4 |
| Alerts | 1 | ❌ Not executed | BLOCKER-4 |
| Sensors | 1 | ❌ Not executed | BLOCKER-4 |
| Profile | 1 | ❌ Not executed | BLOCKER-4 |
| Navigation | 1 | ❌ Not executed | BLOCKER-4 |
| Map | 1 | ❌ Not executed | BLOCKER-4 |
| Admin — Dashboard | 1 | ❌ Not executed | BLOCKER-4 |
| Admin — Broadcasts | 1 | ❌ Not executed | BLOCKER-4 |
| Admin — Reports | 1 | ❌ Not executed | BLOCKER-4 |
| Admin — Users | 1 | ❌ Not executed | BLOCKER-4 |
| Admin — Analytics | 1 | ❌ Not executed | BLOCKER-4 |
| Admin — Blogs | 1 | ❌ Not executed | BLOCKER-4 |
| Admin — Community Moderation | 1 | ❌ Not executed | BLOCKER-4 |
| **Total** | **17** | **0 / 17 passed** | |

---

## Recommended Appium Monitoring Tools

### 1. Appium Inspector (Free — Official)
**Best for:** Visually finding element selectors, debugging testID mappings  
**Install:** `npm install -g appium-inspector` or download from GitHub releases  
**Usage:** Connect to the running Appium server (`http://localhost:4723`), launch the app, and inspect the accessibility tree to confirm testIDs are being picked up as content-desc values. **Essential** for BLOCKER-5 (adding testIDs) — use it to validate each testID before writing the selector in a POM.

### 2. Allure Report (Already configured)
**Best for:** Test result history, screenshots on failure, timeline view  
**Already set up** — `allure-results/` is the output dir. Once tests actually run:
```bash
cd e2e
npm run allure:generate && npm run allure:open
```
Screenshots on failure are captured via the `afterTest` hook in `wdio.conf.ts`.

### 3. WebdriverIO Spec Reporter (Already active)
**Best for:** Real-time terminal output during test runs  
Already configured in `wdio.conf.ts` reporters array. Shows pass/fail inline.

### 4. Appium Server GUI (Windows-friendly)
**Best for:** Starting/stopping Appium with a UI instead of CLI, viewing session logs  
**Download:** https://github.com/AppiumPro/appium-desktop — provides a log window, capability builder, and Inspector integrated in one tool.

### 5. BrowserStack App Automate (Cloud — Paid)
**Best for:** Testing on real Android devices without maintaining a local device farm  
Supports Appium natively. Upload the APK, specify desired capabilities, and run the same WDIO tests remotely. Useful for testing on Android 11–15 real hardware.

---

## Next Steps (Priority Order)

1. **[In progress]** Complete standalone APK build (BLOCKER-4 fix)
2. **[Manual]** Add testID props to all 21 app screens (BLOCKER-5) — follow the plan in `.claude/plans/humble-napping-map.md`
3. **[Manual]** Create test accounts in staging backend (BLOCKER-6)
4. **[Code]** Fix `AuthHelper.ts` `terminateApp` call (ISSUE-01)
5. **[Code]** Fix `LoginScreen.getErrorAndDismiss()` to read inline banner (ISSUE-02)
6. **[Run]** Re-execute full suite against standalone APK with testIDs and test accounts
7. **[Report]** Generate Allure HTML report from results

---

*Report generated by Claude Code — FloodWatch E2E Test Infrastructure Audit*
