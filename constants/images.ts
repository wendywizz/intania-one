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

/**
 * The same mark as APP_ICON, with its red backing colour-keyed out to
 * transparent (see the "update the icon" work in git history for how).
 * BrandMark uses this instead of APP_ICON so the logo can sit bare on the
 * splash's own red — a flat red square from the icon file, ringed in white
 * to hide the seam, was the earlier approach; this drops the ring entirely.
 */
export const APP_ICON_MARK = require('../assets/images/app-icon-mark.png');

/**
 * Wordmark shown in the home header in place of the greeting when nobody is
 * signed in — there is no name to greet, but the header still needs to say what
 * app this is.
 */
export const NAV_LOGO = require('../assets/images/intania-nav-logo.png');

/** The "sign in with PSU Passport" button artwork on the signed-out home screen. */
export const PSU_PASSPORT_BUTTON = require('../assets/images/psu-passport.png');

/** Intrinsic aspect ratio of PSU_PASSPORT_BUTTON (2126×474), so the button can be
 *  sized by width alone without distorting the artwork. */
export const PSU_PASSPORT_BUTTON_ASPECT = 2126 / 474;
