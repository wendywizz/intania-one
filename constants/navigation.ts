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
 * deeper into content. Slides up from the bottom instead of in from the
 * side, and rebinds the back-swipe gesture to that same vertical axis so a
 * swipe-down dismiss matches the direction the sheet arrived from (the
 * default horizontal swipe would otherwise fight the animation). Web keeps
 * the shared no-animation behavior from `STACK_SCREEN_OPTIONS` for the same
 * reason documented there.
 */
export const ACTION_SHEET_SCREEN_OPTIONS = {
  ...STACK_SCREEN_OPTIONS,
  ...(Platform.OS === 'web'
    ? {}
    : ({
        animation: 'slide_from_bottom',
        gestureDirection: 'vertical',
      } as const)),
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
