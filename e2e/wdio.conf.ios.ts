import path from 'path';
import dotenv from 'dotenv';
import type { Options } from '@wdio/types';

dotenv.config({ path: path.resolve(__dirname, '.env.test') });

/**
 * iOS simulator configuration.
 *
 * Prerequisites:
 *  1. macOS machine with Xcode installed
 *  2. Run: `appium driver install xcuitest`
 *  3. Build app: `cd .. && npx expo run:ios --configuration Release`
 *     OR use a pre-built .app bundle from EAS
 *  4. Set IOS_APP_PATH to the .app bundle, or .ipa for real device
 *
 * Differences from Android:
 *  - accessibilityLabel selectors work identically (`~label`)
 *  - Alert.alert() renders as UIAlertController — use `~OK` / `~Cancel` to dismiss
 *  - Keyboard: `browser.hideKeyboard()` is often a no-op; use Return key instead
 *  - ScrollView gestures use different coordinates — test on both platforms
 */

const IOS_APP_PATH =
  process.env.IOS_APP_PATH ??
  path.resolve(__dirname, '../ios/build/Build/Products/Release-iphonesimulator/FloodWatch.app');

export const config: Options.Testrunner = {
  runner: 'local',
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      project: path.resolve(__dirname, 'tsconfig.json'),
      transpileOnly: true,
    },
  },

  specs: ['./src/specs/**/*.spec.ts'],
  exclude: [],

  capabilities: [
    {
      platformName: 'iOS',
      'appium:deviceName': process.env.IOS_DEVICE ?? 'iPhone 15',
      'appium:platformVersion': process.env.IOS_VERSION ?? '17.2',
      'appium:automationName': 'XCUITest',
      'appium:bundleId': 'com.floodcommunity.app',
      'appium:app': IOS_APP_PATH,
      'appium:autoAcceptAlerts': false,
      'appium:autoDismissAlerts': false,
      'appium:newCommandTimeout': 300,
      'appium:noReset': false,
      /**
       * WDA (WebDriverAgent) settings — increase if build is slow on first run.
       */
      'appium:wdaLaunchTimeout': 120000,
      'appium:wdaConnectionTimeout': 120000,
    },
  ],

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

  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 180000,
    retries: 1,
  },

  reporters: [
    'spec',
    [
      'allure',
      {
        outputDir: 'allure-results',
        disableWebdriverStepsReporting: true,
        disableWebdriverScreenshotsReporting: false,
      },
    ],
  ],

  maxInstances: 1,
  connectionRetryTimeout: 180000,
  connectionRetryCount: 3,

  afterTest: async function (test, _context, { passed }) {
    if (!passed) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      try {
        await browser.saveScreenshot(
          path.resolve(
            __dirname,
            `screenshots/ios_failure_${test.title.replace(/\s+/g, '_')}_${timestamp}.png`,
          ),
        );
      } catch (_) { /* ignore */ }
    }
  },
};
