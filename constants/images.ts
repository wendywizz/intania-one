// Bundled image assets shared across screens. Keeping the `require` in one place
// means every avatar falls back to the same artwork — swap the file here and the
// whole app follows.

/** Shown wherever a staff photo is missing or fails to load. */
export const USER_PLACEHOLDER = require('../assets/images/user-placeholder.jpg');

/**
 * The launcher icon, for showing the app's own identity in-app (the biometric
 * lock screen). A 288px copy rather than the 1024px `icon.png` the native build
 * consumes — that one would cost ~730KB of bundle for a 96pt view.
 */
export const APP_ICON = require('../assets/images/app-icon.png');
