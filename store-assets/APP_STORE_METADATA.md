# App Store Connect — metadata (copy/paste)

Limits are App Store Connect's. Counts are code points, checked with a script.
`<...>` marks something only the owner can supply — nothing here is invented.

## Thai (primary)

| Field | Limit | Text |
| --- | --- | --- |
| Name | 30 | Intania One |
| Subtitle | 30 (25) | ระบบบุคลากร คณะวิศวะ ม.อ. |
| Promotional Text | 170 (99) | ลงเวลา ลา แจ้งซ่อม ประชุม จองห้อง และดูตารางคุมสอบ ครบในแอปเดียวสำหรับบุคลากรคณะวิศวกรรมศาสตร์ ม.อ. |
| Keywords | 100 (89) | `บุคลากร,ลงเวลา,ลางาน,แจ้งซ่อม,จองห้อง,ประชุม,คุมสอบ,วิศวกรรมศาสตร์,สงขลานครินทร์,ม.อ.,PSU` |
| Support URL | — | `<support URL>` |
| Privacy Policy URL | — | `https://www.eng.psu.ac.th/en-v2024/intania-one-privacy` (Thai: `https://www.eng.psu.ac.th/intania-one-privacy`) |

### Description (Thai)

```
Intania One คือแอปสำหรับบุคลากรคณะวิศวกรรมศาสตร์ มหาวิทยาลัยสงขลานครินทร์ รวมงานบริการภายในคณะไว้ในแอปเดียว ใช้ได้ทั้งบนมือถือและแท็บเล็ต

ลงเวลาและการลา ดูปฏิทินการสแกนเข้า-ออกรายเดือน แจ้งลืมลงเวลา และติดตามผลการอนุมัติได้ในที่เดียว ยื่นใบลาได้ทุกประเภท ระบบนับวันทำการให้อัตโนมัติและข้ามวันหยุดให้เอง พร้อมดูวันลาคงเหลือ

การประชุมและตารางคุมสอบ ดูการประชุมของวันนี้ ที่กำลังจะมาถึง และย้อนหลัง พร้อมเปิดเอกสารวาระ รวมถึงดูเวรและตารางคุมสอบที่จะถึง

แจ้งซ่อมและจองห้อง แจ้งซ่อมคอมพิวเตอร์หรือแจ้งซ่อมทั่วไป แล้วติดตามสถานะตั้งแต่แจ้งเรื่องจนช่างปิดงาน จองห้องและดูตารางการใช้ห้องได้ทันที

ข่าวและการแจ้งเตือน ติดตามข่าวบุคลากรจากเว็บไซต์คณะ ดูปฏิทินผู้บริหาร ค้นหาบุคลากร และรับแจ้งเตือนเมื่อมีงานที่รอคุณดำเนินการ

ปลอดภัยและใช้งานง่าย เข้าสู่ระบบด้วยบัญชี PSU Passport ล็อกแอปด้วย Face ID ลายนิ้วมือ หรือรหัสผ่าน 6 หลัก และรองรับทั้งโหมดสว่างและโหมดมืด

หมายเหตุ: ฟีเจอร์ส่วนใหญ่สำหรับบุคลากรของคณะวิศวกรรมศาสตร์ ต้องเข้าสู่ระบบด้วยบัญชีมหาวิทยาลัย ผู้ที่ไม่ใช่บุคลากรสามารถอ่านข่าวได้
```

### What's New (Thai)

```
ปรับปรุงประสิทธิภาพและความเสถียร แก้ไขข้อบกพร่องเล็กน้อย พร้อมไอคอนแอปใหม่
```

## English (optional second language)

| Field | Limit | Text |
| --- | --- | --- |
| Subtitle | 30 (29) | Staff hub for PSU Engineering |
| Promotional Text | 170 | Clock in, leave, repair, book rooms and meetings, all in one app for PSU Faculty of Engineering staff. |
| Keywords | 100 (83) | `staff,timestamp,leave,repair,booking,meeting,exam,engineering,PSU,Songkla,workplace` |

### Description (English)

```
Intania One is the staff app for the Faculty of Engineering, Prince of Songkla University. It brings the faculty's internal services together in one place, on phone and tablet.

Timestamp and leave: see your monthly scan-in/scan-out calendar, report a missed scan and follow the approval, all in one place. File any type of leave; working days are counted automatically, skipping weekends and holidays, and you can see your remaining entitlement.

Meetings and exam duty: see today's, upcoming and past meetings with the agenda document, plus your upcoming invigilation schedule.

Repairs and room booking: report a computer or general fault and follow it from the moment you file it until the technician closes the job. Book a room and see its schedule right away.

News and notifications: read faculty news from the faculty website, check the executive calendar, search for staff, and get notified when something is waiting on you.

Secure and easy to use: sign in with your PSU Passport, lock the app with Face ID, fingerprint or a 6-digit passcode, and use it in light or dark mode.

Note: most features are for Faculty of Engineering staff and need a university account. Anyone can read the news.
```

### What's New (English)

```
Performance and stability improvements, minor bug fixes, and a new app icon.
```

## App Review Information

Sign-in is PSU Passport only, so the reviewer needs a working account.

| Field | Value |
| --- | --- |
| Sign-in required | Yes |
| Username | `<test account username>` |
| Password | `<test account password>` |
| Contact name / phone / email | `<owner to fill>` |

### Notes for the reviewer

```
Intania One is the staff app for the Faculty of Engineering, Prince of Songkla University. Staff sign in with the university's PSU Passport (OpenID); a demo account is described below.

Camera: used by Timestamp (lecturer stamping) and face verification, and to attach photos to repair requests.
Location: used by Timestamp to confirm the user is within the faculty area when stamping attendance.
Face ID / fingerprint: optional app lock, set up in Settings.
Notifications: reminders and work that is waiting on the user.

FULL FEATURES (demo account): the staff features need a PSU Passport, which the
university issues only to its own staff, so for review please use the demo mode:
1. On the login screen, tap the version text at the bottom
   ("Intania One · v1.1.2") 5 times in a row.
2. A "Demo account" form opens. Username: appreview   Password: <see demoMode.ts>
Everything in demo mode is sample data; nothing is saved or sent to real systems.
Attendance stamping normally requires being inside the faculty campus; in demo
mode the location check is simulated and the face scan always succeeds.
```

## Other required answers

| Where | Answer |
| --- | --- |
| Age Rating | 4+ (no objectionable content) |
| Category | Primary: Productivity (alt: Business) |
| Export compliance | Already `ITSAppUsesNonExemptEncryption: false` in app.json — answers itself |
| Pricing | Free |
| App Privacy → data collected | Contact info (name, email), Precise location, Photos/Camera and face data, User ID, Device ID (push token, install ID), Diagnostics (Crash Data, Performance Data, Other Diagnostic Data), Usage Data (Product Interaction). All linked to the user. Used for App Functionality / Analytics; **not tracking**. Full answer sheet in *App Privacy answers* below. |
| Content Rights | Confirm you hold rights to the news content shown from the faculty site |

## App Privacy answers

App Store Connect → **App Privacy** → *Get Started*. "Do you or your third-party partners
collect data from this app?" → **Yes**. Every type below: **Linked to the user: Yes** ·
**Used for tracking: No** (nothing is combined with other companies' data, nothing goes to a
data broker, no ads). The diagnostics and usage rows come from the Faculty's own telemetry
(scooba-insight, policy §1.8) — no third-party SDK, so there is no "third-party partner" data.

| Category → type | Purposes | What it is in this app |
| --- | --- | --- |
| Contact Info → Name, Email Address | App Functionality | PSU Passport account (policy §1.1) |
| Location → Precise Location | App Functionality | coordinates at the moment of stamping only (§1.3) |
| User Content → Photos or Videos | App Functionality | repair photos, face photos for stamping (§1.2, §2) |
| Identifiers → User ID | App Functionality, Analytics | staff ID (`UNI_STAFF_ID`); also tags the diagnostics and usage rows (§1.8) |
| Identifiers → Device ID | App Functionality, Analytics | push token (§1.6) and the random install ID (`X-Install-Id`, §1.8). Not the IDFA — the app never asks for tracking permission |
| Diagnostics → Crash Data | App Functionality, Analytics | JS errors / crashes: name, scrubbed message, short stack (§1.8) |
| Diagnostics → Performance Data | App Functionality, Analytics | request duration, cold start, screen load time (§1.8) |
| Diagnostics → Other Diagnostic Data | App Functionality, Analytics | device model, OS version, app version/build, update ID, network type, network-failure kind (§1.8) |
| Usage Data → Product Interaction | App Functionality, Analytics | screen views (route name), push opened, permission declined, OTA status, which API module was called (§1.8) |

Do **not** tick: Purchases, Financial Info, Health & Fitness, Contacts, Browsing/Search History,
Sensitive Info, Advertising Data, Other Usage Data. Only Analytics + App Functionality as purposes —
never Third-Party Advertising, Developer's Advertising or Product Personalization.
Diagnostics / usage start being sent only from the app version that ships T9–T12; publish policy
§1.8 and update these answers **before** that version is submitted.

## Check before submitting

- **Info.plist usage strings.** Camera, location, Face ID and photo-library purpose strings must exist
  and be in Thai/English that says *why*; a missing one is a rejection and a crash on access.
- **`NSAllowsArbitraryLoads: true`** in app.json is still unreviewed (see project memory) — Apple asks
  for a justification when it is on. Prefer per-domain exceptions.
- **App icon** is already valid: `assets/images/icon.png`, 1024×1024, RGB, no alpha. It reaches the
  store only through a new native build, not through an EAS Update.
