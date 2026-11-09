// Flexsmith e2e: node tests/e2e/run.mjs (after `vite build`; `npm run e2e` does both). Chromium via Playwright, phone-sized viewports.
// Run with CHROMIUM_PATH=/opt/pw-browsers/chromium/... when the browser build differs from the installed playwright.
import http from 'node:http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist');
const SHOTS = process.env.SHOTS; if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!existsSync(p)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }).end(readFileSync(p));
}).listen(0, '127.0.0.1');
await new Promise(r => server.on('listening', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { if (ok) { pass++; console.log('PASS ', name); } else { fail++; console.log('FAIL ', name, extra); } };
const PH = { viewport: { width: 390, height: 844 } };

/** Opens the app. By default as a reload inside a session (the start animation is tested separately with splash:true). */
async function open(opts = {}, init) {
  const { splash, onboarded = true, ...ctxOpts } = opts;
  const ctx = await browser.newContext({ acceptDownloads: true, locale: 'pl-PL', ...ctxOpts });
  const page = await ctx.newPage(); const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  if (!splash) await page.addInitScript(() => { try { sessionStorage.setItem('smith.splash', 'played'); } catch { /* */ } });
  if (init) await page.addInitScript(init);
  await page.goto(BASE);
  if (!splash) await page.waitForSelector('#main');
  if (onboarded && !splash) await skipOnboarding(page);
  return { ctx, page, errors };
}
async function skipOnboarding(page) { if (await page.locator('[data-a=obSkip]').count()) { await page.click('[data-a=obSkip]'); await page.waitForSelector('[data-testid=nav-today]'); } }
const iife = (...fns) => fns.map(f => `(${f})();`).join('\n');
const shot = async (page, name) => { if (!SHOTS) return; await page.waitForTimeout(380); await page.screenshot({ path: join(SHOTS, `${name}.png`) }); };
const hist = page => page.evaluate(() => new Promise(res => { const r = indexedDB.open('flexsmith'); r.onsuccess = () => { const db = r.result; const q = db.transaction('history').objectStore('history').getAll(); q.onsuccess = () => { db.close(); res(q.result); }; }; }));
const noHScroll = (page, sel = '#main') => page.evaluate(s => { const e = document.querySelector(s); return !e || e.scrollWidth <= e.clientWidth + 1; }, sel);
const text = page => page.evaluate(() => document.body.innerText);
/** a routine of one 5 s exercise, built through the UI (so the builder is exercised too) */
async function shortRoutine(page, exTestName = 'march') {
  await page.click('[data-testid=nav-mine]'); await page.click('[data-a=newRoutine] >> nth=1'); await page.waitForSelector('#rn');
  await page.click('[data-a=addEx]'); await page.click(`[data-a=pickEx][data-id=${exTestName}]`); await page.waitForSelector('[data-testid=step]');
  for (let i = 0; i < 5; i++) await page.click('[data-a=stepdur][data-d="-5"]');
  await page.click('[data-a=saveRoutine]'); await page.waitForSelector('[data-a=editRoutine]');
}

/* ================= first use, onboarding, language, theme ================= */
for (const scheme of ['light', 'dark']) {
  const { ctx, page, errors } = await open({ ...PH, colorScheme: scheme, onboarded: false });
  check(`[${scheme}] first launch shows the short onboarding with "skip for now"`, await page.locator('[data-a=obSkip]').count() === 1 && (await text(page)).includes('Krok 1 z 6'));
  await shot(page, `onboarding-${scheme}`);
  check(`[${scheme}] theme follows the system`, (await page.getAttribute('html', 'data-smith-theme')) === scheme);
  await page.click('[data-a=obSkip]'); await page.waitForSelector('[data-testid=nav-today]');
  check(`[${scheme}] skipping leaves a legitimate default recommendation with its reason`, (await page.locator('[data-testid=why]').innerText()).includes('Na podstawie') && await page.locator('[data-a=startRec]').count() === 1);
  await shot(page, `today-${scheme}`);
  check(`[${scheme}] nothing is saved as a session until one is done (empty history, 0 this week)`, (await hist(page)).length === 0 && (await page.locator('[data-testid=week-n]').innerText()) === '0');
  check(`[${scheme}] no console errors`, errors.length === 0, errors.join(' | '));
  await ctx.close();
}
{ // full onboarding changes the recommendation and survives a restart
  const { ctx, page } = await open({ ...PH, onboarded: false });
  await page.click('[data-a=obGoal][data-id=wind]'); await page.click('[data-a=obNext]'); await page.click('[data-a=obTime][data-id="5"]'); await page.click('[data-a=obNext]');
  await page.click('[data-a=obEquip][data-id=roller]'); await page.click('[data-a=obNext]'); await page.click('[data-a=obLevel][data-id=new]'); await page.click('[data-a=obNext]');
  await page.click('[data-a=obFocus][data-id=calves]'); await page.click('[data-a=obNext]'); await page.click('[data-a=obLimit][data-id=wrist]'); await page.click('[data-a=obFinish]'); await page.waitForSelector('.page', { state: 'detached' });
  const why = await page.locator('[data-testid=why]').innerText();
  check('onboarding: the answers drive the recommendation (goal wind-down, 5 min, calves)', why.includes('wyciszenie') && why.includes('5 min') && why.includes('łydki'), why);
  const t5 = await page.locator('.card .met').first().innerText(); check('onboarding: a 5 minute limit gives a session of at most 5 min', Number(t5) <= 6, t5);
  await page.reload(); await page.waitForSelector('[data-testid=why]');
  check('onboarding: answers survive a restart and onboarding is not shown again', (await page.locator('[data-testid=why]').innerText()) === why && await page.locator('[data-a=obSkip]').count() === 0);
  await ctx.close();
}
{ // red flag
  const { ctx, page } = await open({ ...PH, onboarded: false });
  for (let i = 0; i < 5; i++) await page.click('[data-a=obNext]'); await page.click('[data-a=obRed]'); await page.click('[data-a=obFinish]'); await page.waitForSelector('.page', { state: 'detached' });
  check('red flag: no session is offered, the person is pointed to a professional', await page.locator('[data-a=startRec]').count() === 0 && (await text(page)).includes('lekarzem'));
  await ctx.close();
}
{ // language, theme, reduced motion
  const { ctx, page } = await open(PH);
  await page.click('[data-testid=nav-more]'); await page.click('[data-a=setPref][data-k=lang][data-id=en]'); await page.waitForFunction(() => document.documentElement.lang === 'en');
  check('English: the navigation and the screen switch', (await page.locator('.nav').innerText()).includes('Library') && (await text(page)).includes('Backup'));
  await page.click('[data-a=setPref][data-k=theme][data-id=dark]'); await page.waitForFunction(() => document.documentElement.dataset.smithTheme === 'dark'); check('theme can be forced dark', (await page.getAttribute('html', 'data-smith-theme')) === 'dark');
  await page.click('[data-a=setPref][data-k=motion][data-id=off]'); await page.waitForFunction(() => document.documentElement.dataset.motion === 'reduce'); check('reduced motion setting is applied to the page', (await page.getAttribute('html', 'data-motion')) === 'reduce');
  await shot(page, 'more-en-dark');
  await page.reload(); await page.waitForSelector('#main'); check('the choices are remembered after a restart (and applied before the first paint)', (await page.getAttribute('html', 'lang')) === 'en' && (await page.getAttribute('html', 'data-smith-theme')) === 'dark');
  await ctx.close();
}
{ // system reduced motion
  const { ctx, page } = await open({ ...PH, reducedMotion: 'reduce' });
  const d = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.nav .pill')).transitionDuration));
  check('prefers-reduced-motion: the nav transition is switched off', d <= 0.001, String(d)); await ctx.close();
}

/* ================= recommendation honours inputs ================= */
{
  const { ctx, page } = await open(PH);
  await page.click('[data-a=adjust]');
  await page.click('[data-a=setGoal][data-id=mob]'); await page.click('[data-a=setEq][data-id=mat]');   // mat off: no mat exercises
  const why = async () => (await page.locator('[data-testid=why]').innerText());
  await page.click('.sheet [data-a=closeSheet]'); check('equipment: without a mat the mobility recommendation says no mat is used', (await why()).includes('bez sprzętu'), await why());
  await page.click('[data-a=adjust]'); await page.click('[data-a=setGoal][data-id=roll]'); await page.click('.sheet [data-a=closeSheet]');
  check('empty-filter fallback: rolling without a roller is explained, not a broken session', await page.locator('[data-a=startRec]').count() === 0 && (await text(page)).includes('Brak sesji'));
  await page.click('[data-a=adjust]'); await page.click('[data-a=setEq][data-id=roller]'); await page.click('.sheet [data-a=closeSheet]');
  check('rolling with a roller finds a session', await page.locator('[data-a=startRec]').count() === 1);
  await ctx.close();
}

/* ================= library, favourites, exercise detail, offline fallback ================= */
for (const scheme of ['light', 'dark']) {
  const { ctx, page } = await open({ ...PH, colorScheme: scheme });
  await page.click('[data-testid=nav-lib]'); await page.waitForSelector('#llist .li');
  const all = await page.locator('#llist .li').count(); check(`[${scheme}] the library lists 40 exercises`, all === 40, String(all));
  await page.fill('#lq', 'łydk'); check(`[${scheme}] search finds calf exercises`, (await page.locator('#llist .li').count()) >= 3);
  await page.fill('#lq', ''); await page.click('[data-a=ftype][data-id=roll]'); const rolls = await page.locator('#llist .li').count(); check(`[${scheme}] filter by kind: rolling is its own kind`, rolls === 6, String(rolls));
  await page.click('[data-a=ftype][data-id=all]'); await page.click('[data-a=openEx][data-id=rocks]'); await page.waitForSelector('.page');
  check(`[${scheme}] exercise detail: steps, mistakes, caution, kind and the text fallback for the missing demonstration`, (await page.locator('.page ol.steps li').count()) === 3 && await page.locator('[data-testid=media-fallback]').count() === 1 && (await page.locator('.page .notice').first().innerText()).includes('Uwaga'));
  check(`[${scheme}] exercises are honestly marked as under review`, await page.locator('[data-testid=review-note]').count() === 1);
  await shot(page, `exercise-${scheme}`);
  await page.click('.fav'); await page.waitForFunction(() => document.querySelector('.fav').getAttribute('aria-pressed') === 'true'); check(`[${scheme}] favourite toggles`, (await page.getAttribute('.fav', 'aria-pressed')) === 'true');
  await page.click('[data-a=back]'); await page.click('[data-a=ffav]'); check(`[${scheme}] the favourites filter shows it`, (await page.locator('#llist .li').count()) === 1);
  await page.reload(); await page.waitForSelector('#main'); await page.click('[data-testid=nav-lib]'); await page.click('[data-a=ffav]'); check(`[${scheme}] favourites survive a restart`, (await page.locator('#llist .li').count()) === 1);
  await shot(page, `library-${scheme}`);
  await ctx.close();
}
{ // media fallback offline: the page works with the network cut
  const { ctx, page } = await open(PH); await ctx.setOffline(true);
  await page.click('[data-testid=nav-lib]'); await page.click('[data-a=openEx][data-id=march]'); check('offline: exercise detail and its text fallback work without a network', (await page.locator('.page ol.steps li').count()) === 3);
  await ctx.close();
}

/* ================= sessions, detail, copy ================= */
{
  const { ctx, page } = await open(PH);
  await page.click('[data-testid=nav-sessions]'); check('sessions: 13 ready sessions', (await page.locator('#slist .li').count()) === 13);
  await page.click('[data-a=fint][data-id=roll]'); check('sessions: filter by intent', (await page.locator('#slist .li').count()) === 2);
  await page.click('[data-a=fint][data-id=all]'); await page.click('[data-a=openSession][data-id=prerun]'); await page.waitForSelector('[data-testid=calc]');
  const calc = await page.locator('[data-testid=calc]').innerText(); check('session detail: the total time shows its calculation (4:25 for the pre-run session)', calc.includes('4:25') && calc.includes('230') === false && calc.includes('3:50'), calc);
  await page.click('[data-a=copyTemplate]'); await page.waitForSelector('#rn'); check('customising makes a copy and opens the editor, the original stays', (await page.inputValue('#rn')).startsWith('Kopia') && (await page.locator('[data-testid=step]').count()) === 5);
  await ctx.close();
}

/* ================= builder ================= */
for (const scheme of ['light', 'dark']) {
  const { ctx, page } = await open({ ...PH, colorScheme: scheme });
  await page.click('[data-testid=nav-mine]'); await page.click('[data-a=newRoutine] >> nth=1'); await page.waitForSelector('#rn');
  await page.fill('#rn', 'Test A');
  for (const ex of ['march', 'rocks', 'catcow']) { await page.click('[data-a=addEx]'); await page.click(`[data-a=pickEx][data-id=${ex}]`); }
  const names = () => page.locator('[data-testid=step] .grow').allInnerTexts();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid=step]').length === 3); check(`[${scheme}] builder: exercises are added from the library`, (await names()).length === 3);
  const t0 = await page.locator('[data-testid=total]').innerText();
  await page.click('[data-a=stepdur][data-d="5"] >> nth=0'); await page.waitForFunction(v => document.querySelector('[data-testid=total]').textContent !== v, t0); check(`[${scheme}] builder: the total follows a duration change`, (await page.locator('[data-testid=total]').innerText()) !== t0);
  const first = (await names())[0]; await page.click('[data-a=mv][data-d="1"] >> nth=0'); await page.waitForFunction(f => document.querySelectorAll('[data-testid=step] .grow')[1]?.textContent === f, first); check(`[${scheme}] builder: reorder`, (await names())[1] === first);
  await page.click('[data-a=rmStep] >> nth=0'); await page.waitForFunction(() => document.querySelectorAll('[data-testid=step]').length === 2); check(`[${scheme}] builder: remove offers undo`, (await names()).length === 2 && await page.locator('.toast [data-a=undo]').count() === 1);
  await page.click('.toast [data-a=undo]'); await page.waitForTimeout(150); check(`[${scheme}] builder: undo restores the step`, (await names()).length === 3);
  await shot(page, `builder-${scheme}`);
  await page.click('[data-a=saveRoutine]'); await page.waitForSelector('[data-a=editRoutine]');
  await page.click('[data-a=editRoutine] >> nth=0'); await page.click('[data-a=dupRoutine]'); await page.waitForTimeout(200); check(`[${scheme}] builder: duplicate`, (await page.inputValue('#rn')).includes('(2)'));
  await page.click('[data-a=back]'); await page.click('[data-testid=nav-mine]'); const n = await page.locator('[data-a=editRoutine]').count();
  await page.click('[data-a=editRoutine] >> nth=0'); await page.click('[data-a=delRoutine]'); await page.click('[data-a=confirmDelete]'); await page.waitForTimeout(150);
  check(`[${scheme}] builder: delete asks first, then it is gone, with undo`, (await page.locator('[data-a=editRoutine]').count()) === n - 1 && await page.locator('.toast [data-a=undo]').count() === 1);
  await page.click('.toast [data-a=undo]'); await page.waitForTimeout(250); check(`[${scheme}] builder: delete can be undone`, (await page.locator('[data-a=editRoutine]').count()) === n);
  await ctx.close();
}
{ // no dangling references: a stored routine with an unknown exercise opens without it
  const { ctx, page } = await open(PH);
  await page.evaluate(() => new Promise(res => { const r = indexedDB.open('flexsmith'); r.onsuccess = () => { const db = r.result; const tx = db.transaction('routines', 'readwrite'); tx.objectStore('routines').put({ id: 'rx', name: 'Stara', steps: [{ id: 's1', ex: 'march' }, { id: 's2', ex: 'removed-later' }], createdAt: 1, updatedAt: 1, deletedAt: null }); tx.oncomplete = () => { db.close(); res(); }; }; }));
  await page.reload(); await page.waitForSelector('#main'); await page.click('[data-testid=nav-mine]'); await page.click('[data-a=editRoutine][data-id=rx]');
  check('a stored routine pointing at a missing exercise opens without that step (no dangling reference is drawn)', (await page.locator('[data-testid=step]').count()) === 1);
  await ctx.close();
}

/* ================= player: timing, sides, pause, skip, early finish, persistence ================= */
{
  const { ctx, page, errors } = await open(PH);
  await page.click('[data-a=startRec]'); await page.waitForSelector('#player'); await page.waitForTimeout(400); await shot(page, 'player-light');
  const l1 = +(await page.locator('[data-testid=pl-time]').innerText()); await page.waitForTimeout(1300); const l2 = +(await page.locator('[data-testid=pl-time]').innerText());
  check('player: the timer counts down', l2 < l1, `${l1}->${l2}`);
  await page.click('[data-testid=pl-pause]'); const lp = +(await page.locator('[data-testid=pl-time]').innerText()); await page.waitForTimeout(1300); check('player: pause holds the value', +(await page.locator('[data-testid=pl-time]').innerText()) === lp);
  await page.click('[data-testid=pl-pause]');
  // a gap while the app is in the background: the wall clock runs on while the monotonic one stands still (device sleep, locked screen)
  const before = +(await page.locator('[data-testid=pl-time]').innerText());
  await page.evaluate(() => { const real = Date.now.bind(Date); Date.now = () => real() + 6000; document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(300); const after = +(await page.locator('[data-testid=pl-time]').innerText());
  check('player: a 6 s gap (background, lock, sleep) is accounted for when the app comes back', after <= before - 5, `${before} -> ${after}`);
  await page.click('[data-testid=pl-next]'); await page.waitForTimeout(300);
  check('player: next moves on, the step counter follows', (await page.locator('[data-testid=pl-step]').innerText()).includes('2 z'));
  const sw = await page.locator('[data-testid=pl-name]').innerText(); await page.click('[data-testid=pl-swap]'); await page.waitForTimeout(200); check('player: swap offers a suitable alternative', (await page.locator('[data-testid=pl-name]').innerText()) !== sw);
  await page.click('[data-testid=pl-finish]'); await page.waitForSelector('[data-testid=pl-result]');
  check('player: finishing early is recorded as partial', (await page.locator('[data-testid=pl-result]').innerText()).includes('przerwana'));
  await shot(page, 'finish');
  await page.click('[data-a=plCmf][data-id=discomfort]'); check('check-in: discomfort shows a calm, non-medical note', await page.locator('#discomfort:not([hidden])').count() === 1);
  await page.fill('#nt', 'prawe kolano ok'); await page.click('[data-testid=pl-save]'); await page.waitForSelector('[data-testid=hist-row]');
  const h = await hist(page);
  check('history: saved with real duration, partial status, skipped step, swap and check-in', h.length === 1 && h[0].status === 'partial' && h[0].activeSec >= 6 && h[0].activeSec < 40 && h[0].steps.some(s => s.outcome === 'skipped') && h[0].checkIn.comfort === 'discomfort' && h[0].checkIn.note === 'prawe kolano ok' && h[0].checkIn.modified === true, JSON.stringify(h[0]).slice(0, 300));
  check('history: the planned duration is the one shown before the session', h[0].plannedSec > 100);
  await page.reload(); await page.waitForSelector('#main'); check('history survives a restart and is shown on Today', await page.locator('[data-testid=hist-row]').count() === 1 && (await page.locator('[data-testid=week-n]').innerText()) === '1');
  check('player: no console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}
{ // a complete session with sides, rep-based manual completion and the actual duration
  const { ctx, page } = await open(PH);
  await shortRoutine(page, 'swingfb'); await page.click('[data-a=editRoutine] >> nth=0'); await page.click('[data-a=startSession]'); await page.waitForSelector('#player');
  check('player: a two-sided exercise starts with the left side', (await page.locator('[data-testid=pl-side]').innerText()).includes('Lewa'));
  await page.waitForFunction(() => document.querySelector('[data-testid=pl-side]')?.textContent?.includes('Prawa'), null, { timeout: 9000 });
  check('player: the side changes automatically to the right side', true);
  await page.waitForSelector('[data-testid=pl-result]', { timeout: 9000 });
  check('player: after the last side the session is complete', (await page.locator('[data-testid=pl-result]').innerText()).includes('zakończona'));
  const act = await page.locator('[data-testid=pl-actual]').innerText(); check('player: the actual duration is about the planned 10 s (0:09 to 0:11)', ['0:09', '0:10', '0:11'].includes(act), act);
  await page.click('[data-testid=pl-save]'); await page.waitForSelector('[data-testid=hist-row]'); const h = await hist(page); check('history: a completed session is stored as completed', h[0].status === 'completed' && h[0].steps.length === 2 && h[0].steps.every(s => s.outcome === 'done'));
  await ctx.close();
}
{ // reps exercise: manual completion
  const { ctx, page } = await open(PH);
  await page.click('[data-testid=nav-mine]'); await page.click('[data-a=newRoutine] >> nth=1'); await page.click('[data-a=addEx]'); await page.click('[data-a=pickEx][data-id=catcow]'); await page.click('[data-a=saveRoutine]');
  await page.click('[data-a=editRoutine] >> nth=0'); await page.click('[data-a=startSession]'); await page.waitForSelector('[data-testid=pl-done]');
  check('player: a rep-based exercise shows the repetitions and waits for the person', (await page.locator('[data-testid=pl-reps]').innerText()) === '8');
  await page.waitForTimeout(1500); check('player: it does not advance by itself', await page.locator('[data-testid=pl-result]').count() === 0);
  await page.click('[data-testid=pl-done]'); await page.waitForSelector('[data-testid=pl-result]'); check('player: "Gotowe" completes it', true); await ctx.close();
}
{ // minimise and resume, interrupted app, process restart
  const { ctx, page } = await open(PH);
  await page.click('[data-a=startRec]'); await page.waitForSelector('#player'); await page.click('[data-testid=pl-next]'); await page.waitForTimeout(300); await page.click('[data-testid=pl-min]'); await page.waitForSelector('[data-testid=resume-card]');
  check('leaving the player keeps the session: Today offers to continue it at the same step', (await page.locator('[data-testid=resume-card]').innerText()).includes('2 z'));
  await page.reload(); await page.waitForSelector('[data-testid=resume-card]');
  check('after the app was closed the session is still offered, with an honest note that the exercise restarts', (await page.locator('[data-testid=resume-card]').innerText()).includes('od początku'));
  await page.click('[data-a=resumeSaved]'); await page.waitForSelector('#player'); check('resuming starts paused on the saved step', (await page.locator('[data-testid=pl-step]').innerText()).includes('2 z') && (await text(page)).includes('Wznowiono po przerwie'));
  await page.click('[data-testid=pl-finish]'); await page.click('[data-testid=pl-save]'); await page.waitForSelector('[data-testid=hist-row]'); check('the unfinished-session record is cleared after saving', await page.locator('[data-testid=resume-card]').count() === 0);
  await ctx.close();
}

/* ================= backup ================= */
{
  const { ctx, page } = await open(PH);
  await shortRoutine(page);
  await page.click('[data-testid=nav-more]'); await page.click('[data-a=openPage][data-id=backup]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-a=exportBackup]')]);
  const path = await dl.path(); const file = JSON.parse(readFileSync(path, 'utf8'));
  check('backup: the export is a Flexsmith file with schema, date and the data', file.app === 'flexsmith' && file.schema === 1 && !!file.exportedAt && file.data.routines.length === 1 && file.data.prefs.onboarded === true, JSON.stringify(file).slice(0, 200));
  mkdirSync('/tmp/flexsmith-e2e', { recursive: true });
  const good = '/tmp/flexsmith-e2e/good.json'; writeFileSync(good, JSON.stringify({ ...file, data: { ...file.data, routines: [...file.data.routines, { id: 'r2', name: 'Z pliku', steps: [{ id: 's', ex: 'rocks' }], createdAt: 1, updatedAt: 1 }] } }));
  const bad = { json: '/tmp/flexsmith-e2e/bad.txt', other: '/tmp/flexsmith-e2e/other.json', newer: '/tmp/flexsmith-e2e/newer.json' };
  writeFileSync(bad.json, 'to nie jest json'); writeFileSync(bad.other, JSON.stringify({ app: 'runsmith', schema: 1, data: {} })); writeFileSync(bad.newer, JSON.stringify({ app: 'flexsmith', schema: 99, data: {} }));
  for (const [k, msg] of [['json', 'nie jest plik JSON'], ['other', 'inna aplikacja'], ['newer', 'nowszej wersji']]) {
    await page.setInputFiles('#importFile', bad[k]); await page.waitForSelector('.toast');
    check(`backup: invalid input is rejected with a reason (${k})`, (await page.locator('.toast').innerText()).includes(msg), await page.locator('.toast').innerText());
    check(`backup: the data is untouched after a rejected file (${k})`, (await hist(page)).length === 0 && await page.locator('.sheet').count() === 0);
  }
  await page.setInputFiles('#importFile', good); await page.waitForSelector('.sheet [data-testid=imp-merge]');
  check('backup: before anything is written the person sees what would change', (await page.locator('.sheet').innerText()).includes('Pasują do istniejących'));
  await page.click('[data-testid=imp-merge]'); await page.waitForSelector('.toast'); await page.click('[data-testid=nav-mine]');
  check('backup: merge adds the routine from the file and keeps the existing one', (await page.locator('[data-a=editRoutine]').count()) === 2);
  await page.click('[data-testid=nav-more]'); await page.click('[data-a=openPage][data-id=backup]'); await page.setInputFiles('#importFile', good); await page.click('[data-testid=imp-replace]'); await page.waitForSelector('.toast'); await page.click('[data-testid=nav-mine]');
  check('backup: replace makes the file the data', (await page.locator('[data-a=editRoutine]').count()) === 2);
  await ctx.close();
}

/* ================= sizes, safe layout ================= */
for (const [w, h] of [[320, 568], [360, 740], [390, 844], [430, 932], [768, 1024]]) {
  const { ctx, page } = await open({ viewport: { width: w, height: h } });
  let ok = true; for (const tab of ['today', 'sessions', 'mine', 'lib', 'more']) { await page.click(`[data-testid=nav-${tab}]`); await page.waitForTimeout(80); ok = ok && await noHScroll(page); }
  check(`[${w}x${h}] no horizontal scroll on any tab`, ok);
  const small = await page.evaluate(() => [...document.querySelectorAll('button, input')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 43.5 || (r.width < 43.5 && !e.closest('.stepper'))) && e.offsetParent !== null; }).map(e => `${e.tagName}.${e.className}:${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));
  check(`[${w}x${h}] touch targets are at least 44 px`, small.length === 0, small.slice(0, 5).join(', '));
  await page.click('[data-testid=nav-today]'); await page.click('[data-a=startRec]'); await page.waitForSelector('#player');
  const fits = await page.evaluate(() => { const p = document.getElementById('player'); return p.scrollWidth <= p.clientWidth + 1; });
  const btnVisible = await page.evaluate(() => { const b = document.querySelector('[data-testid=pl-pause]').getBoundingClientRect(); return b.bottom <= innerHeight && b.top >= 0; });
  check(`[${w}x${h}] the player fits and its main control is on screen`, fits && btnVisible);
  await ctx.close();
}

/* ================= start animation (real launch) ================= */
const WATCH = () => { window.__sp = { out: null, usable: null }; new MutationObserver(() => { const sp = document.getElementById('splash'), app = document.getElementById('app'); if (sp && sp.classList.contains('out') && window.__sp.out === null) window.__sp.out = performance.now(); if (app && !app.hasAttribute('inert') && window.__sp.usable === null) window.__sp.usable = performance.now(); }).observe(document, { subtree: true, attributes: true, childList: true }); };
const SLOWDB = () => { const o = IDBFactory.prototype.open; IDBFactory.prototype.open = function (...a) { const self = this; let real; const handlers = {}; const proxy = new Proxy({}, { set(_, k, v) { handlers[k] = v; if (real) real[k] = v; return true; }, get(_, k) { const v = real ? real[k] : undefined; return typeof v === 'function' ? v.bind(real) : v; } }); setTimeout(() => { real = o.apply(self, a); for (const [k, v] of Object.entries(handlers)) real[k] = v; }, 3500); return proxy; }; };
{
  const { ctx, page, errors } = await open({ ...PH, splash: true }, WATCH);
  await page.waitForSelector('#splash'); await page.waitForTimeout(900);
  const mid = await page.evaluate(() => ({ splash: !!document.getElementById('splash'), out: document.getElementById('splash')?.classList.contains('out'), inert: document.getElementById('app').hasAttribute('inert') }));
  check('start: 0.9 s in, the start screen is up and the app below is inert (a fast init does not cut it short)', mid.splash && !mid.out && mid.inert, JSON.stringify(mid));
  const offs = await page.evaluate(() => [...document.querySelectorAll('.sp-rv')].map(p => parseFloat(getComputedStyle(p).strokeDashoffset)));
  check('start: at 0.9 s the two parts of the F are still being revealed', offs.length === 2 && offs.some(v => v > 0), offs.join());
  await page.waitForSelector('#splash', { state: 'detached', timeout: 4000 });
  const tm = await page.evaluate(() => window.__sp);
  check('start: the app becomes usable only after the full timeline (>= 1.6 s), the screen fades first', tm.out >= 1550 && tm.usable >= tm.out - 5 && tm.usable < 2600, JSON.stringify(tm));
  check('start: onboarding is shown only after the animation', await page.locator('[data-a=obSkip]').count() === 1);
  check('start: no console errors', errors.length === 0, errors.join(' | '));
  await page.click('[data-a=obSkip]'); await page.click('[data-testid=nav-lib]');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  check('start: no replay on a tab change or a return from the background', await page.locator('#splash').count() === 0);
  await page.reload(); await page.waitForTimeout(150);
  check('start: a reload in the same session shows the app at once', (await page.evaluate(() => getComputedStyle(document.getElementById('splash') || document.body).display)) !== 'grid' && !(await page.evaluate(() => document.getElementById('app').hasAttribute('inert'))));
  await ctx.close();
}
{
  const { ctx, page } = await open({ ...PH, splash: true }, iife(WATCH, SLOWDB));
  await page.waitForSelector('#splash'); await page.waitForTimeout(2800);
  const st = await page.evaluate(() => ({ splash: !!document.getElementById('splash'), out: document.getElementById('splash')?.classList.contains('out'), inert: document.getElementById('app').hasAttribute('inert'), ui: document.querySelectorAll('#app .nav').length, running: document.getAnimations().filter(a => a.playState === 'running').length, name: getComputedStyle(document.querySelector('.sp-name')).opacity }));
  check('slow init: the finished logo stays, nothing runs or restarts, no unready UI', st.splash && !st.out && st.inert && st.ui === 0 && st.running === 0 && st.name === '1', JSON.stringify(st));
  await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); const tm = await page.evaluate(() => window.__sp);
  check('slow init: the app appears when it is ready (about 3.5 s), not before', tm.usable >= 3400, JSON.stringify(tm)); await ctx.close();
}
{
  const { ctx, page } = await open({ ...PH, splash: true }, iife(() => { IDBFactory.prototype.open = function () { throw new Error('boom'); }; }));
  await page.waitForSelector('#splash'); await page.waitForSelector('#splash', { state: 'detached', timeout: 5000 });
  check('failed init: the start screen leaves, the error and a retry button are shown and usable', await page.locator('[role=alert] #retry').count() === 1 && !(await page.evaluate(() => document.getElementById('app').hasAttribute('inert')))); await ctx.close();
}
for (const scheme of ['light', 'dark']) {
  const { ctx, page } = await open({ ...PH, colorScheme: scheme, splash: true }); await page.waitForSelector('#splash');
  const c = await page.evaluate(() => ({ bg: getComputedStyle(document.getElementById('splash')).backgroundColor, name: getComputedStyle(document.querySelector('.sp-name')).color, tile: document.querySelector('.sp-tile rect').getAttribute('fill') }));
  check(`start [${scheme}]: background, wordmark and tile colours`, c.bg === (scheme === 'dark' ? 'rgb(11, 14, 17)' : 'rgb(244, 245, 246)') && c.tile === '#6C5AA2' && c.name === (scheme === 'dark' ? 'rgb(233, 237, 241)' : 'rgb(21, 26, 33)'), JSON.stringify(c)); await ctx.close();
}
{
  const { ctx, page } = await open({ ...PH, reducedMotion: 'reduce', splash: true }, WATCH); await page.waitForSelector('#splash');
  const r = await page.evaluate(() => ({ anims: document.getAnimations().filter(a => a.animationName && a.animationName.startsWith('sp-')).length, name: getComputedStyle(document.querySelector('.sp-name')).opacity, off: [...document.querySelectorAll('.sp-rv')].every(p => parseFloat(getComputedStyle(p).strokeDashoffset) === 0) }));
  check('reduced motion: no animation runs, the finished logo and the wordmark are there from the first frame', r.anims === 0 && r.name === '1' && r.off, JSON.stringify(r));
  await page.waitForSelector('#splash', { state: 'detached', timeout: 3000 }); const tm = await page.evaluate(() => window.__sp);
  check('reduced motion: a short fixed moment, then the app follows', tm.usable >= 550 && tm.usable < 1800, JSON.stringify(tm)); await ctx.close();
}
for (const [w, h] of [[320, 568], [360, 740], [412, 915], [768, 1024]]) {
  const { ctx, page } = await open({ viewport: { width: w, height: h }, splash: true }); await page.waitForSelector('#splash'); await page.waitForTimeout(1300);
  const b = await page.evaluate(() => { const r = document.querySelector('.sp-tile').getBoundingClientRect(), n = document.querySelector('.sp-name').getBoundingClientRect(); return { tile: [r.left, r.top, r.right, r.bottom], name: [n.left, n.right, n.bottom] }; });
  check(`start [${w}x${h}]: the tile is centred, the wordmark below it, all inside the screen`, Math.abs((b.tile[0] + b.tile[2]) / 2 - w / 2) < 1 && b.tile[1] > 0 && b.name[2] < h && b.name[0] > 0 && b.name[1] < w && b.name[2] > b.tile[3], JSON.stringify(b)); await ctx.close();
}

await browser.close(); server.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
