/* The start screen controller (Smith Motion Language, docs/MOTION.md).

   Two things happen on a launch and they do not know about each other: the animation in index.html (CSS, starts at first paint) and the app
   init in main.ts (database, settings, first view). The main UI is shown only when BOTH are done:

     playing  ->  waiting  ->  leaving  ->  done
        |            ^
        +- app ready first: stays in "playing" until the animation ends (a fast init never shortens it)

   - The animation is done when the .sp-end marker (as long as the whole timeline, hold included) has finished. With reduced motion there is no
     animation: the finished logo is shown for a short, fixed moment instead.
   - If init is slow the finished logo just stays (state "waiting"); the animation is never restarted or looped. After a while a calm line says
     it is taking longer, later a retry button appears, so the screen cannot hang with no way out.
   - If init fails, the animation still finishes, then the start screen leaves and the error banner that main.ts drew is what the person sees.
   - While the screen is up the app below is inert (no taps, no focus, hidden from screen readers). A hidden page pauses the animation, so
     it is seen in full when the person comes back. It plays on a real launch only (the flag below), never on a tab change or a return from
     the background. */
export type SplashState = 'playing' | 'waiting' | 'leaving' | 'done';
export type SplashOutcome = 'ready' | 'failed';
export interface Splash { readonly state: SplashState; settle(outcome: SplashOutcome): void; readonly finished: Promise<void> }

/** Length of the whole timeline, hold included. Keep in step with .sp-end in index.html and TIMELINE.holdUntil in scripts/brand.mjs. */
export const SPLASH_MS = 1600;
export const REDUCED_HOLD_MS = 600;
export const SLOW_HINT_MS = 5000;
export const SLOW_RETRY_MS = 12000;
export const FLAG = 'smith.splash';

interface Options { el: HTMLElement | null; app: HTMLElement | null; reduced: boolean }

const TEXT = {
  pl: { slow: 'Wczytywanie trwa dłużej niż zwykle…', retry: 'Spróbuj ponownie' },
  en: { slow: 'Loading is taking longer than usual…', retry: 'Try again' },
};

export function createSplash({ el, app, reduced }: Options): Splash {
  let state: SplashState = 'playing';
  let resolveFinished!: () => void;
  const finished = new Promise<void>(r => { resolveFinished = r; });
  const wake = () => app?.removeAttribute('inert');
  const skip = typeof document !== 'undefined' && document.documentElement.dataset.splash === 'skip';
  if (!el || skip) {
    el?.remove(); wake(); state = 'done'; resolveFinished();
    return { get state() { return state; }, settle() { /* nothing to wait for */ }, finished };
  }

  // 1. the animation
  const animationDone = new Promise<void>(resolve => {
    let over = false;
    const fin = () => { if (!over) { over = true; clearInterval(watchdog); document.removeEventListener('visibilitychange', onVis); resolve(); } };
    if (reduced) { setTimeout(fin, REDUCED_HOLD_MS); }
    const end = el.querySelector('.sp-end') as HTMLElement | null;
    if (!end) setTimeout(fin, SPLASH_MS);
    end?.addEventListener('animationend', fin);
    // the animation may have ended before this code ran (a slow bundle): ask it, do not wait for an event that already fired
    const anim = !reduced && typeof end?.getAnimations === 'function' ? end.getAnimations()[0] : undefined;
    anim?.finished.then(fin, () => { /* cancelled: the watchdog decides */ });
    // pausing while the page is hidden; the watchdog counts only visible time, so a stuck animation cannot hold the screen forever
    const onVis = () => el.classList.toggle('paused', document.hidden);
    document.addEventListener('visibilitychange', onVis); onVis();
    let seen = 0;
    const watchdog = setInterval(() => { if (!document.hidden) seen += 250; if (seen >= SPLASH_MS + 2500) fin(); }, 250);
  });

  // 2. the app
  let settle!: (o: SplashOutcome) => void;
  const appDone = new Promise<SplashOutcome>(r => { settle = r; });

  // 3. both
  let slow1: ReturnType<typeof setTimeout> | undefined, slow2: ReturnType<typeof setTimeout> | undefined;
  void animationDone.then(() => {
    if (state !== 'playing') return;
    state = 'waiting';
    const hint = el.querySelector('.sp-hint') as HTMLElement | null;
    if (!hint) return;
    const tx = TEXT[document.documentElement.lang === 'en' ? 'en' : 'pl'];
    slow1 = setTimeout(() => { hint.textContent = tx.slow; hint.hidden = false; }, SLOW_HINT_MS);
    slow2 = setTimeout(() => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'sp-retry'; b.textContent = tx.retry;
      b.onclick = () => location.reload(); hint.append(b);
    }, SLOW_RETRY_MS);
  });
  void Promise.all([animationDone, appDone]).then(() => {
    clearTimeout(slow1); clearTimeout(slow2);
    state = 'leaving';
    wake();
    el.classList.add('out');
    let gone = false;
    const remove = () => { if (gone) return; gone = true; el.remove(); try { sessionStorage.setItem(FLAG, 'played'); } catch { /* storage blocked: it just plays again next time */ } state = 'done'; resolveFinished(); };
    el.addEventListener('transitionend', remove);
    setTimeout(remove, reduced ? 160 : 420);
  });
  return { get state() { return state; }, settle, finished };
}

export function startSplash(): Splash {
  return createSplash({
    el: document.getElementById('splash'), app: document.getElementById('app'),
    reduced: (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) || document.documentElement.dataset.motion === 'reduce',
  });
}
