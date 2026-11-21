// BRACKENHOLT — a travel poster for a forest where the mushrooms grow
// taller than the houses, and the best inn in the holt is a single cap.
// Painted pixel by pixel in one file: dusk gradient, giant spotted caps,
// a mushroom inn with a round door and glowing windows, a winding path,
// drifting spores and falling leaves.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const FW = 768;
const FH = 1024;
const frame = new Uint8Array(FW * FH * 3);

let rs = 1357911;
function rnd() {
  rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0;
  return rs / 4294967296;
}
function col(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function mixc(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function px2(x, y, c, a) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= FW || y >= FH) return;
  const i = (y * FW + x) * 3;
  frame[i] = frame[i] * (1 - a) + c[0] * a;
  frame[i + 1] = frame[i + 1] * (1 - a) + c[1] * a;
  frame[i + 2] = frame[i + 2] * (1 - a) + c[2] * a;
}
function backdrop(stops) {
  for (let y = 0; y < FH; y++) {
    let s = 0;
    while (s < stops.length - 2 && y > stops[s + 1][0]) s++;
    const c = mixc(stops[s][1], stops[s + 1][1], Math.min(1, Math.max(0, (y - stops[s][0]) / (stops[s + 1][0] - stops[s][0]))));
    for (let x = 0; x < FW; x++) {
      const i = (y * FW + x) * 3;
      frame[i] = c[0]; frame[i + 1] = c[1]; frame[i + 2] = c[2];
    }
  }
}
function ball(cx, cy, r, c, a) {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) {
    const half = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
    for (let x = Math.floor(cx - half); x <= cx + half; x++) px2(x, y, c, a);
  }
}
function oval2(cx, cy, rx, ry, c, a) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
    const t = (y - cy) / ry;
    const half = rx * Math.sqrt(Math.max(0, 1 - t * t));
    for (let x = Math.floor(cx - half); x <= cx + half; x++) px2(x, y, c, a);
  }
}
function soft2(cx, cy, rx, ry, c, a) {
  for (let k = 5; k >= 1; k--) oval2(cx, cy, (rx * k) / 5, (ry * k) / 5, c, a / 3);
}
function poly2(pts, c, a) {
  let lo = Infinity, hi = -Infinity;
  for (const p of pts) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }
  for (let y = Math.floor(lo); y <= hi; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      if ((p[1] <= y && q[1] > y) || (q[1] <= y && p[1] > y)) xs.push(p[0] + ((y - p[1]) / (q[1] - p[1])) * (q[0] - p[0]));
    }
    xs.sort((m, n) => m - n);
    for (let i = 0; i + 1 < xs.length; i += 2)
      for (let x = Math.floor(xs[i]); x <= xs[i + 1]; x++) px2(x, y, c, a);
  }
}
function line2(x0, y0, x1, y1, w, c, a) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.ceil(d / (w * 0.3)));
  for (let i = 0; i <= n; i++) ball(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, w / 2, c, a);
}
function rect2(x, y, w, h, c, a) {
  for (let j = Math.floor(y); j < y + h; j++)
    for (let i = Math.floor(x); i < x + w; i++) px2(i, j, c, a);
}

// Hand-set stroke letters on a 4x6 grid.
const GLYPH = {
  A: [[[0, 6], [2, 0], [4, 6]], [[1.1, 4.1], [2.9, 4.1]]],
  B: [[[0, 0], [0, 6]], [[0, 0], [2.6, 0], [3.7, 1], [2.6, 2.1], [0, 2.1]], [[0, 2.1], [2.9, 2.1], [3.9, 3.6], [2.9, 6], [0, 6]]],
  C: [[[4, 1.4], [2.7, 0.1], [0.9, 0.7], [0, 3], [0.9, 5.3], [2.7, 5.9], [4, 4.6]]],
  D: [[[0, 0], [0, 6]], [[0, 0], [2.4, 0], [4, 1.9], [4, 4.1], [2.4, 6], [0, 6]]],
  E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3.1, 3]]],
  F: [[[4, 0], [0, 0], [0, 6]], [[0, 3], [3.1, 3]]],
  G: [[[4, 1.4], [2.7, 0.1], [0.9, 0.7], [0, 3], [0.9, 5.3], [2.7, 5.9], [4, 5.9], [4, 3.7], [2.5, 3.7]]],
  H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  I: [[[2, 0], [2, 6]], [[0.6, 0], [3.4, 0]], [[0.6, 6], [3.4, 6]]],
  J: [[[4, 0], [4, 4.5], [3.1, 5.8], [1.3, 6], [0.3, 4.9]]],
  K: [[[0, 0], [0, 6]], [[4, 0], [0.7, 3.1]], [[1.3, 2.5], [4, 6]]],
  L: [[[0, 0], [0, 6], [4, 6]]],
  M: [[[0, 6], [0, 0], [2, 3.4], [4, 0], [4, 6]]],
  N: [[[0, 6], [0, 0], [4, 6], [4, 0]]],
  O: [[[2, 0], [3.6, 0.7], [4, 3], [3.6, 5.3], [2, 6], [0.4, 5.3], [0, 3], [0.4, 0.7], [2, 0]]],
  P: [[[0, 6], [0, 0], [3, 0], [4, 1.1], [3, 2.5], [0, 2.5]]],
  Q: [[[2, 0], [3.6, 0.7], [4, 3], [3.6, 5.3], [2, 6], [0.4, 5.3], [0, 3], [0.4, 0.7], [2, 0]], [[2.7, 4.3], [4.3, 6.3]]],
  R: [[[0, 6], [0, 0], [3, 0], [4, 1.1], [3, 2.5], [0, 2.5]], [[2.1, 2.5], [4, 6]]],
  S: [[[4, 0.9], [2.7, 0], [0.9, 0.6], [0.5, 1.9], [2, 2.9], [3.4, 3.7], [3.6, 5], [2.4, 6], [0.3, 5.3]]],
  T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
  U: [[[0, 0], [0, 4.3], [0.8, 5.6], [2, 6], [3.2, 5.6], [4, 4.3], [4, 0]]],
  V: [[[0, 0], [2, 6], [4, 0]]],
  W: [[[0, 0], [0.8, 6], [2, 2.7], [3.2, 6], [4, 0]]],
  X: [[[0, 0], [4, 6]], [[4, 0], [0, 6]]],
  Y: [[[0, 0], [2, 2.8], [4, 0]], [[2, 2.8], [2, 6]]],
  Z: [[[0, 0], [4, 0], [0, 6], [4, 6]]],
  " ": [],
};
function name(text, cx, y, size, c, a, track) {
  const s = size / 6;
  const w = Math.max(2.4, size * 0.17);
  let x = cx - (text.length * 5 * s + (text.length - 1) * track * s) / 2;
  for (const ch of text.toUpperCase()) {
    for (const st of GLYPH[ch] || [])
      for (let i = 0; i + 1 < st.length; i++)
        line2(x + st[i][0] * s, y + st[i][1] * s, x + st[i + 1][0] * s, y + st[i + 1][1] * s, w, c, a);
    x += 5 * s + track * s;
  }
}

// ---- The scene: last light in the holt, the inn under its cap ----
backdrop([
  [0, col("#2c1e3f")],
  [240, col("#6e3350")],
  [470, col("#c65b3a")],
  [640, col("#e88a4a")],
  [800, col("#8a5a34")],
  [1024, col("#3d2a1a")],
]);

// Low sun through the trees, a warm disc on the horizon line.
soft2(150, 620, 170, 170, col("#ffb35c"), 0.4);
ball(150, 620, 58, col("#ffd98a"), 0.95);

// Distant tree trunks, tall dark pillars fading into the dusk.
for (let i = 0; i < 12; i++) {
  const x = 30 + i * 64 + rnd() * 22;
  const w = 9 + rnd() * 10;
  rect2(x, 180 + rnd() * 60, w, 560, col("#241631"), 0.55);
}
// Far mushroom silhouettes among the trunks.
function farShroom(cx, baseY, s, c) {
  rect2(cx - s * 0.09, baseY - s * 0.9, s * 0.18, s * 0.9, c, 0.8);
  oval2(cx, baseY - s * 0.95, s * 0.62, s * 0.3, c, 0.8);
}
farShroom(268, 700, 120, col("#3a2040"));
farShroom(620, 716, 150, col("#331c38"));
farShroom(66, 724, 84, col("#3a2040"));

// Forest floor.
poly2([[0, 742], [768, 726], [768, 1024], [0, 1024]], col("#4a3220"), 1);
poly2([[0, 742], [768, 726], [768, 800], [0, 822]], col("#5d4026"), 0.7);

// One giant mushroom, stem and cap, with a round door and windows cut
// into the stem: the inn itself.
const IX = 430, IBASE = 872;
// Stem: a gently tapering trunk of cream, shaded on its right side.
poly2([[IX - 96, IBASE], [IX - 62, 560], [IX + 62, 560], [IX + 100, IBASE]], col("#e8d3ac"), 1);
poly2([[IX + 18, IBASE], [IX + 34, 560], [IX + 62, 560], [IX + 100, IBASE]], col("#d9bd8d"), 0.65);
// Gill shadow under the cap.
oval2(IX, 566, 196, 34, col("#8a5a34"), 1);
// The cap: a broad red-orange dome with cream spots.
{
  const capC = col("#c1442e");
  for (let y = 380; y <= 566; y++) {
    const t = (y - 380) / 186;
    const half = 216 * Math.sin(Math.acos(1 - t * 1.06)) * 1.02;
    if (!isFinite(half)) continue;
    const c = mixc(capC, col("#e2703a"), t * 0.7);
    for (let x = Math.floor(IX - half); x <= IX + half; x++) px2(x, y, c, 1);
  }
  oval2(IX, 560, 216, 26, col("#a83a26"), 1); // cap rim
  for (const [sx, sy, sr] of [[-120, 448, 17], [-38, 416, 12], [66, 438, 15], [130, 486, 11], [-168, 500, 10], [10, 486, 9], [-84, 512, 8]]) {
    oval2(IX + sx, sy, sr, sr * 0.62, col("#f7e3bb"), 0.92);
  }
}
// Round door, arched, with a lantern beside it and a step stone.
{
  // door body: rectangle with a semicircular top
  rect2(IX - 33, 776, 66, IBASE - 776, col("#7a4a26"), 1);
  ball(IX, 776, 33, col("#7a4a26"), 1);
  rect2(IX - 33, 776, 66, 6, col("#5d3820"), 1);
  ball(IX + 16, 826, 4.6, col("#ffca66"), 1); // knob glow
  line2(IX - 66, 800, IX - 66, 762, 3.4, col("#4c2d24"), 1);
  soft2(IX - 66, 754, 16, 16, col("#ffca66"), 0.8);
  ball(IX - 66, 754, 5, col("#fff3d0"), 1);
  oval2(IX, IBASE + 4, 62, 10, col("#6e5136"), 0.9); // step stone shadow
}
// Round windows up the stem, all lamplit.
for (const [wx, wy, wr] of [[-52, 640, 13], [44, 668, 11], [-30, 706, 10], [58, 606, 9]]) {
  ball(IX + wx, wy, wr + 3, col("#7a4a26"), 1);
  ball(IX + wx, wy, wr, col("#ffca66"), 1);
  ball(IX + wx - wr * 0.3, wy - wr * 0.3, wr * 0.36, col("#fff3d0"), 0.9);
}
// A chimney on the cap with a curl of smoke.
rect2(IX + 118, 372, 17, 44, col("#8a6a4a"), 1);
for (let i = 0; i < 5; i++) soft2(IX + 128 + i * 9, 356 - i * 17, 13 + i * 4, 9 + i * 2.4, col("#e8ddcf"), 0.20);

// Neighbour mushrooms, smaller, flanking the inn.
function shroom(cx, baseY, s, capC) {
  poly2([[cx - s * 0.16, baseY], [cx - s * 0.11, baseY - s * 0.78], [cx + s * 0.11, baseY - s * 0.78], [cx + s * 0.16, baseY]], col("#e0c69c"), 1);
  oval2(cx, baseY - s * 0.82, s * 0.58, s * 0.26, capC, 1);
  oval2(cx - s * 0.2, baseY - s * 0.9, s * 0.1, s * 0.06, col("#f7e3bb"), 0.9);
  oval2(cx + s * 0.24, baseY - s * 0.84, s * 0.08, s * 0.05, col("#f7e3bb"), 0.9);
  ball(cx, baseY - s * 0.3, s * 0.05, col("#ffca66"), 0.95);
}
shroom(148, 884, 150, col("#b85c30"));
shroom(648, 896, 118, col("#a83e32"));
shroom(246, 906, 74, col("#c65b3a"));
shroom(716, 806, 66, col("#96402c"));

// The path: pale stones winding from the door to the viewer.
for (let i = 0; i < 9; i++) {
  const t = i / 9;
  const y = 884 + t * 128;
  const x = IX - 6 + Math.sin(t * 2.6) * 44 * t + (rnd() - 0.5) * 16;
  oval2(x, y, 16 + t * 22, 6 + t * 6, col("#9c8464"), 0.9);
  oval2(x - 3, y - 2, 11 + t * 15, 4 + t * 4, col("#b89a72"), 0.8);
}

// Fireflies and drifting spores in the warm air.
for (let i = 0; i < 60; i++) {
  const x = rnd() * FW, y = 480 + rnd() * 440;
  soft2(x, y, 7, 7, col("#ffca66"), 0.5);
  ball(x, y, 1.7, col("#fff3d0"), 0.95);
}
for (let i = 0; i < 40; i++) {
  ball(rnd() * FW, 300 + rnd() * 500, 1.4, col("#f7e3bb"), 0.4);
}
// Falling leaves, small orange commas.
for (let i = 0; i < 22; i++) {
  const x = rnd() * FW, y = 200 + rnd() * 560;
  const c = [col("#e2703a"), col("#d98a3a"), col("#c1442e")][i % 3];
  oval2(x, y, 6.4, 3.4, c, 0.85);
  line2(x, y, x + 7, y - 4, 1.6, c, 0.7);
}

// The name in the darkening sky, cream letters with a bark-brown shadow.
name("BRACKENHOLT", FW / 2 + 3, 74, 58, col("#1d1026"), 0.6, 0.3);
name("BRACKENHOLT", FW / 2, 70, 58, col("#fdf0d0"), 1, 0.3);

// ---- PNG: Paeth rows, packed by this file's own encoder ----
const CT = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CT[n] = c >>> 0;
}
function crcB(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CT[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunkB(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crcB(body));
  return Buffer.concat([len, body, sum]);
}
function paethB(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}
function encodeB() {
  const stride = FW * 3;
  const raw = Buffer.alloc((stride + 1) * FH);
  for (let y = 0; y < FH; y++) {
    const row = y * (stride + 1);
    raw[row] = 4;
    for (let i = 0; i < stride; i++) {
      const cur = frame[y * stride + i];
      const a = i >= 3 ? frame[y * stride + i - 3] : 0;
      const b = y > 0 ? frame[(y - 1) * stride + i] : 0;
      const c = y > 0 && i >= 3 ? frame[(y - 1) * stride + i - 3] : 0;
      raw[row + 1 + i] = (cur - paethB(a, b, c)) & 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(FW, 0);
  ihdr.writeUInt32BE(FH, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunkB("IHDR", ihdr),
    chunkB("IDAT", deflateSync(raw, { level: 9 })),
    chunkB("IEND", Buffer.alloc(0)),
  ]);
}
const destB = process.env.ENTRY_OUT || "/output/entry.png";
try { mkdirSync(destB.slice(0, destB.lastIndexOf("/")), { recursive: true }); } catch { /* provided */ }
writeFileSync(destB, encodeB());
console.log("BRACKENHOLT poster written to", destB);
