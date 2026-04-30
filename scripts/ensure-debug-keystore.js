/**
 * Ensures android/app/debug.keystore exists before any local build.
 * Called automatically via "postinstall" in package.json.
 *
 * EAS Cloud builds manage their own keystore — this script is a no-op there.
 * Locally, without the debug keystore, `expo run:android` / `gradlew assembleDebug`
 * will fail with "FileNotFoundException: debug.keystore".
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

const ROOT     = path.join(__dirname, '..');
const KEYSTORE = path.join(ROOT, 'android', 'app', 'debug.keystore');

// On EAS, the build server manages credentials. More importantly, running
// keytool here creates android/app/ which causes expo prebuild to see an
// existing android/ directory and say "reusing" instead of generating a
// complete fresh project (with gradle-wrapper.jar). Exit early on EAS.
if (process.env.EAS_BUILD) {
  process.exit(0);
}

if (fs.existsSync(KEYSTORE)) {
  // Already exists — nothing to do
  process.exit(0);
}

// keytool ships with every JDK; check it is available
const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['keytool'], { encoding: 'utf8' });
if (which.status !== 0) {
  console.warn('[ensure-debug-keystore] keytool not found — skipping keystore generation.');
  console.warn('  Install a JDK (https://adoptium.net) then re-run npm install.');
  process.exit(0);
}

try {
  execSync(
    [
      'keytool',
      '-genkeypair',
      '-v',
      '-keystore', `"${KEYSTORE}"`,
      '-alias',    'androiddebugkey',
      '-keyalg',   'RSA',
      '-keysize',  '2048',
      '-validity', '10000',
      '-storepass', 'android',
      '-keypass',   'android',
      '-dname',     '"CN=Android Debug,O=Android,C=US"',
    ].join(' '),
    { stdio: 'inherit' }
  );
  console.log('[ensure-debug-keystore] debug.keystore created at', KEYSTORE);
} catch {
  console.warn('[ensure-debug-keystore] Failed to generate keystore — manual step may be required.');
}
