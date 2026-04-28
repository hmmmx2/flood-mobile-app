/**
 * Generates a release keystore for signing production APKs/AABs.
 *
 * Usage:
 *   node scripts/generate-release-keystore.js
 *
 * Outputs:
 *   android/app/release.keystore
 *
 * After running this script:
 *   1. Copy the printed KEYSTORE_PASSWORD and KEY_PASSWORD values.
 *   2. Set them in your .env file (for local builds) or EAS secrets (for cloud builds):
 *        eas secret:create --name RELEASE_KEYSTORE_PASSWORD --value "yourpassword"
 *        eas secret:create --name RELEASE_KEY_PASSWORD      --value "yourpassword"
 *   3. NEVER commit release.keystore or the passwords to Git.
 *
 * NOTE: EAS Cloud builds manage their own keystore automatically when you first
 * build with `--profile production`. This script is only needed for LOCAL release builds.
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs   = require('fs');
const crypto = require('crypto');

const ROOT     = path.join(__dirname, '..');
const KEYSTORE = path.join(ROOT, 'android', 'app', 'release.keystore');

if (fs.existsSync(KEYSTORE)) {
  console.log('[generate-release-keystore] release.keystore already exists at', KEYSTORE);
  console.log('  Delete it first if you want to regenerate.');
  process.exit(0);
}

const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['keytool'], { encoding: 'utf8' });
if (which.status !== 0) {
  console.error('[generate-release-keystore] keytool not found.');
  console.error('  Install a JDK from https://adoptium.net then retry.');
  process.exit(1);
}

// Generate random 20-char passwords
function randPass() {
  return crypto.randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
}

const storePass = randPass();
const keyPass   = randPass();

console.log('\n[generate-release-keystore] Generating release keystore...\n');

try {
  execSync(
    [
      'keytool',
      '-genkeypair',
      '-v',
      '-keystore', `"${KEYSTORE}"`,
      '-alias',    'release',
      '-keyalg',   'RSA',
      '-keysize',  '4096',
      '-validity', '10950',
      '-storepass', storePass,
      '-keypass',   keyPass,
      '-dname',     '"CN=FloodWatch Release,O=Pop Up Advertising And Information Enterprise,L=Kota Kinabalu,ST=Sabah,C=MY"',
    ].join(' '),
    { stdio: 'inherit' }
  );

  console.log('\n✅ release.keystore created at:', KEYSTORE);
  console.log('\n⚠️  SAVE THESE CREDENTIALS — they cannot be recovered:\n');
  console.log(`  KEYSTORE_FILE:     android/app/release.keystore`);
  console.log(`  KEY_ALIAS:         release`);
  console.log(`  KEYSTORE_PASSWORD: ${storePass}`);
  console.log(`  KEY_PASSWORD:      ${keyPass}`);
  console.log('\n  Add them to EAS secrets:');
  console.log(`    eas secret:create --name ANDROID_KEYSTORE_PASSWORD --value "${storePass}"`);
  console.log(`    eas secret:create --name ANDROID_KEY_PASSWORD       --value "${keyPass}"`);
  console.log('\n  Add them to your local .env file for gradlew release builds:');
  console.log(`    ANDROID_KEYSTORE_PASSWORD=${storePass}`);
  console.log(`    ANDROID_KEY_PASSWORD=${keyPass}`);
  console.log('\n  ⚠️  Never commit release.keystore or these passwords to Git!\n');
} catch (err) {
  console.error('[generate-release-keystore] Failed:', err.message);
  process.exit(1);
}
