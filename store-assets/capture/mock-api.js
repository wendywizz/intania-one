/*
 * Injected into the app's web build before any of its own code runs (see
 * capture.mjs). Replaces window.fetch so that NOTHING reaches a real server:
 * every request is answered here with fabricated sample data, and anything not
 * listed gets an empty success envelope and is recorded in window.__unhandled.
 *
 * Every person, id, room and record below is invented.
 */
(() => {
  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (n) => { const d = new Date(now); d.setDate(d.getDate() + n); return d; };

  const STAFF_ID = '900001';
  const ME = { staffId: STAFF_ID, userId: STAFF_ID, name: 'สมชาย ใจดี', email: 'somchai.j@example.com' };

  const ok = (data, extra) => ({ success: true, message: '', data, total_count: Array.isArray(data) ? data.length : undefined, ...(extra || {}) });

  const FIXTURES = window.__FIXTURES__ || {};

  const routes = [
    [/\/api\/health$/, () => ({ data: { status: 'ok', service: 'scooba-service' } })],
    [/\/api\/staff-info$/, () => ok({
      staffId: STAFF_ID, name: ME.name, facultyId: '2', facultyName: 'คณะวิศวกรรมศาสตร์',
      departmentName: 'ภาควิชาวิศวกรรมคอมพิวเตอร์', campusId: '1', positionId: '1', positionName: 'อาจารย์',
      isLecturer: false, stampRole: 'staff', isCompOtEligible: false, eligible: true, reason: 'eligible',
    })],
    [/\/api\/news$/, () => ({ data: FIXTURES.news || [] })],
    [/\/api\/active-summary$/, () => ok(FIXTURES.activeSummary || {})],
  ];

  // Per-screen fixtures register themselves here: window.__routes__.push([re, fn])
  const extra = window.__routes__ || [];

  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  window.__unhandled = [];
  window.__requests = [];
  const realFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    let url;
    try { url = new URL(raw, location.href); } catch { return json({}, 404); }

    // The app's own bundle, fonts and assets are served by Metro on localhost.
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return realFetch(input, init);

    const path = url.pathname;
    const query = Object.fromEntries(url.searchParams.entries());
    const method = (init && init.method) || 'GET';
    window.__requests.push(`${method} ${path}`);

    for (const [re, fn] of [...extra, ...routes]) {
      if (re.test(path)) {
        const out = fn({ path, query, method, body: init && init.body });
        if (out !== undefined) return json(out);
      }
    }

    if (/\/photo\//.test(path) || /psusso|graph\.microsoft|google/.test(url.hostname)) return json({}, 404);
    window.__unhandled.push(`${method} ${path}`);
    return json(ok([]));
  };

  window.__ME__ = ME;
  window.__ok = ok;
  window.__ymd = ymd;
  window.__addDays = addDays;
})();
