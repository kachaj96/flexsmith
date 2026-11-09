import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const res = (p: string) => join(root, 'android/app/src/main/res', p);
const size = (f: string) => { const b = readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const TILE = '#6C5AA2';

describe('logo and icons (approved variant 2)', () => {
  it('the master logo, favicon, in-app mark and start screen are drawn from the same two shapes', async () => {
    const brand = await import(join(root, 'scripts/brand.mjs'));
    const logo = read('design/logo.svg'); const page = read('index.html'); const art = read('src/brand-art.ts');
    expect(brand.PARTS.length).toBe(2);
    expect(logo).toContain(TILE); expect(read('public/favicon.svg')).toBe(logo); expect(page).toContain('href="./favicon.svg"');
    for (const p of brand.PARTS) { expect(logo).toContain(`d="${p.d}"`); expect(page).toContain(`d="${p.d}"`); expect(art).toContain(p.d); }
  });
  it('no trace of the first (stick-figure) icon is left outside the design masters and the superseded prototype', () => {
    for (const f of ['index.html', 'design/logo.svg', 'public/favicon.svg', 'src/brand-art.ts', 'src/ui/views.ts']) expect(read(f), f).not.toContain('M26 48 C43 41');
    expect(read('src/ui/views.ts')).not.toContain('#8071B4');
  });
  it('every density has the legacy, round, foreground and monochrome image at the size Android expects', () => {
    const DENS = { mdpi: [48, 108], hdpi: [72, 162], xhdpi: [96, 216], xxhdpi: [144, 324], xxxhdpi: [192, 432] } as const;
    for (const [d, [legacy, adaptive]] of Object.entries(DENS)) {
      for (const f of ['ic_launcher.png', 'ic_launcher_round.png']) expect(size(res(`mipmap-${d}/${f}`)), `${d}/${f}`).toEqual([legacy, legacy]);
      for (const f of ['ic_launcher_foreground.png', 'ic_launcher_monochrome.png']) expect(size(res(`mipmap-${d}/${f}`)), `${d}/${f}`).toEqual([adaptive, adaptive]);
    }
  });
  it('the adaptive icon has a flat full-bleed background (no second rounding), a foreground and a monochrome layer', () => {
    for (const f of ['ic_launcher.xml', 'ic_launcher_round.xml']) { const x = readFileSync(res(`mipmap-anydpi-v26/${f}`), 'utf8'); for (const k of ['@color/ic_launcher_background', '@mipmap/ic_launcher_foreground', '@mipmap/ic_launcher_monochrome']) expect(x).toContain(k); }
    expect(readFileSync(res('values/ic_launcher_background.xml'), 'utf8')).toContain(TILE);
    expect(read('design/logo-background.svg')).not.toContain('rx='); expect(read('design/logo-foreground.svg')).not.toContain('<rect');
  });
  it('the symbol sits inside the adaptive safe zone: its bounding circle is at most 66 dp of the 108 dp canvas', async () => {
    const { BBOX } = await import(join(root, 'scripts/brand.mjs'));
    const fg = read('design/logo-foreground.svg'); const k = Number(fg.match(/scale\(([\d.]+)\)/)![1]);
    const diag = Math.hypot(BBOX[2] - BBOX[0], BBOX[3] - BBOX[1]) * k; expect(diag / 1024 * 108).toBeLessThanOrEqual(66);
  });
  it('the system splash is only the background colour, matching the web start screen, and the stock Capacitor vector is gone', () => {
    expect(readFileSync(res('values/colors_splash.xml'), 'utf8')).toContain('#F4F5F6'); expect(readFileSync(res('values-night/colors_splash.xml'), 'utf8')).toContain('#0B0E11');
    const st = readFileSync(res('values/styles.xml'), 'utf8'); expect(st).toContain('windowSplashScreenBackground'); expect(st).toContain('splash_icon_empty');
    const page = read('index.html'); expect(page).toContain('background:#F4F5F6'); expect(page).toContain('background:#0B0E11');
    expect(existsSync(res('drawable-v24/ic_launcher_foreground.xml'))).toBe(false);
  });
  it('package and data isolation from the sibling apps', () => {
    expect(read('capacitor.config.ts')).toContain("appId: 'dev.kachaj96.flexsmith'");
    const g = read('android/app/build.gradle'); expect(g).toContain('dev.kachaj96.flexsmith'); expect(g).toContain('FLEXSMITH_KEYSTORE_FILE'); expect(g).not.toContain('RUNNING_'); expect(g).not.toContain('REPSMITH_');
    const src = ['src/storage/db.ts', 'src/main.ts', 'index.html'].map(read).join('\n');
    expect(src).not.toMatch(/['"`]running\.|['"`]repsmith\.|dev\.kachaj96\.(running|repsmith)/);
    expect(read('src/storage/db.ts')).toContain("DB_NAME = 'flexsmith'");
  });
  it('the start screen waits for the animation and the app, and starts with the app inert', () => {
    const page = read('index.html'); expect(page).toContain('<div id="app" inert>'); expect(page).toContain('animation:sp-end 1.6s'); expect(page).toContain('prefers-reduced-motion:reduce');
    expect(read('src/main.ts')).toContain("splash.settle('ready')"); expect(read('src/main.ts')).toContain("splash.settle('failed')");
  });
});
