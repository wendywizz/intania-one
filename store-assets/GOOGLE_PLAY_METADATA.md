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
| **Data safety** | Declare what the app collects: name, email, user ID, precise location (Timestamp), photos/camera and face data (face stamp, repair photos), device ID (push token). Collected for app functionality; not sold, not used for ads. Data in transit is encrypted (HTTPS). |
| **Content rating** | Questionnaire → utility/productivity, no objectionable content (expect Everyone / 3+) |
| **Target audience** | 18+ (staff app, not directed at children) |
| **Ads** | No ads |
| **Store settings → Category** | Productivity (alt: Business) |
| **Contact details** | email `<support email>` (required), phone and website optional |
| **Permissions declarations** | Location is used in the foreground only (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`), camera, notifications (`POST_NOTIFICATIONS`). Be ready to explain each in the notes. |

## Before the first upload

- Play needs an **Android App Bundle (.aab)**, signed by Play App Signing. `eas build --platform android --profile production` makes one; `eas submit` is blocked for me, so run it yourself.
- A brand-new personal developer account must run a **closed test with 12 testers for 14 days** before production. An organisation account does not.
- `google-services.json` and the `th.ac.psu.eng.scooba` package name are already set in `app.json`.
