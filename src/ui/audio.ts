/* Sound cues of the player (off by default, More > Sound cue). The same idea as the Repsmith rest timer: the last 5 seconds are counted
   with short tones that rise gently in pitch and volume, then a soft two-note chime marks the end. Web Audio only, no files. */
let ctx: AudioContext | null = null;
/** Browsers start audio only after a user gesture: called on every tap. */
export function unlockAudio(): void {
  try {
    if (!ctx) { const A = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!A) return; ctx = new A(); }
    if (ctx.state !== 'running') void ctx.resume();
  } catch { /* no audio on this device */ }
}
function tone(freq: number, start: number, dur: number, vol: number): void {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = freq; o.connect(g); g.connect(ctx.destination);
  const t0 = ctx.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.start(t0); o.stop(t0 + dur + 0.03);
}
/** sec = 5..1: pitch 523 Hz -> 784 Hz and volume 0.10 -> 0.32, a little longer each time. */
export function countdownTick(sec: number): void {
  try { unlockAudio(); const k = Math.min(1, Math.max(0, (5 - sec) / 4)); tone(523 + (784 - 523) * k, 0, 0.11 + 0.05 * k, 0.1 + 0.22 * k); } catch { /* ignore */ }
}
export function endChime(): void { try { unlockAudio(); tone(880, 0, 0.2, 0.34); tone(1175, 0.2, 0.38, 0.4); } catch { /* ignore */ } }
