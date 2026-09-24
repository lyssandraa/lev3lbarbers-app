// Extends app.json — Expo's "version" field has no real per-platform
// override (an `android`/`ios` nested "version" key is silently ignored by
// the native build process, it's not a recognized schema field). Android's
// first-ever release needs to read as 1.0, not inherit iOS's 1.1.0 version
// history, so branch on EAS_BUILD_PLATFORM (set automatically during an
// EAS Build) instead. Local dev / iOS builds fall through to app.json's
// version unchanged.
module.exports = ({ config }) => {
  if (process.env.EAS_BUILD_PLATFORM === 'android') {
    return { ...config, version: '1.0.0' };
  }
  return config;
};
