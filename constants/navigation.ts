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
