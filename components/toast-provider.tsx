import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import {
  createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode,
} from 'react';
import { Animated, Platform, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ToastType = 'success' | 'error';

type ToastContextValue = {
  /** Show a toast that slides down from the top of the screen. */
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

/** Imperative toast API — call `showToast(message, 'success' | 'error')`. */
export function useToast() {
  return useContext(ToastContext);
}

// react-native-web doesn't support the native animation driver.
const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const VISIBLE_MS = 3000;
// Start below the screen and slide up. The bottom clearance keeps the toast
// above a screen's bottom action button / submit bar.
const HIDDEN_OFFSET = 200;
const ACTION_CLEARANCE = 96;

/**
 * App-wide toast. A single banner slides down from the top of the screen and
 * auto-dismisses; tapping it closes it early. Mounted once at the root so a
 * toast survives navigation (e.g. "saved" shown after going back to a list).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const translateY = useRef(new Animated.Value(HIDDEN_OFFSET)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    Animated.parallel([
      Animated.timing(translateY, { toValue: HIDDEN_OFFSET, duration: 220, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [translateY, opacity]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    if (!message) return;
    setToast({ message, type });
    translateY.setValue(HIDDEN_OFFSET);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 260, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(hide, VISIBLE_MS);
  }, [translateY, opacity, hide]);

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const isSuccess = toast?.type !== 'error';

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[styles.wrap, { paddingBottom: insets.bottom + ACTION_CLEARANCE, transform: [{ translateY }], opacity }]}
        >
          <Pressable
            accessibilityRole="button"
            onPress={hide}
            style={[styles.toast, { backgroundColor: isSuccess ? '#166534' : '#B91C1C' }]}
          >
            <IconSymbol name={isSuccess ? 'checkmark.circle.fill' : 'cross.fill'} size={20} color="#FFFFFF" />
            <ThemedText style={styles.text} lightColor="#FFFFFF" darkColor="#FFFFFF" numberOfLines={3}>
              {toast.message}
            </ThemedText>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 480,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    boxShadow: '0 6px 16px rgba(17, 24, 28, 0.22)',
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});
