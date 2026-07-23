import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Root HTML document for the web build only (ignored on native). This is where
// project-wide web tweaks live.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="th">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: NO_FOCUS_OUTLINE_CSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

// react-native-web draws a black browser focus outline on active inputs/controls.
// Remove it app-wide so focusing an input never shows a black border.
const NO_FOCUS_OUTLINE_CSS = `
input, textarea, select, button, [role="button"], [contenteditable] {
  outline: none;
}
*:focus, *:focus-visible {
  outline: none !important;
}
`;
