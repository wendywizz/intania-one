# Google Play Console — assets and text (copy/paste)

`<...>` marks something only the owner can supply. Everything else is checked against the
limits Play lists. Description wording is shared with `APP_STORE_METADATA.md`.

## Where each file goes

Play Console → **Grow users → Store presence → Main store listing**

| Field | File | Spec | Status |
| --- | --- | --- | --- |
| App icon | `../assets/images/icon-512.png` | 32-bit PNG, 512 × 512, ≤ 1 MB | ready (new Module One icon) |
| Feature graphic | `google-play/feature-graphic.png` | 1024 × 500, no alpha | ready (new) |
| Phone screenshots | `android/01…05-*.png` | 1080 × 1920, no alpha, 2–8 of them | ready (5) |
| 7" / 10" tablet screenshots | — | optional | skip |

The Android build itself carries its own launcher icon (`android-icon-foreground.png` on
`#B33939`, set in `app.json`); the 512 px file above is only the store-listing icon.

## Text

| Field | Limit | Thai (default language) |
| --- | --- | --- |
| App name | 30 | Intania One |
| Short description | 80 | ลงเวลา ลา แจ้งซ่อม ประชุม จองห้อง สำหรับบุคลากรคณะวิศวะ ม.อ. |
| Full description | 4000 | same text as the App Store description in `APP_STORE_METADATA.md` |

English (add language, optional):

| Field | Limit | Text |
| --- | --- | --- |
| Short description | 80 | Staff app for PSU Engineering: clock in, leave, repairs, meetings, rooms |

## Other Play Console sections

| Section | What to answer |
| --- | --- |
| **App access** (Policy → App content) | "All or some functionality is restricted" → add the test account (username / password). Same account and notes as App Review on the App Store. PSU Passport sign-in means Google's reviewer cannot get in without it. |
| **Privacy policy** | `<privacy policy URL>` — same page as the App Store one |
| **Data safety** | Declare what the app collects: name, email, user ID, precise location (Timestamp), photos/camera and face data (face stamp, repair photos), device or other IDs (push token, install ID), app activity (app interactions), app info and performance (crash logs, diagnostics). Collected, not shared, not sold, not used for ads. Data in transit is encrypted (HTTPS). Full answer sheet in *Data safety answers* below. |
| **Content rating** | Questionnaire → utility/productivity, no objectionable content (expect Everyone / 3+) |
| **Target audience** | 18+ (staff app, not directed at children) |
| **Ads** | No ads |
| **Store settings → Category** | Productivity (alt: Business) |
| **Contact details** | email `<support email>` (required), phone and website optional |
| **Permissions declarations** | Location is used in the foreground only (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`), camera, notifications (`POST_NOTIFICATIONS`). Be ready to explain each in the notes. |

## Data safety answers

Policy → App content → **Data safety**. Overview answers:

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | Yes |
| Is all of the user data collected by your app encrypted in transit? | Yes (HTTPS only) |
| Do you provide a way for users to request that their data is deleted? | Yes — policy §7 (request to the Faculty). Contact address is still `<support email>` / policy placeholder |

Per data type. For every row: **Collected: Yes · Shared: No** (no data goes to a third party;
the diagnostics/usage telemetry is self-hosted on the Faculty server, policy §1.7–1.8) ·
**Processed ephemerally: No** · **Required** (the user cannot turn it off inside the app).

| Data type | Purposes | What it is in this app |
| --- | --- | --- |
| Personal info → Name, Email address | App functionality, Account management | PSU Passport account (§1.1) |
| Personal info → User IDs | App functionality, Analytics | staff ID; also tags the telemetry rows (§1.8) |
| Location → Precise location | App functionality | only at the moment of stamping (§1.3) |
| Photos and videos → Photos | App functionality | repair photos, face stamp photos (§1.2, §2) |
| App activity → App interactions | Analytics, App functionality | screen views (route name), push opened, permission declined, OTA status, which API module was called (§1.8) |
| App info and performance → Crash logs | Analytics, App functionality | JS errors / crashes: name, scrubbed message, short stack (§1.8) |
| App info and performance → Diagnostics | Analytics, App functionality | request and screen-load timing, cold start, network-failure kind, device model, OS and app version (§1.8) |
| Device or other IDs | App functionality, Analytics | push token (§1.6) and the random install ID (`X-Install-Id`, §1.8). Not the advertising ID |

Do **not** tick Fraud prevention / security (keep the purposes above), Developer communications,
Advertising or marketing, or Personalization. Biometric face data is declared under Photos above as in
the existing listing; `APP_REVIEW_REPLY_FACE_DATA.md` has the reviewer wording.
Telemetry starts only from the app version that ships T9–T12: publish policy §1.8 and update this
form **before** uploading that build.

## Before the first upload

- Play needs an **Android App Bundle (.aab)**, signed by Play App Signing. `eas build --platform android --profile production` makes one; `eas submit` is blocked for me, so run it yourself.
- A brand-new personal developer account must run a **closed test with 12 testers for 14 days** before production. An organisation account does not.
- `google-services.json` and the `th.ac.psu.eng.scooba` package name are already set in `app.json`.
