# flood-mobile-app

![Expo](https://img.shields.io/badge/Expo_SDK-51-000020?logo=expo)
![React Native](https://img.shields.io/badge/React_Native-0.74-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Android](https://img.shields.io/badge/Android-supported-green?logo=android)
![iOS](https://img.shields.io/badge/iOS-supported-lightgrey?logo=apple)
![License](https://img.shields.io/badge/license-MIT-green)

**Cross-platform mobile app for FloodWatch — keeping Sarawak residents informed and safe through flood alerts, sensor data, and community engagement.**

## Overview

`flood-mobile-app` is a React Native application built with Expo SDK 51. It provides community users with real-time flood sensor readings on an interactive map, push notification alerts, community posts and groups, a blog reader, safety guides, and personal profile management — all in one app for Android and iOS.

The app connects to `flood-service-community` either directly or through the Kong API Gateway when deployed via Docker. Authentication tokens are stored securely using Expo SecureStore, and push notifications are delivered through the Expo Notifications service.

## Features

- **Sensor map** — interactive map (`react-native-maps`) showing live sensor node locations, status, and water level readings
- **Push notifications** — real-time flood alert delivery via Expo Notifications (FCM/APNs)
- **Community feed** — browse, create, like, and comment on community posts
- **Groups** — join and engage with location-based community groups
- **Blog** — read official articles and safety bulletins from flood authorities
- **Alerts screen** — chronological list of all received flood alerts
- **Safety screen** — emergency procedures, evacuation routes, and safety tips
- **Analytics screen** — sensor trend charts and flood risk summaries
- **User profile** — view and edit profile, manage notification preferences
- **Admin screens** — in-app blog and community moderation for admin users
- **Secure auth** — JWT (access + refresh) stored in Expo SecureStore; automatic token refresh
- **Error boundaries** — graceful error handling throughout the app

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Expo SDK | 51 | Managed React Native workflow |
| React Native | 0.74 | Cross-platform UI |
| TypeScript | 5 | Static typing |
| Expo Router | 3 | File-based navigation |
| Zustand | 4 | Global auth state management |
| React Query (`@tanstack/react-query`) | 5 | Server state, caching, and data fetching |
| `react-native-maps` | — | Native map component |
| Expo Notifications | — | Push notification registration & handling |
| Expo SecureStore | — | Secure JWT token storage |
| EAS Build | — | Cloud APK/IPA builds |

## Architecture

```
flood-mobile-app  (iOS & Android)
        │
        │  Direct connection (local dev)
        ├──────────────────────────────► flood-service-community  (:4001)
        │
        │  Via Kong gateway (Docker stack)
        └──────────────────────────────► Kong (:8080)
                                              ├─► /community → flood-service-community
                                              └─► /crm       → flood-service-crm
```

Push notifications flow: Expo push token → `flood-service-community` → Expo Push Service → device.

## Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **Expo CLI**: `npm install -g expo@latest`
- **EAS CLI** (for builds): `npm install -g eas-cli`
- For Android: Android Studio with an emulator, or a physical device
- For iOS: Xcode 15+ (macOS only), or a physical iPhone/iPad
- `flood-service-community` running and reachable from your device/emulator

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-org/floodwatch.git
cd floodwatch/flood-mobile-app
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set the API URLs for your environment (see [Environment Variables](#environment-variables) below).

### 3. Start the Expo development server

```bash
npx expo start
```

Then press:
- `a` to open an Android emulator
- `i` to open an iOS simulator
- Scan the QR code with the **Expo Go** app on a physical device

> **Physical device on LAN:** Make sure `EXPO_PUBLIC_AUTH_API_URL` points to your PC's LAN IP (e.g. `http://192.168.1.x:4001`), not `localhost`.

### 4. Android emulator shortcut

The Android emulator routes `10.0.2.2` to the host machine:

```bash
EXPO_PUBLIC_AUTH_API_URL=http://10.0.2.2:4001 npx expo start
```

## Environment Variables

Copy `.env.example` to `.env` (or configure as EAS secrets for CI builds):

| Variable | Description | Example |
|---|---|---|
| `EXPO_PUBLIC_AUTH_API_URL` | Base URL for `flood-service-community` | `http://192.168.1.10:4001` |
| `EXPO_PUBLIC_CRM_API_URL` | Base URL for `flood-service-crm` (admin features) | `http://192.168.1.10:4002` |
| `EXPO_PUBLIC_GOOGLE_MAPS_KEY` | Google Maps API key (Android map tiles) | `AIzaSy...` |

**Kong gateway variants (Docker stack):**

```bash
EXPO_PUBLIC_AUTH_API_URL=http://192.168.1.10:8080/community
EXPO_PUBLIC_CRM_API_URL=http://192.168.1.10:8080/crm
```

> **Note:** Variables prefixed `EXPO_PUBLIC_` are bundled into the app binary. Do not put secrets in these variables.

## Building an APK / IPA

FloodWatch uses [EAS Build](https://docs.expo.dev/build/introduction/) for cloud builds.

### Configure EAS

```bash
eas login
eas build:configure
```

### Preview APK (Android, no store signing)

```bash
eas build --platform android --profile preview
```

### Production build

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

### Local Android debug build

```bash
npx expo run:android
```

Refer to `APK_BUILD_GUIDE.md` in this directory for detailed instructions including keystore setup.

## Project Structure

```
flood-mobile-app/
├── app/
│   ├── (app)/                    # Authenticated app screens
│   │   ├── _layout.tsx           # Tab navigator layout
│   │   ├── index.tsx             # Home screen (sensor map)
│   │   ├── alerts.tsx            # Alerts list
│   │   ├── analytics.tsx         # Analytics charts
│   │   ├── blog.tsx              # Blog list
│   │   ├── blog/[id].tsx         # Blog detail
│   │   ├── community.tsx         # Community feed
│   │   ├── g/[slug].tsx          # Group detail
│   │   ├── post/[id].tsx         # Post detail
│   │   ├── map.tsx               # Full-screen sensor map
│   │   ├── safety.tsx            # Safety information
│   │   ├── sensors.tsx           # Sensor node list
│   │   ├── profile.tsx           # User profile
│   │   ├── broadcasts.tsx        # Broadcast alerts
│   │   ├── reports.tsx           # Flood reports
│   │   ├── users.tsx             # Admin: user management
│   │   ├── admin-blogs.tsx       # Admin: blog management
│   │   ├── admin-community.tsx   # Admin: community moderation
│   │   └── more.tsx              # More / settings drawer
│   ├── (auth)/                   # Unauthenticated screens
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── _layout.tsx               # Root layout (auth gate, push setup)
│   ├── index.tsx                 # Entry redirect
│   └── +not-found.tsx            # 404 screen
├── src/
│   ├── api/                      # API client and typed request functions
│   │   ├── client.ts             # Axios instance with token refresh interceptor
│   │   ├── index.ts              # Exported API functions
│   │   └── types.ts              # API response types
│   ├── components/
│   │   ├── ErrorBoundary.tsx     # React error boundary wrapper
│   │   └── ui/                   # Shared UI components
│   │       ├── AlertCard.tsx
│   │       ├── EmptyState.tsx
│   │       ├── NodeCard.tsx
│   │       ├── ScreenHeader.tsx
│   │       ├── StatCard.tsx
│   │       └── StatusBadge.tsx
│   ├── hooks/                    # Custom React hooks
│   ├── store/
│   │   └── authStore.ts          # Zustand auth state (tokens, user, hydration)
│   ├── theme/                    # Design tokens and admin theme
│   ├── types/
│   │   └── env.d.ts              # Expo public env variable types
│   └── utils/
│       └── push.ts               # Expo push token registration
├── android/                      # Native Android project (EAS / local builds)
├── assets/images/                # App icons and splash screen
├── .env.example                  # Environment variable template
├── .env                          # Local secrets (git-ignored)
├── app.config.js                 # Expo dynamic config
├── eas.json                      # EAS build profiles
├── babel.config.js
├── tsconfig.json
├── APK_BUILD_GUIDE.md            # Detailed APK build instructions
└── package.json
```

## Running Tests

```bash
# Unit tests (Jest)
npm test

# Watch mode
npm run test:watch
```

## Docker

The mobile app is a client-side binary and does not run inside Docker. However, the backend services it depends on can be started with:

```bash
cd ../deploy
cp .env.example .env
docker compose up -d
```

Then point `EXPO_PUBLIC_AUTH_API_URL` to your machine's LAN IP on port 8080 (Kong gateway) or 4001 (direct).

## Contributing

1. Fork the repository and create a feature branch: `git checkout -b feat/your-feature`
2. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org/)
3. Push and open a Pull Request against `main`
4. Ensure `npm test` and `npm run lint` pass before requesting review

## License

This project is licensed under the [MIT License](../LICENSE).

---

Part of the **FloodWatch** flood monitoring system for Sarawak, Malaysia.
