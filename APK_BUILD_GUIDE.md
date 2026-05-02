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

# 2. Log in to EAS (use account: alwin523)
eas login

# 3. Set the Google Maps API key as an EAS Secret (one-time, all profiles share it)
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_KEY \
  --value "YOUR_GOOGLE_MAPS_API_KEY"
```

> The Maps key is stored encrypted in Expo's cloud and injected at build time.
> Never put it in `eas.json` (committed to git) or `.env` (excluded from EAS uploads).

---

## 3. Build profiles

| Profile | Command | Backend | Output | Use case |
|---------|---------|---------|--------|----------|
| `development` | *(emulator only)* | Localhost `10.0.2.2` | APK + dev client | Android emulator dev |
| `dev-cloud` | `npm run build:dev-cloud` | **Railway** | APK + dev client | **Physical device dev — install this one** |
| `preview` | `npm run build:preview` | Localhost `10.0.2.2` | APK | Local network testing |
| `staging` | `npm run build:staging` | Railway | APK | UAT / stakeholder testing |
| `production` | `npm run build:production` | Railway | AAB | Play Store submission |

> **For on-device development with live Railway backend, use `dev-cloud`.**  
> **For UAT testing, use `staging`.**

---

## 4. Building the dev-cloud APK (recommended for physical device)

```bash
# One-liner to build the Expo Dev Client APK pointed at Railway
npm run build:dev-cloud

# — or — using EAS CLI directly
eas build --profile dev-cloud --platform android
```

This produces an **Expo Dev Client** APK. After installing it on your phone:

1. Open the app — it shows the dev client launcher screen
2. Start Metro on your machine: `npx expo start --dev-client`
3. Scan the QR code **or** enter your machine's LAN IP manually
4. The app loads your JS bundle from Metro; all API calls go to Railway

> **Tip:** If you just want to test the app without Metro (no live reload), use `staging` instead — it's a self-contained build.

---

## 5. Building a staging APK (UAT / testers)

```bash
npm run build:staging
```

EAS will:
1. Upload the project (using `.easignore` to skip unnecessary files)
2. Run `npm install` in the cloud worker
3. Run the Expo prebuild step
4. Compile with Gradle (compileSdkVersion 36, minSdkVersion 24)
5. Return a download link for the `.apk`

Typical build time: **8–15 minutes** for the first build, **4–8 minutes** with cache.

---

## 6. Environment variables

### Which vars go where

| Variable | Set in | Reason |
|---|---|---|
| `EXPO_PUBLIC_*_API_URL` | `eas.json` env block per profile | Not secret; differs per environment |
| `EXPO_PUBLIC_GOOGLE_MAPS_KEY` | EAS Secret | Sensitive; must be restricted in Google Cloud Console |

### Setting the Google Maps key (one-time)

```bash
eas secret:create --scope project \
  --name EXPO_PUBLIC_GOOGLE_MAPS_KEY \
  --value "YOUR_GOOGLE_MAPS_API_KEY"
```

Once set, it is automatically injected into **every** build profile.

### Rotating the Maps key

```bash
eas secret:push --scope project --force \
  --name EXPO_PUBLIC_GOOGLE_MAPS_KEY --value "NEW_KEY"
```

---

## 7. Distributing the APK

1. After the EAS build finishes, open the build page:  
   `https://expo.dev/accounts/alwin523/projects/flood-mobile-app/builds`
2. Download the `.apk` from the build detail page.
3. Share via email, Google Drive, or WhatsApp.
4. Testers must enable **"Install from unknown sources"** on Android before installing.

---

## 8. Checklist before UAT

- [ ] Railway backends deployed and healthy (`/actuator/health/liveness` returns 200)
- [ ] `EXPO_PUBLIC_GOOGLE_MAPS_KEY` set as EAS Secret (`eas secret:list`)
- [ ] Build with `--profile staging` and smoke-test login for both roles
- [ ] Run `npm run typecheck` — zero TypeScript errors
- [ ] Bump `versionCode` in `android/app/build.gradle` if re-submitting

---

## 9. Common build errors and fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot find module 'scripts/ensure-debug-keystore.js'` | Old `.easignore` excluded `scripts/` | Already fixed — `scripts/` is no longer excluded |
| `ENOENT: assets/images/icon.png` | Missing icon files | `node scripts/gen-assets.js` |
| `FileNotFoundException: debug.keystore` | Missing keystore for local build | `npm install` (postinstall generates it) |
| `SDK 35 not installed` | Old Android SDK | Open Android Studio → SDK Manager → install API 35 |
| `Command 'eas' not found` | EAS CLI not installed | `npm install -g eas-cli` |
| `401 Unauthorized` from backend | Wrong API URL baked in | Use `staging` or `dev-cloud`, not `preview` |
| `Google Maps not rendering` | Missing API key | `eas secret:create --name EXPO_PUBLIC_GOOGLE_MAPS_KEY` |
| `Metro: Cannot find module '@/src/...'` | Path alias not resolving | Check `tsconfig.json` and `babel.config.js` match |

---

## 10. OTA updates (post-UAT patch)

For small JS-only patches after UAT, use **EAS Update** (no re-build needed):

```bash
# Publish an OTA update to all staging installs
eas update --branch staging --message "Bug fix: sensor refresh"
```

> Only use OTA for JavaScript changes. Any native module changes require a full rebuild.

---

## 11. File reference

```
flood-mobile-app/
├── app.config.js           ← Expo config (name, slug, plugins, EAS project ID)
├── eas.json                ← Build profiles (dev-cloud / staging / production / …)
├── .easignore              ← Files excluded from EAS upload
├── .env                    ← Local dev env (NOT committed, NOT used by EAS)
├── .env.example            ← Template — committed to git
├── assets/images/
│   ├── icon.png            ← 1024×1024  App icon
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
