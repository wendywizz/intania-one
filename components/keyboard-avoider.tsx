import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";

/**
 * Keeps a form screen usable while the keyboard is up. Wrap the scrollable form
 * body AND its action bar (e.g. FloatingActionBar) in it, below the top bar:
 * on iOS the whole block is lifted, so the submit button sits right above the
 * keyboard instead of behind it. Android resizes the window itself.
 *
 * The scroll inside should set `keyboardShouldPersistTaps="handled"` (a tap on
 * empty space closes the keyboard) and `keyboardDismissMode` (dragging does) -
 * a multiline field's return key only adds a line, so without them nothing
 * closes the keyboard at all.
 */
export function KeyboardAvoider({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

/** `keyboardDismissMode` for a form's scroll: follow the finger on iOS. */
export const FORM_KEYBOARD_DISMISS_MODE = Platform.OS === "ios" ? "interactive" : "on-drag";

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
