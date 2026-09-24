// Extends app.json — Expo's "version" field has no real per-platform
// override (an `android`/`ios` nested "version" key is silently ignored by
// the native build process, it's not a recognized schema field). Android's
// first-ever release needs to read as 1.0, not inherit iOS's 1.1.0 version
// history, so branch on EAS_BUILD_PLATFORM (set automatically during an
// EAS Build) instead. Local dev / iOS builds fall through to app.json's
// version unchanged.
//
// Note: app.json's runtimeVersion is a fixed string ("1.1.0"), not the
// `{ policy: "appVersion" }` this project used before — that policy
// derives the runtime version from this same conditionally-branching
// `version`, and EAS Build computes runtimeVersion twice (once locally
// before upload, once on the remote build worker where
// EAS_BUILD_PLATFORM is actually set) and hard-fails if they disagree.
// A fixed value sidesteps that entirely and keeps both platforms in the
// same OTA-update compatibility group regardless of their marketing
// version — runtime version is about native-code compatibility, not the
// version number shown in the app stores. Bump it manually (both here
// and via this comment) whenever a build actually changes native code
// in a way that would make an OTA update incompatible with older builds.
module.exports = ({ config }) => {
  if (process.env.EAS_BUILD_PLATFORM === 'android') {
    return { ...config, version: '1.0.0' };
  }
  return config;
};
