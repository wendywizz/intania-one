# Store screenshots

Marketing screenshots for the App Store and Google Play. Everything on them is
**mock data** — no real staff account, no live news feed.

Since 2026-10-12 the device screens are **captures of the app's real web build**
(`capture/`), run in headless Chrome with every network call answered by invented
fixtures, then placed in the phone frame by `screenshots.html`. They are the real
components, fonts, colours and layout; only the data is made up. The older
hand-built HTML replicas are still in `screenshots.html` — open it with `&mock=1`
to get them (the "Data masking" section below describes that mode).

## Real captures (`capture/`)

Nothing reaches a real server: `mock-api.js` replaces `fetch` before the app
loads, and Chrome is started with a host-resolver rule that only resolves
localhost. Fixtures live in `capture/fixtures.js`; the signed-in session is
seeded into localStorage by `capture/capture.mjs`.

    # 1. start the web build (leave running)
    npx expo start --web --port 8081
    # 2. capture the five screens -> capture/raw/*.png (1170 x 2532)
    cd store-assets/capture && node capture.mjs [screen ...]
    # 3. compose + export every store size (loop below)
    # 4. stop Metro afterwards

A new screen = a route + a "wait for this text" entry in `SCREENS` in
`capture.mjs`, plus whatever fixtures its service needs (watch the
`unhandled=[...]` line the script prints — those are requests that got the empty
default). Set `SCHEME=dark` for dark-mode captures. The status bar (9:41, signal,
battery) is drawn by the template; the capture itself has only a 47 px safe-area
gap at the top.

## Data masking (mock mode only)

Every data-bearing string — names, record titles, dates, times, locations — is
written as an `Example …` placeholder and then masked character-by-character to
`x` by `pii()`:

```js
const pii = (t) => t.replace(/[^\s·—–-]/g, 'x');
```

Word breaks and `·` separators survive, so a row keeps the rhythm of real
content without carrying any. Two layers of safety: the source strings are
already fabricated, and the mask runs over them regardless.

App chrome — nav titles, tab labels, buttons, menu labels, section headings,
legends, stat labels and numbers, calendar day numbers, and the schedule's time
rail — is never passed through `pii()`. The stores require screenshots to show
the app in use, so masking the labels that say what each screen does risks review
rejection, and those labels carry no record data anyway.

To show readable sample text instead, make `pii()` return its argument unchanged
and put real wording in the `Example …` slots.

| File | Panel |
| --- | --- |
| `01-home` | หน้าแรก — กิจกรรมที่รอดำเนินการ + เมนู 9 โมดูล |
| `02-timestamp` | การลงเวลา — ปฏิทินรายเดือน + สรุป |
| `03-repair` | แจ้งซ่อมทั่วไป — รายการงานพร้อมสถานะ |
| `04-leave` | การลา — ฟอร์มยื่นใบลา + วันลาคงเหลือ |
| `05-booking` | จองห้อง — ตารางวันนี้ |

## Sizes

| Folder | Pixels | Where it goes |
| --- | --- | --- |
| `ios-6.9/` | 1290 × 2796 | App Store Connect **6.9"** slot (iPhone 16 Pro Max) |
| `ios-6.7/` | 1284 × 2778 | App Store Connect **6.7"** slot (iPhone 14/15 Plus) |
| `ios-dynamic-island-medium/` | 1206 × 2622 | App Store Connect **iPhone with Dynamic Island (medium display)** slot — the required iPhone set |
| `ios-ipad-13/` | 2064 × 2752 | App Store Connect **iPad 13"** slot (needed while `supportsTablet` is true) |
| `android/` | 1080 × 1920 | Google Play phone screenshots |
| `google-play/feature-graphic.png` | 1024 × 500 | Google Play feature graphic (source: `feature-graphic.html`) |

Google Play text, icon and Play Console answers are in `GOOGLE_PLAY_METADATA.md`.

Store text (name, subtitle, description, keywords, review notes) is in
`APP_STORE_METADATA.md`.

App Store Connect validates per slot and rejects anything not matching that
slot's list, so a 6.9" image uploaded into the 6.7" box fails with *"The
dimensions of one or more screenshots are wrong"*. The 6.7" slot also accepts
1242 × 2688; 1284 × 2778 is used here because it is the larger of the two.

Play needs its own set because it rejects the tall iOS ratio — its phone
screenshots must sit between 16:9 and 9:16, and 1290 × 2796 is taller than 9:16.

## Source

`screenshots.html` renders one panel per load, picked by query string:

    screenshots.html?i=<0-4>&w=<width>&h=<height>

The phone is a 390 × 844 logical screen scaled to fit whatever height the
headline leaves. Colours come from `constants/theme.ts`, the list rows mirror
`components/ui/list-card.tsx`, and the text is Sarabun loaded from
`assets/fonts/`, so a design change in the app can be mirrored here by editing
the same values.

## Regenerate

Needs Chrome. From this directory:

```bash
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
BASE="F:/Work/project-sb/intania-one/store-assets"
URL="file:///F:/Work/project-sb/intania-one/store-assets/screenshots.html"
NAMES=(01-home 02-timestamp 03-repair 04-leave 05-booking)

for i in 0 1 2 3 4; do
  n=${NAMES[$i]}
  for spec in "ios-6.9 1290 2796" "ios-6.7 1284 2778" "android 1080 1920"; do
    set -- $spec; dir=$1; W=$2; H=$3
    "$CHROME" --headless=new --disable-gpu --no-first-run \
      --user-data-dir="/tmp/shot-$dir-$i" \
      --hide-scrollbars --force-device-scale-factor=1 \
      --allow-file-access-from-files \
      --window-size=$W,$H --virtual-time-budget=8000 \
      --screenshot="$BASE/$dir/$n.png" "$URL?i=$i&w=$W&h=$H"
  done
done
```

Two things that will silently produce wrong images if changed:

- **`--user-data-dir` must be unique per run.** Reusing one profile makes every
  Chrome after the first attach to the running instance and exit without writing
  a file.
- **Don't remove the repeated `fitPhone()` calls** in the page. Headless takes
  the shot as soon as its virtual clock drains, which can be before a
  `requestAnimationFrame` callback runs; a missed fit leaves the phone at scale 1
  and the panel renders as a tiny device on a mostly empty canvas.

After regenerating, open the PNGs and check the phone is fully inside the canvas.
