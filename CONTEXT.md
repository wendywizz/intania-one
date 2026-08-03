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
- The app have staff management system that show as modules such as absence, Forget Timestamp, Meeting, Repair Computer, Executive Calendar and Person Search systems
- The app can connect to exist API Services by modules for CRUD data
- The app build like as Mobile Application for iOS and Android
- The app can send push notification
- The app should have beautiful UI and good for UX

# Project Functionals

- News: The app feeds news from the website “http://www.eng.psu.ac.th”. This function is public everyone can see the news  No authenticate require
- Authenticate System: Before the user can access all the menus in this app. Users should sign in to use the services. This project uses the OpenID system for Auth. The OpenID system is the service that University provided 
- Menus or Modules: This app contains systems shown as a menu on the home screen. The menu will show after the user signs in success. The menus contains absence Menu, Forget Timestamp Menu, Meeting Menu, Repair Computer Menu, Person Search Menu and other system in the future
- Notification: The users in the organization will contact each other in this app such as sending information to do something. Some requests will tick the notification on the phone to related user. The notification system is based on Firebase Cloud Messaging.

# Project Struction

This project use React Native and Expo for development


# Module Description

The module meaning the application that work with user to send/recieve request and response. Now there are six module follow by:

- Abent Module: 
    # Module Context
    Send request for absence to Approver that can allow or deny request
    # User Group
    - General User: The user that inform for request
    - Approver: The leader of general user that can approve request    
    # Functional
    - User can send new absence inform
    - User can follow inform status
    - User can see the history of absence
    - Approver can allow or deny request
    
- Forget Timestamp:
    # Module Context
    Send request for forget timestamp to Approver to ensure that user are comming to work or forget stamp out when finish work
    # User Group
    - General User: The user that inform for request
    - Approver: The leader of general user that can approve reuqets
    # Functional
    - User can see what the date and time that user forgot to stamp in/out in work day
    - User can see history of forgot timestamp
    - Approver can allow or deny request

- Repair Computer:
    # Module Context
    This module is one of service of company when Computer or something else broke. User can send request to a worker (ช่าง) to repair the item
    # User Group
    - General User: The informer that send request
    - Foreman: Categorize job type and assign to the worker
    - Worker: The staff who repairs the item
    # Functional
    - General User can send inform to ask for help
    - General User can follow status of job
    - General User can see inform history
    - Foreman can accept or reject job    
    - Foreman can assign job to the worker
    - Foreman can see all job history
    - Foreman can approve supply request that the worker asks
    - Worker can accept or reject job that foreman assigned
    - Worker can record and report of repair detail
    - Worker can see work history
    - Worker can ask supply request from the foreman

- Meeting:
    # Module Context
    This module is show the list of meeting of logged in user. The data receive from the application through from API Service
    # Functional
    - User can see today meeting
    - User can see upcoming meeting
    - User can see meeting history

- Executive Calendar:
    # Module Context
    Show the events of executive that fetch from Google Calendar
    # Functional
    - User can see events by date
    - User can select calendar that want to see the detail

- Person Search:
    # Module Context
    Show the staff in the company by search with keyword
    # Functional
    User can put keyword to search and show data on the screen


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

# Sending requests
- The app does not send requests and receive responses directly from the real application but there is a gateway service called “scooba-service” as a medium. But the auth system and news rss feed call to service directly
- Every submit action that sends a POST, PUT, or DELETE request must show a YES/NO confirmation modal before sending the request.
- After the user confirms, show the loading/prefix animation and wait 1000ms before sending the request.
- After receiving the response data, wait 1500ms before continuing to the next operation.

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