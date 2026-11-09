// Smoke test and screenshots of the prototype: node prototype/smoke.mjs [outDir]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');   // run with NODE_PATH=<a node_modules that has playwright>
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
const dir = dirname(fileURLToPath(import.meta.url)); const out = process.argv[2] || '/tmp';
const URL_ = 'file://' + join(dir, 'flexsmith-prototype.html');
let pass = 0, fail = 0; const ok = (c, m, x = '') => { if (c) { pass++; console.log('PASS', m); } else { fail++; console.log('FAIL', m, x); } };
const b = await chromium.launch(); const errs = [];
async function open(scheme, q = '?nosplash=1', vp = { width: 390, height: 844 }) {
  const ctx = await b.newContext({ viewport: vp, colorScheme: scheme, deviceScaleFactor: 2, locale: 'pl-PL' });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL_ + q); await p.waitForSelector('#main'); return { ctx, p };
}
const shot = (p, n) => p.screenshot({ path: join(out, n + '.png') });
for (const scheme of ['light', 'dark']) {
  const { ctx, p } = await open(scheme);
  await shot(p, `today-${scheme}`);
  ok(await p.locator('[data-a=startRec]').count() === 1, `[${scheme}] Today has one primary action`);
  ok((await p.innerText('.card')).includes('Na podstawie'), `[${scheme}] the recommendation states its reason`);
  await p.click('[data-a=tab][data-id=lib]'); await p.waitForTimeout(350); await shot(p, `library-${scheme}`);
  await p.click('[data-a=ex][data-id=rocks]'); await p.waitForTimeout(400); await shot(p, `exercise-${scheme}`);
  await p.click('#acc-err > button'); await p.waitForTimeout(300);
  ok((await p.getAttribute('#acc-err', 'data-open')) === 'true', `[${scheme}] accordion opens`);
  await p.click('.fav'); ok((await p.getAttribute('.fav', 'aria-pressed')) === 'false', `[${scheme}] favourite toggles (rocks was a favourite)`);
  await p.click('[data-a=back]');
  await p.click('[data-a=tab][data-id=mine]'); await p.waitForTimeout(300); await p.click('[data-a=editR]'); await p.waitForTimeout(400); await shot(p, `builder-${scheme}`);
  const t0 = await p.innerText('#tot');
  await p.click('[data-a=stepdur] >> nth=1'); ok((await p.innerText('#tot')) !== t0, `[${scheme}] builder total follows a duration change`, t0);
  await p.click('[data-a=mv][data-d="1"] >> nth=0'); ok((await p.locator('.step .n').first().innerText()) === '1', `[${scheme}] reorder keeps numbering`);
  const n0 = await p.locator('.step').count(); await p.click('[data-a=rmStep] >> nth=0');
  ok(await p.locator('.step').count() === n0 - 1 && await p.locator('.toast [data-a=undo]').count() === 1, `[${scheme}] remove offers undo`);
  await p.click('[data-a=undo]'); ok(await p.locator('.step').count() === n0, `[${scheme}] undo restores the step`);
  await p.click('[data-a=addEx]'); await p.fill('#pq', 'wałek'.slice(0, 0)); await p.click('[data-a=pickEx] >> nth=0'); ok(await p.locator('.step').count() === n0 + 1, `[${scheme}] an exercise can be added from the library`);
  await ctx.close();
}
{ // player
  const { ctx, p } = await open('light');
  await p.click('[data-a=startRec]'); await p.waitForSelector('#player'); await p.waitForTimeout(500); await shot(p, 'player-light');
  const l1 = +(await p.innerText('#tl')); await p.waitForTimeout(1300); const l2 = +(await p.innerText('#tl'));
  ok(l2 < l1, 'player: the timer counts down', `${l1}->${l2}`);
  await p.click('#pp'); const lp = +(await p.innerText('#tl')); await p.waitForTimeout(1200); ok(+(await p.innerText('#tl')) === lp, 'player: pause holds the value');
  // background simulation: stall the clock by 5 s while running, the timestamp model must account for it
  await p.click('#pp'); const lb = +(await p.innerText('#tl'));
  await p.evaluate(() => { const real = performance.now.bind(performance); const off = 5000; performance.now = () => real() + off; }); await p.waitForTimeout(300);
  ok(+(await p.innerText('#tl')) <= lb - 4, 'player: a 5 s gap (background / sleep) is counted on return', `${lb} -> ${await p.innerText('#tl')}`);
  const s1 = await p.innerText('.pl-top'); await p.click('[data-a=plNext]'); await p.waitForTimeout(350);
  ok((await p.innerText('.pl-top')) !== s1, 'player: next moves to the next step');
  await p.click('[data-a=plSwap]'); await p.waitForTimeout(200); await p.click('[data-a=plFinish]'); await p.waitForTimeout(300); await shot(p, 'finish-light');
  await p.click('[data-a=cmf] >> nth=0'); await p.fill('#nt', 'test'); await p.click('[data-a=plSave]'); await p.waitForTimeout(400);
  const h = await p.evaluate(() => JSON.parse(localStorage.getItem('flexsmith.proto')).hist);
  ok(h.length === 1 && h[0].done === false && h[0].comfort === 'ok' && h[0].note === 'test', 'player: an early finish is saved honestly as partial', JSON.stringify(h));
  await p.reload(); await p.waitForSelector('#main'); ok((await p.innerText('body')).includes('Ostatnio'), 'history survives a reload');
  await ctx.close();
}
{ // splash: animation and app both done, not a timeout
  const { ctx, p } = await open('light', '');
  await p.waitForTimeout(900); ok(await p.locator('#splash:not(.out)').count() === 1, 'splash: still up at 0.9 s');
  await shot(p, 'splash-900');
  await p.waitForFunction(() => window.__splashDone, null, { timeout: 4000 }); ok(true, 'splash: finishes by itself');
  await ctx.close();
  const r = await open('light', '', { width: 390, height: 844 }); await r.ctx.close();
}
{ // widths and en
  for (const w of [320, 360, 390, 430]) { const { ctx, p } = await open('light', '?nosplash=1', { width: w, height: 800 });
    for (const t of ['sessions', 'lib', 'more', 'today']) { await p.click(`[data-a=tab][data-id=${t}]`); await p.waitForTimeout(120);
      ok(await p.evaluate(() => document.getElementById('main').scrollWidth <= document.getElementById('main').clientWidth + 1), `[${w}] ${t}: no horizontal scroll`); }
    await ctx.close(); }
  const { ctx, p } = await open('dark'); await p.click('[data-a=tab][data-id=more]'); await p.click('[data-a=set][data-k=lang][data-v=en]'); await p.waitForTimeout(200);
  ok((await p.innerText('.nav')).includes('Library'), 'English switches the UI'); await shot(p, 'more-en-dark'); await ctx.close();
}
await b.close();
ok(errs.length === 0, 'no console or page errors', errs.join(' | '));
console.log(`${pass} pass, ${fail} fail`); process.exit(fail ? 1 : 0);
