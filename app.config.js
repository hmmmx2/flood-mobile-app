export default {
  expo: {
    name: "FloodWatch",
    slug: "flood-mobile-community",
    owner: "alwin523",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "flood-community",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.floodcommunity.app",
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY,
      },
      // Universal links — add your domain in EAS/Apple developer portal
      associatedDomains: ["applinks:community.floodwatch.my"],
    },
    android: {
      package: "com.floodcommunity.app",
      adaptiveIcon: {
        backgroundColor: "#dbeafe",
        foregroundImage: "./assets/images/adaptive-icon.png",
      },
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY,
        },
      },
      // ── Permissions ─────────────────────────────────────────────────────────
      permissions: [
        "android.permission.INTERNET",
        "android.permission.VIBRATE",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
      ],
      // Android App Links for deep linking from shared URLs
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "community.floodwatch.my",
              pathPrefix: "/",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",

      // ── New Architecture + build flags ────────────────────────────────────
      [
        "expo-build-properties",
        {
          android: {
            newArchEnabled: true,
            minSdkVersion: 24,
            compileSdkVersion: 36,
            targetSdkVersion: 35,
          },
          ios: {
            newArchEnabled: true,
            deploymentTarget: "15.1",
          },
        },
      ],

      // ── Push Notifications ────────────────────────────────────────────────
      [
        "expo-notifications",
        {
          color: "#1d4ed8",
        },
      ],

      // ── Splash Screen ─────────────────────────────────────────────────────
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        projectId: "c7ac1981-c882-4125-99ec-c6c6fabc5c8b",
      },
    },
  },
};
