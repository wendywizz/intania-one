# React Native Conversion

This folder now contains a React Native/TypeScript conversion of the Flutter `lib`
code that was available in the workspace.

## What Was Ported

- App entry point and stack navigation from `main.dart`
- Shared theme colors and domain constants
- OAuth session handling with `react-native-app-auth`
- Async persisted auth state with `@react-native-async-storage/async-storage`
- News RSS loading with `fast-xml-parser`
- Personnel search and photo URLs
- Meeting list API
- Absence request/history API calls
- Repair-computer job list, detail, create, close, cancel, and worker/foreman service calls
- React Native screens for the main Flutter routes
- Mirrored React Native screen files for every original Dart file under
  `screens/**`, including `absent`, `meeting`, and `repair_computer`
  subfolders

## Running It

The workspace only included Flutter's `lib` folder, so native `android` and `ios`
folders were not present to convert. To run this as a full React Native app:

1. Install dependencies:

   ```sh
   npm install
   ```

2. If this folder is your RN project root, generate/add the native platform
   folders using your normal React Native workflow.

3. Start Metro:

   ```sh
   npm start
   ```

4. Run on a target:

   ```sh
   npm run android
   npm run ios
   ```

## Notes

- Some Flutter screens used webview/content wrappers. Those are represented as
  React Native screens and can be wired to the exact production URLs when known.
- The original recursive screen folder has been mirrored under `src/screens/**`.
  Shared workflow logic for the mechanically converted nested screens lives in
  `src/screens/converted/ConvertedScreen.tsx`, while the handwritten primary
  RN screens remain available at the PascalCase filenames.
- File upload and notification/Firebase code were commented or platform-specific
  in the Flutter source. The service boundaries are ready, but native package
  selection and platform setup should be completed in the RN shell.
- The original Dart files were left untouched so the migration can be reviewed
  safely.
