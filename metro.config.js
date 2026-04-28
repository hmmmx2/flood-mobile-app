// metro.config.js
// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// ── Enable package.json "exports" field resolution ────────────────────────────
// Required by several modern ESM-first packages (zustand v5, @tanstack/query v5)
config.resolver.unstable_enablePackageExports = true;

// ── SVG as React components (react-native-svg-transformer) ────────────────────
// Uncomment the block below if you add .svg assets imported as components:
//
// const { assetExts, sourceExts } = config.resolver;
// config.transformer = {
//   ...config.transformer,
//   babelTransformerPath: require.resolve('react-native-svg-transformer'),
// };
// config.resolver.assetExts  = assetExts.filter((ext) => ext !== 'svg');
// config.resolver.sourceExts = [...sourceExts, 'svg'];

module.exports = config;
