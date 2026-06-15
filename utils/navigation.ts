import { router } from 'expo-router';

type PushHref = Parameters<typeof router.push>[0];
type ReplaceHref = Parameters<typeof router.replace>[0];

let locked = false;

// Prevents double-tap navigation from user interactions.
// Programmatic navigation (in effects, API callbacks) should use router directly.
export function acquireNavLock(): boolean {
  if (locked) return false;
  locked = true;
  setTimeout(() => {
    locked = false;
  }, 500);
  return true;
}

export function navPush(href: PushHref): void {
  if (acquireNavLock()) {
    router.push(href);
  }
}

export function navReplace(href: ReplaceHref): void {
  if (acquireNavLock()) {
    router.replace(href);
  }
}

export function navBack(): void {
  if (acquireNavLock()) {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }
}
