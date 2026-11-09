// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createSplash, FLAG, REDUCED_HOLD_MS, SLOW_HINT_MS, SLOW_RETRY_MS, SPLASH_MS } from '../../src/splash';

/* The start screen controller: the main UI waits for BOTH the animation and the app. The animation is a CSS timeline, so its end is
   signalled here by the animationend event of the .sp-end marker, exactly as a browser does. */
function mount() {
  document.documentElement.removeAttribute('data-splash');
  document.body.innerHTML = '<div id="splash"><p class="sp-name">Runsmith</p><i class="sp-end"></i><p class="sp-hint" hidden></p></div><div id="app" inert></div>';
  return { el: document.getElementById('splash')!, app: document.getElementById('app')! };
}
const endAnimation = (el: HTMLElement) => el.querySelector('.sp-end')!.dispatchEvent(new Event('animationend'));
const flush = async () => { await vi.advanceTimersByTimeAsync(0); };

beforeEach(() => { vi.useFakeTimers(); sessionStorage.clear(); });
afterEach(() => { vi.useRealTimers(); Object.defineProperty(document, 'hidden', { value: false, configurable: true }); });

describe('start screen: both the animation and the app must be done', () => {
  it('a fast init never shortens the animation: the app is ready at once, the screen stays until the animation ends', async () => {
    const { el, app } = mount();
    const s = createSplash({ el, app, reduced: false });
    s.settle('ready');
    await vi.advanceTimersByTimeAsync(SPLASH_MS - 50);
    expect(s.state).toBe('playing');
    expect(document.getElementById('splash')).not.toBeNull();
    expect(el.classList.contains('out')).toBe(false);
    expect(app.hasAttribute('inert')).toBe(true);        // nothing below can be tapped or read while the logo is drawn
    endAnimation(el); await flush();
    expect(s.state).toBe('leaving');
    expect(el.classList.contains('out')).toBe(true);
    expect(app.hasAttribute('inert')).toBe(false);
    await vi.advanceTimersByTimeAsync(500);
    expect(s.state).toBe('done');
    expect(document.getElementById('splash')).toBeNull();
    expect(sessionStorage.getItem(FLAG)).toBe('played');
  });

  it('a slow init keeps the finished logo on screen, never restarts the animation, and shows a hint, then a retry', async () => {
    const { el, app } = mount();
    const s = createSplash({ el, app, reduced: false });
    endAnimation(el); await flush();
    expect(s.state).toBe('waiting');
    const hint = el.querySelector('.sp-hint') as HTMLElement;
    expect(hint.hidden).toBe(true);
    await vi.advanceTimersByTimeAsync(SLOW_HINT_MS + 10);
    expect(hint.hidden).toBe(false);
    expect(hint.textContent).toContain('dłużej');
    expect(el.querySelector('.sp-retry')).toBeNull();
    await vi.advanceTimersByTimeAsync(SLOW_RETRY_MS - SLOW_HINT_MS);
    expect(el.querySelector('.sp-retry')).not.toBeNull();
    expect(s.state).toBe('waiting');
    expect(app.hasAttribute('inert')).toBe(true);
    expect(el.classList.contains('out')).toBe(false);    // still the same screen, not restarted, not leaving
    s.settle('ready'); await flush();
    expect(s.state).toBe('leaving');
    await vi.advanceTimersByTimeAsync(500);
    expect(s.state).toBe('done');
  });

  it('a failed init still lets the animation finish, then the error screen below is shown', async () => {
    const { el, app } = mount();
    const s = createSplash({ el, app, reduced: false });
    s.settle('failed'); await flush();
    expect(s.state).toBe('playing');
    expect(app.hasAttribute('inert')).toBe(true);
    endAnimation(el); await flush();
    expect(s.state).toBe('leaving');
    expect(app.hasAttribute('inert')).toBe(false);
    await vi.advanceTimersByTimeAsync(500);
    expect(document.getElementById('splash')).toBeNull();
  });

  it('a stuck animation cannot hold the screen: the watchdog counts visible time and lets go', async () => {
    const { el, app } = mount();
    const s = createSplash({ el, app, reduced: false });
    s.settle('ready');
    await vi.advanceTimersByTimeAsync(SPLASH_MS + 2500 + 600);
    expect(s.state).toBe('done');
  });

  it('a hidden page pauses the animation and the watchdog, and resumes it when the page is seen', async () => {
    const { el, app } = mount();
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    const s = createSplash({ el, app, reduced: false });
    s.settle('ready');
    expect(el.classList.contains('paused')).toBe(true);
    await vi.advanceTimersByTimeAsync(20000);
    expect(s.state).toBe('playing');                      // unseen time does not count
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(el.classList.contains('paused')).toBe(false);
    endAnimation(el); await flush(); await vi.advanceTimersByTimeAsync(500);
    expect(s.state).toBe('done');
  });

  it('reduced motion: no animation, the finished logo is shown for a fixed moment, then a short crossfade', async () => {
    const { el, app } = mount();
    const s = createSplash({ el, app, reduced: true });
    s.settle('ready');
    await vi.advanceTimersByTimeAsync(REDUCED_HOLD_MS - 50);
    expect(s.state).toBe('playing');
    await vi.advanceTimersByTimeAsync(60);
    expect(s.state).toBe('leaving');
    await vi.advanceTimersByTimeAsync(200);
    expect(s.state).toBe('done');
  });

  it('a reload in the same session (flag set) skips the screen and does not leave the app inert', () => {
    const { el, app } = mount();
    document.documentElement.dataset.splash = 'skip';
    const s = createSplash({ el, app, reduced: false });
    expect(s.state).toBe('done');
    expect(document.getElementById('splash')).toBeNull();
    expect(app.hasAttribute('inert')).toBe(false);
  });
});

describe('start screen: the files agree', () => {
  const page = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
  it('the end marker lasts as long as the timeline in splash.ts, and the page starts with the app inert', () => {
    expect(page).toContain(`animation:sp-end ${SPLASH_MS / 1000}s`);
    expect(page).toContain('<div id="app" inert>');
  });
  it('reduced motion switches every animation off and shows the finished logo', () => {
    const block = page.match(/prefers-reduced-motion:reduce\)\{([\s\S]*?)\n    \}/)![1]!;
    for (const sel of ['.sp-tile', '.sp-name', '.sp-rv', '.sp-end']) expect(block).toContain(sel);
    expect(block).toContain('stroke-dashoffset:0');
  });
});
