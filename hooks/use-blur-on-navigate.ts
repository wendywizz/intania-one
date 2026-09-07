import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Web only: blurs whatever the browser has focused, on every route change.
 *
 * The screen you just navigated away from is what react-navigation-web marks
 * `aria-hidden` a moment later, to keep assistive tech from landing on a
 * screen that is no longer showing. A tapped `<Link>` renders as a real
 * `<a>`, and browsers focus an anchor the instant it is clicked — so without
 * this, the outgoing screen is marked aria-hidden while that `<a>` still
 * holds focus inside it, which is exactly the invalid state the WAI-ARIA spec
 * (and Chrome's own console) warns about: "Blocked aria-hidden on an element
 * because its descendant retained focus."
 *
 * Blurring on every pathname change — not just inside individual `<Link>`s —
 * covers every way a route can change (a Link tap, a card's onPress calling
 * router.push, a back-button press), and does nothing on native, where there
 * is no DOM focus or aria-hidden to fight.
 */
export function useBlurOnNavigate() {
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body) {
      active.blur();
    }
  }, [pathname]);
}
