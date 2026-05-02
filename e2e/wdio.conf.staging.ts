import path from 'path';
import dotenv from 'dotenv';
import type { Options } from '@wdio/types';

// Load local environment overrides (.env.test)
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

/**
 * Staging APK is required — must be set via APK_PATH in .env.test or environment.
 *
 * To obtain the APK:
 *   1. Run an EAS staging build: eas build --profile staging --platform android
 *   2. Download the APK from https://expo.dev/accounts/alwin523/projects/flood-mobile-app/builds
 *   3. Set APK_PATH=/path/to/downloaded.apk in e2e/.env.test
 */
const APK_PATH = process.env.APK_PATH;

if (!APK_PATH) {
  console.error(
    '\n[wdio.conf.staging] ERROR: APK_PATH is not set.\n' +
    'Download the staging APK from EAS and set APK_PATH=/path/to/staging.apk in e2e/.env.test\n',
  );
  process.exit(1);
}

export const config: Options.Testrunner = {
  // ── Runner ──────────────────────────────────────────────────────────────────
  runner: 'local',
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      project: path.resolve(__dirname, 'tsconfig.json'),
      transpileOnly: true,
    },
  },

  // ── Specs ───────────────────────────────────────────────────────────────────
  specs: ['./src/specs/**/*.spec.ts'],
  exclude: [],

  // ── Capabilities ────────────────────────────────────────────────────────────
  capabilities: [
    {
      platformName: 'Android',
      'appium:deviceName': process.env.ANDROID_DEVICE ?? 'emulator-5554',
      'appium:platformVersion': process.env.ANDROID_VERSION ?? '14.0',
      'appium:automationName': 'UiAutomator2',
      'appium:appPackage': 'com.floodcommunity.app',
      'appium:appActivity': '.MainActivity',
      'appium:app': APK_PATH,
      'appium:autoGrantPermissions': true,
      'appium:newCommandTimeout': 300,
      'appium:noReset': false,
      'appium:fullReset': false,
      'appium:disableWindowAnimation': true,
      'appium:ignoreUnimportantViews': true,
      'appium:uiautomator2ServerInstallTimeout': 60000,
    },
  ],

  // ── Appium service (auto-starts Appium server) ───────────────────────────────
  services: [
    [
      'appium',
      {
        command: 'appium',
        args: {
          port: 4723,
          relaxedSecurity: true,
          logLevel: 'info',
        },
      },
    ],
  ],

  // ── Test framework ───────────────────────────────────────────────────────────
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 120000,
    retries: 1,
  },

  // ── Reporters ───────────────────────────────────────────────────────────────
  reporters: [
    'spec',
    [
      'allure',
      {
        outputDir: 'allure-results',
        disableWebdriverStepsReporting: true,
        disableWebdriverScreenshotsReporting: false,
        useCucumberStepReporter: false,
      },
    ],
  ],

  // ── Concurrency ─────────────────────────────────────────────────────────────
  maxInstances: 1,

  // ── Timeouts ────────────────────────────────────────────────────────────────
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  // ── Hooks ───────────────────────────────────────────────────────────────────
  beforeSession(_config, capabilities) {
    console.log(
      `[WDIO Staging] Starting session on device: ${(capabilities as any)['appium:deviceName']}`,
    );
    console.log(`[WDIO Staging] APK: ${APK_PATH}`);
  },

  afterTest: async function (test, _context, { passed }) {
    if (!passed) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = path.resolve(
        __dirname,
        `screenshots/failure_${test.title.replace(/\s+/g, '_')}_${timestamp}.png`,
      );
      try {
        await browser.saveScreenshot(screenshotPath);
        console.log(`[WDIO Staging] Screenshot saved: ${screenshotPath}`);
      } catch (screenshotError) {
        console.warn('[WDIO Staging] Could not save screenshot:', screenshotError);
      }
    }
  },

  afterSession() {
    console.log('[WDIO Staging] Session ended.');
  },
};
