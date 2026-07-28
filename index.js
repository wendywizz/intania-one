// Custom entry point (package.json "main") so the app-wide font scale can patch
// StyleSheet.create *before* expo-router pulls in the first screen — a screen
// that had already built its sheet would keep the unscaled sizes.
import './utils/font-scale';

import 'expo-router/entry';
