# Project Context

## Project notes

- Before editing this project, read this CONTEXT.md first.
- Before adding an external package, prefer existing project dependencies first.
- If a new package is needed, use an official React Native or Expo package when available.
- If there is no official package, use a well-maintained package that is among the most popular choices in the React Native community.
- For Expo native modules, use `npx expo install <package>` so the installed version matches the project SDK.

## Project rules

### Authenticate system

- Do not edit code in the authenticate system unless the user explicitly asks to change this rule.

### Sending requests

- Every submit action that sends a `POST`, `PUT`, or `DELETE` request must show a YES/NO confirmation modal before sending the request.
- After the user confirms, show the loading/prefix animation and wait 1000ms before sending the request.
- After receiving the response data, wait 1500ms before continuing to the next operation.

### Bottom tab navigation

- Screens inside a bottom tab menu must load data only when their tab is active. Do not load data for inactive tabs.
