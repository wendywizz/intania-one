# Project Note

- Before editing this project, read this CONTEXT.md and AGENT.md first.
- Before adding an external package, prefer existing project dependencies first.
- If a new package is needed, use an official React Native or Expo package when available.
- If there is no official package, use a well-maintained package that is among the most popular choices in the React Native Community.
- For Expo native modules, use npx expo install <package> so the installed version matches the project SDK.

# Project Context

This app is about the staff management system for the Faculty of Engineer, Prince of Songkhla University. The app contains many systems such as absence System, Timestamp System, Inform request for the services etc. 

The organization has many services already created from Web Application base. Therefore, All systems in this app are just UI that communicate through API Service that created each of the systems.

But the client does not link with the API Service directly. There is one project called “scooba-service”. The scooba-service is the gateway the client will send all request to this project and pass request to the real API Service of system

# Requirement

- The app can show news that feeds from University website
- The app must have an authentication system to identify user to access systems because this is a private application but some feature such as news feed is public
- The app have staff management system that show as modules — currently Timestamp (Forget Timestamp), Absence, Meeting, Repair Computer, Notice Repair, Booking Room, Examinar, Executive Calendar, Person Search and My Profile. See "Module Description" below for what each one does.
- The app can connect to exist API Services by modules for CRUD data
- The app build like as Mobile Application for iOS and Android
- The app can send push notification
- The app should have beautiful UI and good for UX

# Project Functionals

- News: The app feeds news from the website “http://www.eng.psu.ac.th”. This function is public everyone can see the news  No authenticate require. The RSS is parsed by scooba-service and read as `GET /api/news`, not fetched from the feed host by the app.
- Authenticate System: Before the user can access all the menus in this app. Users should sign in to use the services. This project uses the OpenID system for Auth. The OpenID system is the service that University provided. After sign-in the app also asks the gateway whether this person is Faculty of Engineering staff (`GET /api/staff-info`), which decides whether the module grid appears at all.
- Menus or Modules: This app contains systems shown as a menu on the home screen. The menu will show after the user signs in success. The menus are Timestamp, Absence, Meeting, Repair Computer, Notice Repair, Booking Room, Examinar, Executive Calendar and Person Search, plus My Profile from the account area — and other systems in the future
- Notification: The users in the organization will contact each other in this app such as sending information to do something. Some requests will tick the notification on the phone to related user. The notification system is based on Firebase Cloud Messaging.

# Project Struction

This project use React Native and Expo for development


# App-level features (not modules)

These are not menu items — they wrap or feed every module.

- **Sign-in (OpenID)** — `services/authService.ts` + `context/AuthContext.tsx`. PKCE
  against `psusso.psu.ac.th`, the only upstream the app calls **without** going through
  the gateway. Native uses `com.ecs.intaniaSB://oauth/callback` and an external browser
  (falling back to `app/openid-webview.tsx` when no custom-tab browser is installed);
  web uses `http://localhost:8081/oauth/callback` and proxies token/userinfo through
  Metro to dodge CORS (`METRO_PROXY_ENDPOINTS`). The id it returns is `UNI_STAFF_ID`.
- **Eligibility check** — after sign-in, `services/staffInfoService.ts` asks
  `GET /api/staff-info` whether this person is Faculty of Engineering staff, which
  decides whether they get the module grid or the news-only home. The verdict is cached
  per staff id; a network failure keeps the cached answer and otherwise fails **open**,
  so a gateway outage never reads as "you have no permission".
- **Connection gate** — `components/connection-gate.tsx`, outermost in `app/_layout.tsx`.
  See *Sending and receiving requests* below.
- **App lock** — `components/biometric-gate.tsx` + `app/create-password.tsx` +
  `services/biometricService.ts` / `appPasswordService.ts`. Face/fingerprint on open,
  a 6-digit app passcode as the fallback, re-locks after 60s in the background.
- **Notifications** — `app/notification.tsx` + `services/notificationService.ts`
  (history, unread badge, read/clear, foreground handler) and
  `services/deviceService.ts`, which registers this device's Expo push token against
  the signed-in `UNI_STAFF_ID` via `POST /api/push/register-device`.
- **Home summary** — `app/index.tsx` shows the news band, the module grid, and a row of
  "what needs me today" counters fed by `GET /api/active-summary`
  (`services/activeSummaryService.ts`): one call covering repair-computer, absence,
  meeting and timestamp, each section carrying its own `success` flag so one failing
  module does not blank the row. The upcoming exam duty is a separate
  `listExamTasks()` call.
- **Settings** — `app/settings.tsx`: theme (light/dark/system), notification toggle,
  app-lock options, sign-out.
- **News** — `app/news.tsx` + `app/news-detail.tsx`, `services/newsService.ts`. Public,
  shown before sign-in. It reads `GET /api/news` on the gateway (the gateway parses the
  eng.psu.ac.th RSS); the app no longer fetches the feed host directly.

# Module Description

A module is one menu tile on the home screen: a screen group under `app/<module>/`, a
service under `services/<module>Service.ts`, and one module namespace on the gateway.
There are eleven, listed in the order they appear on the home grid.

- Timestamp (Forget Timestamp) — `app/timestamp/`, `services/timestampService.ts`, gateway `/api/timestamp`:
    # Module Context
    The work-attendance record: what was scanned, what was missed, and requests to have
    a missed scan counted. Sent to the Approver, who allows or denies.
    # User Group
    - General User: the person whose scans these are, and who files the request
    - Approver: their leader, who decides it
    # Functional
    - User can see a month calendar of their own scan-in/scan-out days, colour-coded
      present / incomplete / absent / leave / holiday (`(tabs)/calendar.tsx`)
    - User can see which days they forgot to stamp in or out and file a request for one
      (`(tabs)/forgot-timestamp.tsx`, `record-detail.tsx`)
    - User can withdraw a request that has not been decided yet
    - User can see the history of their own requests and each decision
      (`(tabs)/history.tsx`, `history-detail.tsx`, `detail.tsx`)
    - Approver can see requests waiting on them (`(tabs)/approve.tsx`), open the full
      detail (`approve-detail.tsx`) and allow or deny with a reason (`approve-reason.tsx`)

- Absence — `app/absence/`, `services/absenceService.ts`, gateway `/api/absence`:
    # Module Context
    Send a leave request to the Approver, who allows or denies it.
    # User Group
    - General User: the person requesting leave
    - Approver: their leader, who decides it
    # Functional
    - User can file a request in each leave type the personnel system supports — sick
      (`sick.tsx`), personal/business (`business.tsx`), maternity (`birth.tsx`),
      vacation (`relax.tsx`); the gateway also carries hajj / ordination / military
    - User can follow the status of a request in flight (`(tabs)/pending.tsx`)
    - User can see their own filed requests (`(tabs)/my-leave.tsx`) and the full history
      (`(tabs)/history.tsx`, `detail.tsx`)
    - User can see their remaining and used entitlement per type (`(tabs)/stats.tsx`)
    - Approver can see requests waiting on them (`(tabs)/approve-leave.tsx`), open the
      detail (`approve-detail.tsx`) and allow or deny with a reason (`approve-reason.tsx`)
    # Notes
    - Forms load holidays from the timestamp calendar endpoint (`hooks/use-holidays.ts`);
      the day count skips weekends and holidays.

- Meeting — `app/meeting/`, `services/meetingService.ts`, gateway `/api/meeting`:
    # Module Context
    Read-only list of the meetings the signed-in person is a member of.
    # Functional
    - User can see today's meetings (`(tabs)/index.tsx`)
    - User can see upcoming meetings (`(tabs)/incoming.tsx`)
    - User can see past meetings (`(tabs)/history.tsx`)
    - User can open one meeting: time, place, members and its agenda topics (`detail.tsx`)
    - User can open the meeting document as a PDF (`components/pdf-viewer-modal.tsx` →
      `/api/meeting/pdf`)
    - The gateway's cron pushes a reminder an hour before a meeting starts; the app only
      receives it

- Repair Computer — `app/repair-computer/`, `services/repairComputerService.ts`, gateway `/api/repair-computer`:
    # Module Context
    Report a broken computer or device and have a worker (ช่าง) repair it. Has its own
    `CONTEXT.md` — read it before editing this module.
    # User Group
    Role comes from `GET /api/repair-computer/privilege` → `tech | foreman | user`
    (`RepairComputerRoleContext`). The tab layout shows **one** role's tab set — the
    person's highest privilege — and redirects to that role's default route; there is no
    role switcher here (unlike notice-repair). Note the role *value* is `tech` while
    every file, route and service name says `worker`; do not translate one into the
    other.
    - General User: the informer who reports the fault
    - Foreman: categorises the job and assigns it to a worker
    - Worker (ช่าง): the staff member who does the repair
    # Functional
    - General User can file a report (`(tabs)/(user)/inform.tsx`), follow the job
      (`current-job.tsx`, `queue.tsx`), see history (`history.tsx`), open the detail
      (`user-job-detail.tsx`), and edit or cancel the request **only while the foreman
      has not picked it up** (`edit-job.tsx`)
    - Foreman can accept or reject a new job (`(foreman)/foreman-new-job.tsx`,
      `reject-job.tsx`), set its repair type and assign a worker (`manage-job.tsx`,
      `assign-job.tsx`, `select-foreman.tsx`), see all history
      (`foreman-history.tsx`, `job-history-detail.tsx`) and decide a worker's supply
      request from the job detail (`foreman-job-detail.tsx` → `supply-approval.tsx`)
    - Worker can accept or reject an assigned job (`(worker)/worker-new-job.tsx`,
      `worker-reject-job.tsx`), record problem + solution and close it
      (`operate-job.tsx`, `worker-job-detail.tsx`), see their own history
      (`worker-history.tsx`), ask the foreman for supplies (`request-supply.tsx`) and
      read the verdict (`supply-result.tsx`)
    - Any role can export a job sheet as PDF (`/api/repair-computer/export/pdf`)
    # Notes
    - The job lifecycle and its status ids are the module's own `CONTEXT.md` — read that
      before touching any screen or endpoint here.

- Notice Repair (สาธารณูปการ) — `app/notice-repair/`, `services/noticeRepairService.ts`, gateway `/api/notice-repair` + `/api/repair/*`:
    # Module Context
    Building and facilities repair — the same shape as Repair Computer but for a
    different upstream system, a longer approval chain and five roles.
    # User Group
    Roles come from `GET /api/role/check` and are switched in `NoticeRepairRoleContext`
    (`constants/types.ts`: informer / approve / administration / header / technician).
    - Informer: reports the fault
    - Approver (หัวหน้าสาธารณูปการ): allows or denies the request
    - Administration: receives the accepted job, edits and routes it
    - Header (หัวหน้าหมวด): estimates the work, notes it, assigns and reviews it
    - Technician (ช่าง): carries out the repair
    # Functional
    - Informer can file a request (`(informer)/inform.tsx`), follow the current ones
      (`informer-current.tsx`), see finished ones (`informer-history.tsx`), and
      acknowledge a "cannot repair" verdict (`not-agree.tsx`)
    - Approver can see requests waiting on them (`(approver)/approve-pending.tsx`) and
      everything they have decided (`approve-all.tsx`), and approve or cancel
    - Administration can see pending receipts (`(admin)/admin-pending-receipt.tsx`),
      jobs in progress (`admin-in-progress.tsx`), finished ones (`admin-done.tsx`),
      accept/reject (`(admin)/admin-reject.tsx`), edit a job (`(admin)/edit.tsx`) and
      handle the department supply response (`admin-supply.tsx`)
    - Header can see new jobs (`(header)/header-pending.tsx`), estimate the work
      (`header-assessment.tsx`, `header-estimate-detail.tsx`), track what is being
      repaired (`header-repair-list.tsx`), review finished work (`header-review.tsx`)
      and record a note or a "cannot repair"
    - Technician can see assigned jobs (`(technician)/tech-assigned.tsx`), the ones in
      progress (`tech-in-progress.tsx`) and the ones done (`tech-done.tsx`)
    - Supplies: raise a requisition for a job and add its material lines
      (`requisition.tsx`, `add-material.tsx`), and read the materials already recorded
      on a job (`supply-list.tsx`)
    # Notes
    - Notifications for this module are raised by the notice-repair **website**, not by
      the gateway. Do not add gateway-side notifications without removing the website's.

- Booking Room — `app/booking-room/`, `services/bookingRoomService.ts`, gateway `/api/booking-room`:
    # Module Context
    Reserve a meeting or teaching room. Three booking shapes, because a term booking
    asks a different question from a single-date one.
    # Functional
    - User can see the week timetable of any room (`(tabs)/schedule.tsx`), drawn on the
      grid geometry the server sends so it matches the website
    - User can see their own live bookings (`(tabs)/index.tsx`) and finished ones
      (`(tabs)/completed.tsx`), open one with all its slots (`booking-detail.tsx`,
      `booking-slots.tsx`)
    - User can cancel a whole booking, or one date out of it (a past date is refused
      upstream)
    - User can book: one-off (`general-booking.tsx`), every week of a term
      (`term-booking.tsx`) or every chosen weekday across a date range
      (`period-booking.tsx`); `select-booking.tsx` picks which
    - Each form loads its own options, checks the date, then lists only rooms actually
      free for that pattern before submitting
    # Notes
    - This module authenticates upstream with an API key on the gateway, not HMAC.

- Examinar (ผู้คุมสอบ) — `app/examinar/` (menu entry `app/examiner.tsx`), `services/examinarService.ts`, gateway `/api/examinar`:
    # Module Context
    The exam-invigilation duties assigned to the signed-in person.
    # Functional
    - User can list their invigilation duties for a year / term / exam period
      (`index.tsx`)
    - User can open one duty: subject, date, time, room and co-invigilators
      (`detail.tsx`)
    - The home summary surfaces the next upcoming duty

- Executive Calendar — `app/calendar.tsx`, `services/executiveCalendarService.ts`, gateway `/api/exec-calendars` + the calendar proxy:
    # Module Context
    The executives' schedule, read from Google Calendar.
    # Functional
    - User can pick which executive's calendar to look at, from a `SelectSheet` fed by
      `GET /api/exec-calendars` (a Strapi content type on the gateway, so which
      calendars exist is edited in the admin panel, not in the app)
    - User can see a month calendar with event days marked, tap a day and read that
      day's events as `EventTimelineItem` rows — the same row the meeting lists use, so
      an event looks identical wherever it appears
    # Notes
    - This module has **no** development/production mode: Google Calendar has no dev
      copy. Which calendars are visible is decided by the gateway's own database.

- Person Search — `app/person-search.tsx`, `services/personService.ts`, gateway `/api/person`:
    # Module Context
    Find a member of staff by keyword. Read-only, and reads *other* people.
    # Functional
    - User can type a keyword and see matching staff with their photo, position,
      department, phone and email
    - Photos come through `/api/person/photo/:staffId` on the gateway

- My Profile — `app/my-profile/` (`index.tsx` + `edit-field.tsx`), `services/myProfileService.ts`, gateway `/api/my-profile`:
    # Module Context
    The signed-in person's own record. Distinct from Person Search, which only reads
    other people: this one writes.
    # Functional
    - User can see their own name, position, department, phone and email
    - User can edit their work phone and email, one field at a time
    - User can replace their profile photo from the camera or the photo library
    # Notes
    - **All three calls use `/api/my-profile/*`, including the read** — `GET /api/my-profile`,
      `PUT /api/my-profile/update-info`, `POST /api/my-profile/upload-photo`. The gateway
      resolves the read through Person Search on its side, so it is the same lookup; the
      point of owning the path is that the gateway gates a module by its path prefix.
      Reading through `/api/person/search` would leave this screen loading normally after
      somebody switched the module off, and fail only on save.
    - Switched off ⇒ the read comes back 503 `ModuleDisabled`, `myProfileService` marks it,
      and the screen renders `ErrorState`, which shows the "closed on purpose" wording
      rather than a fault. Same path every other module takes.
    - Writes never go straight to PSU — the HMAC signature and the photo host's API key
      live on the gateway and must not ship in the bundle.
    - `staff_id` on all three is `UNI_STAFF_ID` (`useAuth().user.staffId`).
    - The photo is re-encoded to JPEG and sent as base64; the gateway rebuilds the
      multipart request the photo host wants.


# Build Environment

Each of the environments will use some variable, key, uri callback and setting are different. I will describe you. The app running on three environment follwing by:

- Web browser: Running on Expo that come together with React Native. 
- Emulator
- Real Device

Web browser and emulator alway use for testing only but real device use for testing too but you should simulate for real 

About OpenID system have two domains for auth callback 
- com.ecs.intaniaSB://oauth/callback: Use for emulator and Real Device
- http://localhost:8081/oauth/callback: Use for Expo Web Browser

The key of OpenID use different key I will put the detail in .env file of "intania-staff-buddy" project

About Push Notification the app can receive notification every environment such as Expo Web browser, Emulator and Real Device

# Staff identity — two different IDs

Every staff member has two ids, both columns of the same row in `CENTRAL.STAFF_INFO`:

- **`UNI_STAFF_ID`** — the auth id returned by OpenID. **This is the one the app uses**,
  the one scooba-service speaks, and the one push notifications are addressed to (the
  `device` table keys `owner` on it). Anything the app sends as `staff_id` is this.
- **`STAFF_ID`** — an internal PK the web backends join on. The app should never see or
  send it; if a screen ends up holding one, something upstream returned the wrong field.

Watch for API payloads that carry both — the repair-computer job detail returns
`staffId` / `worker` / `foreman` (internal) alongside `staff_uni_id` / `worker_uni_id` /
`foreman_uni_id`. Use the `*_uni_id` fields. Both are numeric strings, so a mix-up is
invisible: it just addresses a stranger, or nobody.

Where a screen must forward the requester's identity for a notification (absence and
timestamp approvals do, because Phoenix's encoded ids contain no staff id), it forwards
`request_staff_id` — again the `UNI_STAFF_ID`.

See `scooba-service/CONTEXT.md` for the server-side rules and the per-site conversion
helpers.

# Sending and receiving requests

## Who the app is allowed to talk to

- Every module request goes to **scooba-service**, never to a PSU web application. The
  app knows one host: `API_BASE_URL` in `constants/endpoints.ts`
  (`EXPO_PUBLIC_MODE` → dev gateway or `https://saas.eng.psu.ac.th`). Which upstream
  system and database a module reaches behind it is the **gateway's** decision — the app
  deliberately has no per-module dev/prod table, because a table baked into a shipped
  build could not be changed without a rebuild.
- The only direct calls are **OpenID** (`psusso.psu.ac.th` — discovery, token, userinfo;
  proxied through Metro on web to dodge CORS) and the **photo host**
  (`PHOTO_BASE_URL`, read-only `<Image src>`). News is **not** direct any more: it comes
  from `GET /api/news` on the gateway.
- Never hardcode a URL in a screen. Add it to `ENDPOINTS` in `constants/endpoints.ts`
  and reach it from a `services/*Service.ts`.

## The layers

`screen → services/<module>Service.ts → services/api.ts → fetch`

A screen never calls `fetch` and never parses an envelope. It calls a typed service
function, gets back plain data or a thrown `Error` whose `message` is already the Thai
text to show.

## What `services/api.ts` does for every call

- `fetchWithTimeout(url, init)` — the single network entry point. It waits
  `API_DELAY_MS` (500ms) first, aborts after **10s**, and turns the abort into
  `MESSAGE_CANNOT_CONNECT_TO_SERVER`.
- `withApiToken()` attaches `Authorization: Bearer <EXPO_PUBLIC_SCOOBA_API_KEY>`, but
  **only** when the URL starts with `API_BASE_URL`, and only when the caller has not set
  its own `Authorization` (that exemption is what lets the OpenID calls carry a user
  token instead). So the gateway token can never leak to SSO, the feed host or anywhere
  else.
- `requestJson<T>()` — sets `Content-Type: application/json`, reads the body as text,
  and throws `MESSAGE_SERVER_ERROR` on a non-OK or empty response. One exception: a
  **503 with `error.name === "ModuleDisabled"`** is re-thrown carrying the
  `MODULE_DISABLED` marker so the UI can show "this module is switched off" instead of
  a fault — check it with `isModuleDisabled(error)` / `moduleDisabledMessage(error)`.

## The response envelope

Everything from the gateway is `{ data, message, success | process_type, total_count }`.
Use the helper that matches the shape rather than digging into the JSON:

| helper | returns | for |
|---|---|---|
| `listRequest<T>(url)` | `{ data: T[], totalCount, message }` | list endpoints |
| `rowRequest<T>(url)` | `T` | one record |
| `mutationRequest<T>(url, 'POST'\|'PUT'\|'DELETE', body)` | `{ data?, message }` | writes |

All three run `ensureSuccess()`, which treats `success: true` or
`process_type: success/successed/ok` as success and otherwise throws the server's own
`message` (falling back to `MESSAGE_PROCESS_FAILED`). Query strings are built with
`createApiUrl(path, query)` — empty, `null` and `undefined` values are dropped, so a
missing filter is never sent as `?x=undefined`.

## Identity on the wire

Anything the app sends as `staff_id` (or `request_staff_id`) is the **`UNI_STAFF_ID`**
from `useAuth().user.staffId`. See *Staff identity* above — the wrong id fails silently.

## Two things that bypass the fetch wrapper on purpose

PDFs (`/api/meeting/pdf`, `/api/repair-computer/export/pdf`) are opened by a WebView /
`downloadAsync()` / `window.open()`, which navigate to the URL and cannot carry the
`Authorization` header. Those two paths are exempted from the token check on the
gateway; do not "fix" this by adding a header the viewer will not send.

## Startup connection check

`components/connection-gate.tsx` (`ConnectionGate`, outermost in `app/_layout.tsx`)
pings `GET /api/health` and renders **nothing below itself** — not the app lock, not the
navigator — until it answers. So no screen fires requests at a gateway we haven't
reached, and nobody is asked for a face or passcode to arrive at a "cannot connect"
notice. The probe requires the gateway's own JSON body
(`data.status === 'ok' && data.service === 'scooba-service'`), not just a 200 — the
production host answers 200 with a placeholder for unknown paths — and it uses a shorter
6s timeout than the 10s data calls, because it runs before anything is on screen.

Both outcomes are the **same screen with different content** (loader ↔ `ErrorState` +
retry). Do not turn the failure into its own route: mounting the navigator in order to
redirect flashes the home screen for a frame on the way there.

## Receiving pushes

The app does not poll for notifications. `services/deviceService.ts` registers this
device's Expo push token against the signed-in `UNI_STAFF_ID`
(`POST /api/push/register-device`, keyed by `EXPO_PUBLIC_DEVICE_REGISTER_API_KEY`), and
re-registers when the token rotates. Delivery is Firebase Cloud Messaging via Expo. The
app switches on `data.type` to deep-link; the wording is decided entirely on the gateway
(`src/api/push/utils/events.js`) — clients send **event keys**, never text.

## Write flow (UX contract for every POST/PUT/DELETE)

1. Show a YES/NO confirmation modal (`components/ui/confirm-dialog.tsx`) before sending.
2. After the user confirms, show the loading overlay and wait **1000ms** before sending.
3. After the response arrives, wait **1500ms** before continuing to the next operation.
4. Report the outcome with the global toast (`useToast()`), not `Alert`.

# Theming & Colors
- All colors — font/text color, background color, border color, icon color, everything — must come from the color variables in `constants/theme.ts`. Never hardcode hex values (e.g. `#ffffff`, `#000`) in components or screens.
- Consume the palette via `useColors()` (inline) or `useThemedStyles((c) => …)` (StyleSheet). Reference semantic roles (`c.surface`, `c.text`, `c.primary`, `c.border`, `c.textMuted`, `c.success`/`c.danger`/`c.warning`/`c.info`, `c.amethyst`/`c.carrot`, …) so screens flip correctly between light and dark.
- The brand primary is `#B33939`. If a needed color is missing, add it to the `AppColors` type + `LightColors`/`DarkColors` in `constants/theme.ts` (and mirror it in `DESIGN.md`) — do not invent a one-off hex in the component.
- The legacy indigo palette (`ColorPalette` / `SemanticColors` / `useDesignSystem`) has been removed; do not reintroduce it.

# Shared UI Components

Prefer these shared components over building screen-local equivalents. When a screen needs one of these patterns, import the shared component and configure it via props — do NOT re-implement the card/row/state inline. Only create a new component when none fits; if a piece is genuinely one-off, keep it local to the single screen that uses it (don't duplicate it across screens). When you change a shared component, remember every module using it is affected.

- `components/ui/list-card.tsx` → `ListCard`: the app-wide list row — flat card, 40px leading icon circle, title + optional `date` + `children` meta rows, trailing `badge`/chevron. Owns the card chrome and a 12px inter-card gap (`marginBottom`), so list containers must NOT also add `gap`. Used by absence, timestamp, repair-computer and notice-repair lists.
- `components/section-card.tsx` → `SectionCard`: the standard white surface card with an optional `title` + `trailing` header slot. Base container for form/detail sections.
- `components/ui/detail-info-card.tsx` → `DetailInfoCard`: a titled card of stacked "icon + label above value" rows (built on `SectionCard`). Pass `rows: {label, value, icon?}[]`; empty-value rows are dropped and the last visible row has no divider. Used by absence/detail and meeting/detail.
- Full-screen states: `components/error-state.tsx` → `ErrorState`, `components/empty-state.tsx` → `EmptyState`, `components/loading-animate.tsx` → `LoadingAnimate`.
- Headers: `components/screen-header.tsx` → `ScreenHeader` (title-in-navbar) and `components/nav-top-bar.tsx` → `NavTopBar`.
- `components/ui/pill-button.tsx` → `PillButton`: small rounded call-to-action chip. Variants: `soft` (brand-tinted, for white surfaces — e.g. news "อ่านเพิ่มเติม"), `solid` (filled brand), `onAccent` (translucent-white, for colored bands — e.g. the home news "ดูทั้งหมด"). Optional `trailing` icon. Use it for these compact CTAs instead of hand-rolled Pressable pills.
- `components/ui/event-timeline-item.tsx` → `EventTimelineItem`: the app-wide event/meeting row — time in the left gutter (supports a `"start\nend"` range or an all-day label), a dot on a continuous vertical rail, and a card with `title` + optional `location` + `children` meta. Single brand-red accent (`c.primary`). Used by the meeting lists (`MeetingListItem` is a thin adapter) AND the executive calendar's selected-day events, so every event looks identical. When showing events, do NOT build bespoke event rows — use this.
- `constants/calendar-status.ts` → `DAY_STATUS_STYLE` / `DayStatus`: the single source of the calendar day-status background/dot colours (present/incomplete/absent/leave/holiday/none). The timestamp calendar is the visual source of truth; the absence date-picker references the same values (weekends & holidays → `holiday` grey, requested leave span → `leave` blue). Fixed light swatches, identical in light & dark on purpose. Don't hardcode these hex anywhere else.
- `components/ui/month-calendar.tsx` → `MonthCalendar`: the shared calendar chrome — bordered card, primary month-nav header band (deep-red circular prev/next buttons + single-line month label), weekday-name row, and a Sunday-first day grid. Day cells are caller-owned via `renderDay(date)` (each screen styles days differently); optional `footer` (e.g. a legend). Used by `DatePickerField` (absence forms) and the timestamp calendar. The executive calendar (`app/calendar.tsx`) uses the `react-native-calendars` library but shares the same brand tokens (`c.primary`/`c.primaryDeep`/`c.textOnPrimary`) so it stays visually identical.
- Primitives in `components/ui`: `Button`, `TextField`, `ListItem`, `Card`, `ConfirmDialog`, `Sheet`, `IconSymbol`. Also `components/date-picker-field.tsx` → `DatePickerField` (calendar picker with weekend/holiday marking + legend, built on `MonthCalendar`) and `hooks/use-holidays.ts` → `useHolidays`.

# Other
- Bottom tab navigation: Screens inside a bottom tab menu must load data only when their tab is active. Do not load data for inactive tabs.
- If the data display as ListItems that have multiple line. The app should not load all data to display in one time. Just display like pagination when scroll down and get more data
- Each of module or menu should have CONTEXT.md and when begin edit code on the module should read CONTEXT.md of module first