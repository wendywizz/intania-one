import { Platform } from 'react-native';

/**
 * Screen options every Stack in the app shares.
 *
 * `headerShown: false` because screens draw their own NavTopBar; leaving the
 * navigator header on gave a route that forgot to opt out two stacked bars.
 *
 * `animation: 'none'` on web only. A push animates a fresh card in over the old
 * screen, and on web that card is blank for the length of the transition — the
 * whole viewport goes white, tab bar and nav bar included, before the incoming
 * screen paints. It reads as the app reloading on every tap. Native keeps its
 * slide, where the platform holds the previous screen underneath and the
 * transition is doing real work.
 */
export const STACK_SCREEN_OPTIONS = {
  headerShown: false,
  ...(Platform.OS === 'web' ? ({ animation: 'none' } as const) : {}),
};

/**
 * For screens that behave like an action sheet floating over the screen
 * beneath them — edit/select/confirm/reason forms — rather than drilling
 * deeper into content.
 *
 * Used to slide up from the bottom on native, with the back-swipe gesture
 * rebound to that same vertical axis. Dropped in favor of the same push
 * transition every other screen uses, so every navigation in the app now
 * animates the same way — kept as its own export (identical to
 * `STACK_SCREEN_OPTIONS`) so call sites don't need to change if this ever
 * needs to diverge again.
 */
export const ACTION_SHEET_SCREEN_OPTIONS = {
  ...STACK_SCREEN_OPTIONS,
};

/**
 * For screens that exist only to redirect (OAuth/login callbacks) — the user
 * never intended to "navigate" here, so no transition should be visible on
 * any platform.
 */
export const REDIRECT_SCREEN_OPTIONS = {
  ...STACK_SCREEN_OPTIONS,
  animation: 'none' as const,
};
