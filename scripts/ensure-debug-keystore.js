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

// On EAS, clean any stale android/ directory that is missing gradle-wrapper.jar.
// This happens when the EAS workspace reuses a directory left over from a
// previous failed build (e.g. the old ensure-debug-keystore bug created
// android/app/ via keytool, which made expo prebuild say "reusing /android"
// but skip generating gradle-wrapper.jar). Deleting stale android/ forces
// expo prebuild to regenerate a complete fresh project in the PREBUILD phase.
//
// Safety: when expo prebuild itself runs npm install (after generating android/),
// this postinstall fires again. At that point gradle-wrapper.jar already exists,
// so the guard below correctly skips the deletion.
if (process.env.EAS_BUILD) {
  const androidDir = path.join(ROOT, 'android');
  const gradleJar  = path.join(androidDir, 'gradle', 'wrapper', 'gradle-wrapper.jar');
  if (fs.existsSync(androidDir) && !fs.existsSync(gradleJar)) {
    fs.rmSync(androidDir, { recursive: true, force: true });
    console.log('[ensure-debug-keystore] Deleted stale android/ (gradle-wrapper.jar was missing).');
  }
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
