# FloodWatch Mobile — APK Build Guide

> **Target audience:** Developer or team member building and distributing the APK.

---

## 1. Prerequisites

| Tool | Minimum version | Install link |
|------|----------------|--------------|
| Node.js | 20 LTS | https://nodejs.org |
| EAS CLI | 16+ | `npm install -g eas-cli` |
| Expo CLI | bundled (no global install needed) | — |
| JDK | 17 (for local Android builds) | https://adoptium.net |
| Android Studio (optional) | Latest | Only needed for local `expo run:android` |

> **EAS Cloud builds** do NOT need Android Studio or a JDK on your machine — everything runs in the cloud.

---

## 2. First-time setup

```bash
# 1. Install dependencies (also auto-generates debug.keystore via postinstall)
npm install

# 2. Copy the env template and fill in values
cp .env.example .env
# Edit .env — change the LAN IP to match your machine (run `ipconfig` on Windows)

# 3. Log in to EAS
eas login
# Use the account: alwin523
```

---

## 3. Build profiles

Three build profiles are defined in `eas.json`:

| Profile | Command | Backend | Output | Use case |
|---------|---------|---------|--------|----------|
| `preview` | `npm run build:preview` | LAN (192.168.0.35) | APK | On-device dev testing on local network |
| `staging` | `npm run build:staging` | Railway (production URLs) | APK | UAT / stakeholder testing |
| `production` | `npm run build:production` | Railway (production URLs) | AAB | Play Store submission |

> **For UAT testing, always use the `staging` profile.**  
> It points to the live Railway backend so testers get real data.

---

## 4. Building a staging APK (UAT)

```bash
# Build an APK pointed at Railway (production backend)
npm run build:staging

# — or — using EAS CLI directly
eas build --profile staging --platform android
```

EAS will:
1. Upload the project (using `.easignore` to skip test files)
2. Run `npm install` in the cloud worker
3. Run the Expo prebuild step
4. Compile with Gradle (compileSdkVersion 35, minSdkVersion 24)
5. Return a download link for the `.apk`

Typical build time: **8–15 minutes** for the first build, **4–8 minutes** with cache.

---

## 5. Environment variables (secrets)

For `staging` / `production` builds the backend URLs are already baked into `eas.json`.

The **Google Maps API key** is already registered as an EAS environment variable for all three environments (`development`, `preview`, `production`). No action needed.

If the key is ever rotated, update all three environments with:

```bash
eas env:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_KEY \
  --value "NEW_KEY" --type string --visibility sensitive \
  --environment development --force
eas env:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_KEY \
  --value "NEW_KEY" --type string --visibility sensitive \
  --environment preview --force
eas env:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_KEY \
  --value "NEW_KEY" --type string --visibility sensitive \
  --environment production --force
```

---

## 6. Distributing the APK for UAT

1. After the EAS build finishes, open the EAS build page:  
   `https://expo.dev/accounts/alwin523/projects/flood-mobile/builds`
2. Download the `.apk` from the build detail page.
3. Share via:
   - **Email** or **Google Drive / OneDrive** — testers download and install
   - **EAS Update internal distribution** — share the Expo Go QR code (easier for quick tests)
4. Testers must enable **"Install from unknown sources"** on Android before installing.

---

## 7. Checklist before submitting to UAT

- [ ] Replace placeholder PNGs in `assets/images/` with real FloodWatch branding
- [ ] Confirm Railway URLs are reachable (backend deployed and healthy)
- [ ] Set `EXPO_PUBLIC_GOOGLE_MAPS_KEY` as an EAS Secret
- [ ] Bump `versionCode` in `android/app/build.gradle` (`versionCode 2`, etc.)
- [ ] Run `npm run typecheck` — zero TypeScript errors
- [ ] Run `npm run lint` — zero ESLint errors
- [ ] Build with `--profile staging` and smoke-test login for both roles

---

## 8. Common build errors and fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `ENOENT: assets/images/icon.png` | Missing icon files | `node scripts/gen-assets.js` |
| `FileNotFoundException: debug.keystore` | Missing keystore for local build | `npm install` (postinstall generates it) |
| `SDK 35 not installed` | Old Android SDK | Open Android Studio → SDK Manager → install API 35 |
| `Command 'eas' not found` | EAS CLI not installed | `npm install -g eas-cli` |
| `401 Unauthorized` from backend | Wrong API URL baked in | Use `staging` profile, not `preview` |
| `Google Maps not rendering` | Missing API key | Set EAS Secret (see §5) |
| `Gradle build failed: Duplicate class` | react-navigation version conflict | `npm dedupe` |
| `Metro: Cannot find module '@/src/...'` | Path alias not resolving | Check `tsconfig.json` and `babel.config.js` match |

---

## 9. OTA updates (post-UAT patch)

For small JS-only patches after UAT, use **EAS Update** (no re-build needed):

```bash
# Install EAS Update
npm install expo-updates

# Publish an OTA update to all staging installs
eas update --branch staging --message "Bug fix: sensor refresh"
```

> Only use OTA for JavaScript changes. Any native module changes require a full rebuild.

---

## 10. File reference

```
flood-mobile-community/
├── app.config.js           ← Expo config (name, slug, plugins, EAS project ID)
├── eas.json                ← Build profiles (development / preview / staging / production)
├── .easignore              ← Files excluded from EAS upload
├── .env                    ← Local dev env (NOT committed)
├── .env.example            ← Template — commit this
├── assets/images/
│   ├── icon.png            ← 1024×1024  App icon (replace with real branding)
│   ├── adaptive-icon.png   ← 1024×1024  Android adaptive icon foreground
│   ├── splash-icon.png     ←  480×480   Splash screen logo
│   └── favicon.png         ←   48×48    Web favicon
├── android/
│   ├── app/build.gradle    ← Package name, signingConfigs, SDK versions
│   └── gradle.properties   ← New arch, Hermes, min/target SDK flags
└── scripts/
    ├── gen-assets.js       ← Generates placeholder PNG assets
    └── ensure-debug-keystore.js  ← Auto-creates debug.keystore on npm install
```
