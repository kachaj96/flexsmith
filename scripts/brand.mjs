// Flexsmith brand geometry: the single source for every logo asset (design/, favicon, launcher icons, in-app mark, start screen).
// Approved variant 2: a violet tile with a white, two-part "F" (an upper leaf and a lower body). The shapes come from the supplied
// flexsmith-symbol-white.svg (a traced outline), smoothed to clean cubic curves (IoU with the approved shape 0.989, tips kept sharp).
// The supplied tile has a 4 % margin and its own corner radius; the family tile (Runsmith, Repsmith) fills the 1024 canvas with a 22.4 % radius,
// so the glyph is mapped by the same transform: (x - cx) * K + 512, K = 1024 / 931. The relation glyph to tile is unchanged.
export const BRAND = {
  name: 'Flexsmith',
  tile: '#6C5AA2',          // the approved violet (variant 2)
  radius: 229,              // 22.4 % of the tile, as in Runsmith and Repsmith
  glyphColor: '#FFFFFF',
};
const K = 1024 / 931, CX = 507.66, CY = 511.13;
const mx = x => +((x - CX) * K + 512).toFixed(1), my = y => +((y - CY) * K + 512).toFixed(1);
/** Maps a path written in the source canvas (absolute M, L, C, Z only) onto the tile. */
const mapPath = d => d.replace(/(-?[\d.]+)[ ,](-?[\d.]+)/g, (_, x, y) => `${mx(+x)} ${my(+y)}`);
const mapW = w => +(w * K).toFixed(1);

// source space (the 1024 canvas of the supplied files)
const SRC_UPPER = 'M829.0 234.8C829.0 234.8 827.4 231.9 824.2 233.0C821.1 234.1 816.8 238.4 810.2 241.2C803.7 244.1 797.3 247.1 785.0 250.0C772.7 252.9 749.6 256.8 736.2 258.5C722.9 260.2 738.7 260.2 705.0 260.2C671.3 260.2 568.1 258.2 534.0 258.5C499.9 258.8 514.5 259.5 500.2 262.0C486.0 264.5 464.1 269.0 448.8 273.8C433.4 278.5 423.0 282.5 408.2 290.5C393.5 298.5 373.0 311.8 360.0 322.0C347.0 332.2 338.8 342.0 330.5 351.5C322.2 361.0 318.0 365.2 310.0 379.0C302.0 392.8 289.7 416.5 282.5 434.5C275.3 452.5 270.1 474.2 267.0 487.0C263.9 499.8 263.8 511.5 263.8 511.5C263.8 511.5 259.7 518.4 266.5 512.0C273.3 505.6 291.6 484.2 304.8 473.0C317.9 461.8 334.0 451.7 345.5 444.5C357.0 437.3 361.6 435.0 373.8 430.0C385.9 425.0 406.4 417.9 418.2 414.2C430.1 410.6 433.0 410.0 444.8 408.0C456.5 406.0 450.2 403.1 488.8 402.5C527.2 401.9 637.4 405.4 675.8 404.2C714.1 403.1 706.1 399.7 719.0 395.8C731.9 391.8 742.2 387.0 753.0 380.8C763.8 374.5 776.5 364.2 783.8 358.0C791.0 351.8 791.5 350.7 796.5 343.2C801.5 335.8 809.7 321.8 814.0 313.2C818.3 304.8 820.0 299.5 822.2 292.2C824.5 285.0 826.1 279.3 827.2 269.8C828.4 260.2 829.0 234.8 829.0 234.8Z';
const SRC_LOWER = 'M703.5 482.2C702.8 479.5 705.1 479.2 698.8 479.2C692.4 479.2 710.1 481.8 665.2 482.2C620.4 482.8 474.4 481.4 429.8 482.2C385.1 483.1 406.7 485.5 397.5 487.5C388.3 489.5 385.8 489.7 374.8 494.5C363.7 499.3 343.8 508.4 331.0 516.2C318.2 524.1 306.8 534.1 298.2 541.8C289.7 549.4 285.5 554.7 279.5 562.0C273.5 569.3 268.2 576.3 262.5 585.8C256.8 595.2 251.0 603.3 245.0 618.5C239.0 633.7 233.5 649.1 226.2 677.0C219.0 704.9 205.6 766.0 201.8 785.8C197.9 805.5 201.2 792.8 203.2 795.5C205.3 798.2 201.2 800.7 214.0 801.8C226.8 802.8 265.8 802.1 279.8 801.8C293.7 801.4 291.8 801.2 297.8 799.5C303.8 797.8 310.8 794.6 315.8 791.2C320.8 787.9 324.6 783.2 327.8 779.2C330.9 775.2 329.8 782.5 334.5 767.2C339.2 752.0 350.5 705.2 355.8 687.8C361.0 670.3 363.2 668.8 366.2 662.8C369.3 656.7 369.7 656.4 374.0 651.5C378.3 646.6 385.2 638.5 392.2 633.2C399.3 628.0 409.7 622.6 416.2 619.8C422.8 616.9 406.3 616.7 431.8 616.0C457.2 615.3 540.3 617.0 568.8 615.8C597.2 614.5 591.0 612.1 602.2 608.2C613.5 604.4 627.2 597.7 636.0 592.8C644.8 587.8 649.2 583.7 655.0 578.8C660.8 573.8 665.8 568.5 670.5 563.0C675.2 557.5 678.3 554.3 683.0 545.8C687.7 537.2 695.4 519.8 698.8 511.5C702.1 503.2 702.2 500.9 703.0 496.0C703.8 491.1 704.2 485.0 703.5 482.2Z';

/** The two white parts, in the order they appear on the start screen: the lower body, then the upper leaf. */
export const PARTS = [
  { id: 'lower', kind: 'fill', d: mapPath(SRC_LOWER) },
  { id: 'upper', kind: 'fill', d: mapPath(SRC_UPPER) },
];
/** Bounding box of the symbol on the tile (x0, y0, x1, y1). */
export const BBOX = [mx(201), my(231), mx(830), my(802)];

export const partMarkup = (p, color = BRAND.glyphColor, extra = '') => `<path ${extra}fill="${color}" d="${p.d}"/>`;
export const glyphMarkup = (color = BRAND.glyphColor) => PARTS.map(p => partMarkup(p, color)).join('');

/** The glyph fitted into the adaptive-icon safe zone: its bounding circle gets the given diameter (fraction of the 108 dp canvas), centred. */
export function safeGlyph(color = BRAND.glyphColor, diameter = 0.6) {
  const w = BBOX[2] - BBOX[0], h = BBOX[3] - BBOX[1], diag = Math.hypot(w, h);
  const s = (1024 * diameter) / diag;
  const cx = (BBOX[0] + BBOX[2]) / 2, cy = (BBOX[1] + BBOX[3]) / 2;
  return `<g transform="translate(512 512) scale(${+s.toFixed(4)}) translate(${-+cx.toFixed(1)} ${-+cy.toFixed(1)})">${glyphMarkup(color)}</g>`;
}

const open = (extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"${extra}>`;
export const svgs = {
  logo: () => `${open(' role="img" aria-label="Flexsmith"')}<rect width="1024" height="1024" rx="${BRAND.radius}" fill="${BRAND.tile}"/>${glyphMarkup()}</svg>\n`,
  glyph: () => `${open()}${glyphMarkup()}</svg>\n`,
  mono: () => `${open()}${glyphMarkup('#000000')}</svg>\n`,
  mark: () => `${open()}${glyphMarkup(BRAND.tile)}</svg>\n`,
  foreground: () => `${open()}${safeGlyph()}</svg>\n`,
  monochrome: () => `${open()}${safeGlyph('#000000')}</svg>\n`,
  background: () => `${open()}<rect width="1024" height="1024" fill="${BRAND.tile}"/></svg>\n`,
  round: () => `${open()}<circle cx="512" cy="512" r="512" fill="${BRAND.tile}"/>${safeGlyph(BRAND.glyphColor, 0.62)}</svg>\n`,
  /** Web app maskable icon: a full-bleed tile, the symbol inside the safe area. */
  maskable: () => `${open()}<rect width="1024" height="1024" fill="${BRAND.tile}"/>${safeGlyph(BRAND.glyphColor, 0.72)}</svg>\n`,
};

/* ---- Start screen: the same timeline as Runsmith and Repsmith (docs/MOTION.md). Each part is revealed by a thick stroke drawn along its own
   shape: the lower body from its foot up and along the arm, then the upper leaf from its left tip along the curve to the right tip. ---- */
const REVEAL = {
  lower: [{ d: mapPath('M268 850L286 700C306 598 362 549 452 549L742 549'), w: mapW(200), delay: 300, dur: 440 }],
  upper: [{ d: mapPath('M246 560C270 430 352 334 524 332L704 332C766 330 812 300 856 214'), w: mapW(230), delay: 620, dur: 420 }],
};
export const TIMELINE = { tile: 420, symbolStart: 300, symbolEnd: 1040, wordmark: [940, 300], holdUntil: 1600, fade: 260 };

export function splashSvg() {
  const masks = PARTS.map(p => `<mask id="sp-m-${p.id}" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">${REVEAL[p.id].map(v =>
    `<path class="sp-rv" pathLength="1" fill="none" stroke="#fff" stroke-width="${v.w}" style="--d:${v.delay}ms;--t:${v.dur}ms" d="${v.d}"/>`).join('')}</mask>`).join('');
  const body = PARTS.map(p => `<g mask="url(#sp-m-${p.id})">${partMarkup(p)}</g>`).join('');
  return `<svg class="sp-tile" viewBox="0 0 1024 1024" aria-hidden="true" focusable="false"><defs>${masks}</defs><rect width="1024" height="1024" rx="${BRAND.radius}" fill="${BRAND.tile}"/>${body}</svg>`;
}
