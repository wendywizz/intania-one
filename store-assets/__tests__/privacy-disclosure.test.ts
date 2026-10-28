/**
 * T14 (scooba-insight): the privacy policy and the store answer sheets must
 * disclose the self-hosted telemetry (usage, errors, device info, install ID)
 * before an app version that sends it is released. These checks fail if a
 * later edit drops one of the required statements.
 */
// Typed locally: the app tsconfig has no @types/node.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs') as { readFileSync(file: string, encoding: 'utf8'): string };

// <repo>/store-assets/__tests__/this-file -> <repo>/store-assets/<name>
const storeAssets = String(expect.getState().testPath).replace(/[\\/]__tests__[\\/][^\\/]+$/, '');
const read = (name: string) => fs.readFileSync(`${storeAssets}/${name}`, 'utf8');

const policy = read('PRIVACY_POLICY_DRAFT.md');
const [thai, english] = policy.split(/^# Privacy Policy: Intania One app/m);
const appStore = read('APP_STORE_METADATA.md');
const play = read('GOOGLE_PLAY_METADATA.md');

describe('privacy policy §1.8 (telemetry)', () => {
  it('has both a Thai and an English part', () => {
    expect(thai).toBeTruthy();
    expect(english).toBeTruthy();
  });

  it.each([
    ['1.8 **ข้อมูลการใช้งาน ข้อผิดพลาด และข้อมูลอุปกรณ์**'],
    ['ผูกกับรหัสบุคลากร'],
    ['ใช้เพื่อดูแลและปรับปรุงระบบ'],
    ['เก็บ 90 วัน'],
    ['ไม่เปิดเผยแก่บุคคลภายนอก'],
    ['รหัสการติดตั้ง (install ID)'],
    ['รุ่นและผู้ผลิตอุปกรณ์'],
    ['ระบบปฏิบัติการ'],
    ['เวอร์ชันแอป'],
    ['ข้อผิดพลาดและแอปค้าง'],
    ['13 เดือน'],
    ['เซิร์ฟเวอร์ของคณะ'],
    ['ไม่ใช้เครื่องมือติดตามพฤติกรรมของบุคคลภายนอก'],
    ['ไม่แสดงรหัสบุคลากรหรือรหัสการติดตั้ง'],
  ])('Thai: %s', (needle) => {
    expect(thai).toContain(needle);
  });

  it.each([
    ['1.8 **Usage, error and device data**'],
    ['linked to your staff ID'],
    ['maintain and improve the service'],
    ['kept for 90 days'],
    ['not disclosed to third parties'],
    ['**Install ID**'],
    ['device model and manufacturer'],
    ['operating system and version'],
    ['app version'],
    ['**Errors and crashes**'],
    ['13 months'],
    ["stored on the Faculty's servers"],
    ['uses no third-party behavioural tracking'],
    ['never staff IDs or install IDs'],
  ])('English: %s', (needle) => {
    expect(english).toContain(needle);
  });

  it('says the telemetry excludes the forbidden fields', () => {
    expect(thai).toMatch(/ไม่รวม\*\*ชื่อ อีเมล หมายเลข IP ตำแหน่งที่ตั้ง ภาพใบหน้า โทเคน/);
    expect(english).toMatch(/does \*\*not\*\* include your name, email, IP address, location, face images, tokens/);
  });
});

describe('App Store App Privacy answers', () => {
  it.each([
    ['Diagnostics → Crash Data'],
    ['Diagnostics → Performance Data'],
    ['Diagnostics → Other Diagnostic Data'],
    ['Usage Data → Product Interaction'],
    ['install ID'],
    ['**Linked to the user: Yes**'],
    ['**Used for tracking: No**'],
    ['App Functionality, Analytics'],
  ])('%s', (needle) => {
    expect(appStore).toContain(needle);
  });
});

describe('Google Play Data safety answers', () => {
  it.each([
    ['App activity → App interactions'],
    ['App info and performance → Crash logs'],
    ['App info and performance → Diagnostics'],
    ['| Device or other IDs |'],
    ['**Collected: Yes · Shared: No**'],
    ['Analytics, App functionality'],
    ['install ID'],
  ])('%s', (needle) => {
    expect(play).toContain(needle);
  });
});

describe('no third-party analytics SDK is declared', () => {
  it.each([['Firebase Analytics'], ['Sentry'], ['Mixpanel'], ['Crashlytics']])('%s', (name) => {
    for (const doc of [policy, appStore, play]) expect(doc).not.toContain(name);
  });
});
