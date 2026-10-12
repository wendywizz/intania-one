// Drives the app's real web build in headless Chrome with every network call
// mocked (mock-api.js + fixtures.js) and saves one PNG per screen.
//
//   node capture.mjs [screen ...]        (default: every screen)
//
// Needs `npx expo start --web --port 8081` running. Output: ./raw/<screen>.png,
// 1170 x 2532 (a 390 x 844 viewport at 3x) with a 47/34 px safe area applied so
// the app lays out as it does under an iPhone's notch and home indicator.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.APP_URL || 'http://localhost:8081';
const OUT = join(here, 'raw');
mkdirSync(OUT, { recursive: true });

const fixtures = readFileSync(join(here, 'fixtures.js'), 'utf8');
const mock = readFileSync(join(here, 'mock-api.js'), 'utf8');

// name → where to go and what text proves the screen has finished loading.
const SCREENS = {
  '01-home': { path: '/', wait: 'กิจกรรมที่รอดำเนินการ' },
  '02-timestamp': { path: '/timestamp/calendar', wait: 'ปฏิทิน' },
  '03-repair': { path: '/notice-repair/informer-current', wait: 'ไฟฟ้า' },
  '04-leave': { path: '/absence/stats', wait: 'วันลา' },
  '05-booking': { path: '/booking-room/schedule', wait: 'ENG 101' },
};

const seed = `
  try {
    localStorage.setItem('AUTH_USER', JSON.stringify({ staffId: '900001', userId: '900001', name: 'สมชาย ใจดี', email: 'somchai.j@example.com' }));
    localStorage.setItem('LOGGED_IN', 'true');
    localStorage.setItem('staffEligibility:900001', 'true');
    localStorage.setItem('staffStampRole:900001', 'staff');
  } catch {}
`;

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(SCREENS);

const chrome = await launch();
const { send, evaluate, sleep } = chrome;
try {
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: process.env.SCHEME || 'light' }] });
  try {
    await send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom: 34, left: 0, right: 0 } });
  } catch (e) { console.warn('safe-area override unavailable:', e.message); }
  await send('Page.addScriptToEvaluateOnNewDocument', { source: seed + fixtures + mock });

  for (const name of names) {
    const s = SCREENS[name];
    if (!s) { console.warn('unknown screen', name); continue; }
    await send('Page.navigate', { url: BASE + s.path });
    let ready = false;
    for (let i = 0; i < 120 && !ready; i++) {
      await sleep(500);
      try { ready = await evaluate(`document.body && document.body.innerText.includes(${JSON.stringify(s.wait)})`); } catch {}
    }
    if (!ready) console.warn(`[${name}] never saw "${s.wait}"`);
    // The cold-start splash holds for 2.3 s and then fades; the screen is
    // already mounted underneath it, so wait for the splash itself to go.
    for (let i = 0; i < 40; i++) {
      const splash = await evaluate(`document.body.innerText.includes('FACULTY OF ENGINEERING')`);
      if (!splash) break;
      await sleep(500);
    }
    if (s.after) await evaluate(s.after);
    await sleep(s.settle ?? 1500);
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(join(OUT, `${name}.png`), Buffer.from(shot.data, 'base64'));
    const unhandled = await evaluate('JSON.stringify([...new Set(window.__unhandled || [])])');
    console.log(`${name}: saved${ready ? '' : ' (NOT READY)'}  unhandled=${unhandled}`);
  }
} finally {
  await chrome.close();
}
