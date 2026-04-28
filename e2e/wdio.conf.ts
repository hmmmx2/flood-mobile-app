import path from 'path';
import dotenv from 'dotenv';
import type { Options } from '@wdio/types';

// Load local environment overrides (.env.test)
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

/**
 * Resolve APK path: prefer env override, then default build output.
 * Set APK_PATH in .env.test to use a custom path.
 */
const APK_PATH =
  process.env.APK_PATH ??
  path.resolve(
    __dirname,
    '../android/app/build/outputs/apk/release/app-release.apk',
  );

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
      /**
       * Enable these for React Native New Architecture (Hermes bridge).
       * Required for apps built with Expo SDK 50+ / RN 0.73+.
       */
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
      `[WDIO] Starting session on device: ${(capabilities as any)['appium:deviceName']}`,
    );
  },

  afterTest: async function (test, _context, { error, passed }) {
    if (!passed) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = path.resolve(
        __dirname,
        `screenshots/failure_${test.title.replace(/\s+/g, '_')}_${timestamp}.png`,
      );
      try {
        await browser.saveScreenshot(screenshotPath);
        console.log(`[WDIO] Screenshot saved: ${screenshotPath}`);
      } catch (screenshotError) {
        console.warn('[WDIO] Could not save screenshot:', screenshotError);
      }
    }
  },

  afterSession() {
    console.log('[WDIO] Session ended.');
  },
};
