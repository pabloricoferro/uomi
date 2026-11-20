/* Build UOMI.otf from the hand-drawn alphabet SVGs in Designs/Alfabeto.
   - Stroked glyphs (centerline paths, stroke 10, round caps/joins) are expanded
     into outlines: every segment becomes a quad and every joint/end a circle, all
     wound the same direction, so the non-zero fill rule unions them.
   - Already-filled glyphs (traced outlines) are used as they are.
   - Digits, punctuation and accents are not in the source files: they are drawn
     here with the same stroke. */
const fs = require("fs");
const path = require("path");
const opentype = require("opentype.js");
const polygonClipping = require("polygon-clipping");

const SRC = path.join(__dirname, "..", "Alfabeto") + path.sep;   // folder with the three alphabet SVGs
const OUT = process.argv[2];

const K = 7;          // font units per design unit (cap height = 100 units -> 700 fu)
const BASE = 100;     // design y that sits on the baseline (outer bottom of the strokes)
const R = 5;          // stroke radius (stroke-width 10)
const SB = 5;         // side bearing in design units
const UPM = 1000;

/* ───────── path parsing ───────── */
function tokenize(d) {
  return d.match(/[MmLlHhVvCcSsQqTtZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
}

/* returns list of subpaths: {pts:[[x,y]...], closed:bool}; curves are flattened */
function flatten(d) {
  const t = tokenize(d);
  let i = 0, cmd = "", x = 0, y = 0, sx = 0, sy = 0;
  const subs = [];
  let cur = null;
  const num = () => parseFloat(t[i++]);
  const start = (nx, ny) => { cur = { pts: [[nx, ny]], closed: false }; subs.push(cur); sx = nx; sy = ny; };
  while (i < t.length) {
    if (/[A-Za-z]/.test(t[i])) cmd = t[i++];
    switch (cmd) {
      case "M": { x = num(); y = num(); start(x, y); cmd = "L"; break; }
      case "L": { x = num(); y = num(); cur.pts.push([x, y]); break; }
      case "H": { x = num(); cur.pts.push([x, y]); break; }
      case "V": { y = num(); cur.pts.push([x, y]); break; }
      case "C": {
        const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x3 = num(), y3 = num();
        const len = Math.hypot(x1 - x, y1 - y) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2);
        const n = Math.max(4, Math.min(28, Math.ceil(len / 3.2)));
        for (let s = 1; s <= n; s++) {
          const u = s / n, v = 1 - u;
          cur.pts.push([
            v * v * v * x + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x3,
            v * v * v * y + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y3]);
        }
        x = x3; y = y3; break;
      }
      case "Q": {
        const x1 = num(), y1 = num(), x2 = num(), y2 = num();
        const len = Math.hypot(x1 - x, y1 - y) + Math.hypot(x2 - x1, y2 - y1);
        const n = Math.max(4, Math.min(20, Math.ceil(len / 3.2)));
        for (let s = 1; s <= n; s++) {
          const u = s / n, v = 1 - u;
          cur.pts.push([v * v * x + 2 * v * u * x1 + u * u * x2, v * v * y + 2 * v * u * y1 + u * u * y2]);
        }
        x = x2; y = y2; break;
      }
      case "Z": case "z": { cur.closed = true; x = sx; y = sy; cmd = ""; break; }
      default: throw new Error("unsupported command " + cmd + " in " + d.slice(0, 60));
    }
  }
  return subs;
}

/* ───────── glyph model ─────────
   glyph = { strokes: [ {pts, closed} | {dot:[x,y]} ], fills: [ [[x,y]...] ] }  (design coords, y down) */
function strokesFromD(d) { return flatten(d).map(s => ({ pts: s.pts, closed: s.closed })); }
function fillsFromD(d) { return flatten(d).map(s => s.pts); }

function ell(cx, cy, rx, ry) {
  const k = 0.5523;
  return `M${cx + rx} ${cy} C${cx + rx} ${cy + k * ry} ${cx + k * rx} ${cy + ry} ${cx} ${cy + ry} ` +
         `C${cx - k * rx} ${cy + ry} ${cx - rx} ${cy + k * ry} ${cx - rx} ${cy} ` +
         `C${cx - rx} ${cy - k * ry} ${cx - k * rx} ${cy - ry} ${cx} ${cy - ry} ` +
         `C${cx + k * rx} ${cy - ry} ${cx + rx} ${cy - k * ry} ${cx + rx} ${cy} Z`;
}

function glyphFromDs(ds, dots) {
  const g = { strokes: [], fills: [] };
  (ds || []).forEach(d => strokesFromD(d).forEach(s => g.strokes.push(s)));
  (dots || []).forEach(p => g.strokes.push({ dot: p }));
  return g;
}

/* rotate a glyph 180° around (cx, 50) */
function rot180(g, cx) {
  const f = p => [2 * cx - p[0], 100 - p[1]];
  return {
    strokes: g.strokes.map(s => s.dot ? { dot: f(s.dot) } : { pts: s.pts.map(f), closed: s.closed }),
    fills: g.fills.map(c => c.map(f))
  };
}

const glyphs = {};   // char -> glyph

/* ───────── read the provided alphabet ───────── */
const NAMES = { "N-tilde-mayuscula": "Ñ", "n-tilde-minuscula": "ñ" };
for (const file of ["UOMI_mayusculas.svg", "UOMI_minusculas.svg", "UOMI_enne.svg"]) {
  const s = fs.readFileSync(SRC + file, "utf8");
  const re = /<g id="([^"]+)" transform="translate\(([\d.\-]+),([\d.\-]+)\)">([\s\S]*?)<\/g>(?:<\/g>)?(?=<g id=|<metadata|<\/svg>|$)/g;
  let m;
  while ((m = re.exec(s))) {
    const id = m[1], body = m[4];
    const ch = NAMES[id] || id;
    if ([...ch].length !== 1) throw new Error("bad glyph id " + id);
    const g = { strokes: [], fills: [] };
    // stroked paths live inside <g fill="none" stroke=...>, filled ones are bare <path fill="#111">
    const pathRe = /<path d="([^"]+)"([^>]*)\/>/g;
    let p;
    while ((p = pathRe.exec(body))) {
      if (/fill="#111"/.test(p[2])) fillsFromD(p[1]).forEach(c => g.fills.push(c));
      else strokesFromD(p[1]).forEach(sp => g.strokes.push(sp));
    }
    glyphs[ch] = g;
  }
}

/* ───────── bounding box of a glyph (outer, design units) ───────── */
function bbox(g) {
  let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  const add = (x, y, r) => { minx = Math.min(minx, x - r); maxx = Math.max(maxx, x + r); miny = Math.min(miny, y - r); maxy = Math.max(maxy, y + r); };
  g.strokes.forEach(s => (s.dot ? [s.dot] : s.pts).forEach(p => add(p[0], p[1], R)));
  g.fills.forEach(c => c.forEach(p => add(p[0], p[1], 0)));
  return { minx, maxx, miny, maxy };
}

/* ───────── missing glyphs: digits, punctuation, accents ───────── */
const D = glyphFromDs;
glyphs["0"] = D(["M24 5 C36 5 42 28 42 50 C42 72 36 95 24 95 C12 95 6 72 6 50 C6 28 12 5 24 5 Z"]);
glyphs["1"] = D(["M9 26 L26 7 L26 95"]);
glyphs["2"] = D(["M7 28 C8 12 18 5 26 5 C38 5 44 15 43 28 C42 44 20 68 6 94 L45 95"]);
glyphs["3"] = D(["M8 14 C14 7 22 5 28 5 C40 6 43 22 34 34 C30 40 22 43 18 45 C30 44 44 52 44 70 C44 86 34 96 24 95 C16 95 10 91 6 84"]);
glyphs["4"] = D(["M38 95 L38 5 L5 70 L47 70"]);
glyphs["5"] = D(["M42 6 L12 6 L8 46 C14 42 22 40 28 41 C40 43 45 56 44 70 C43 86 34 96 24 95 C16 95 10 91 6 84"]);
glyphs["6"] = D(["M40 14 C34 7 28 5 23 5 C12 8 6 28 6 56 C6 90 14 95 25 95 C38 95 44 84 44 72 C44 60 36 50 25 50 C14 50 7 60 6 72"]);
glyphs["7"] = D(["M5 6 L45 6 C36 38 28 66 24 95"]);
glyphs["8"] = D([ell(25, 28, 15, 23), ell(25, 72, 19, 23)]);
glyphs["9"] = rot180(glyphs["6"], 25);

glyphs["."] = D([], [[5, 95]]);
glyphs[","] = D(["M5 95 C5 104 3 110 -3 114"]);
glyphs[":"] = D([], [[5, 95], [5, 62]]);
glyphs[";"] = (() => { const g = D(["M5 95 C5 104 3 110 -3 114"], [[5, 62]]); return g; })();
glyphs["!"] = D(["M5 5 L5 68"], [[5, 95]]);
glyphs["?"] = D(["M6 22 C6 6 40 2 40 24 C40 40 22 46 22 66"], [[22, 95]]);
glyphs["¡"] = rot180(glyphs["!"], 5);
glyphs["¿"] = rot180(glyphs["?"], 22);
glyphs["'"] = D(["M5 5 L4 26"]);
glyphs["\""] = D(["M5 5 L4 26", "M19 5 L18 26"]);
glyphs["\u2018"] = D(["M7 5 L3 26"]);
glyphs["\u2019"] = D(["M7 5 L3 26"]);
glyphs["\u201C"] = D(["M7 5 L3 26", "M21 5 L17 26"]);
glyphs["\u201D"] = D(["M7 5 L3 26", "M21 5 L17 26"]);
glyphs["-"] = D(["M4 62 L28 62"]);
glyphs["\u2013"] = D(["M4 62 L40 62"]);
glyphs["\u2014"] = D(["M4 62 L62 62"]);
glyphs["("] = D(["M20 2 C4 30 4 72 20 102"]);
glyphs[")"] = D(["M4 2 C20 30 20 72 4 102"]);
glyphs["["] = D(["M18 5 L6 5 L6 95 L18 95"]);
glyphs["]"] = D(["M6 5 L18 5 L18 95 L6 95"]);
glyphs["/"] = D(["M30 3 L4 97"]);
glyphs["|"] = D(["M5 2 L5 108"]);
glyphs["_"] = D(["M2 108 L44 108"]);
glyphs["+"] = D(["M24 38 L24 80", "M4 59 L44 59"]);
glyphs["="] = D(["M5 48 L43 48", "M5 70 L43 70"]);
glyphs["%"] = D([ell(12, 18, 7, 9), ell(36, 82, 7, 9), "M38 6 L8 94"]);
glyphs["&"] = D(["M46 95 C28 76 8 58 8 38 C8 14 36 12 36 32 C36 52 6 62 6 78 C6 100 38 100 50 62"]);
glyphs["@"] = D([ell(36, 54, 11, 13), "M47 42 L47 66 C47 74 58 72 62 66 C68 58 72 52 72 46 C72 26 56 10 38 10 C19 10 4 29 4 52 C4 76 19 94 38 94 C48 94 56 92 62 88"]);
glyphs["\u20AC"] = D(["M42 18 C32 4 6 6 6 50 C6 94 32 96 42 82", "M0 40 L30 40", "M0 60 L30 60"]);
glyphs["\u00B7"] = D([], [[5, 58]]);
glyphs["\u00A9"] = D([ell(31, 52, 27, 40), "M40 42 C34 36 20 36 20 52 C20 68 34 68 40 62"]);
glyphs["\u00D7"] = D(["M6 40 L38 80", "M38 40 L6 80"]);
glyphs["\u2039"] = D(["M26 36 L8 58 L26 80"]);
glyphs["\u203A"] = D(["M8 36 L26 58 L8 80"]);
glyphs["\u00B0"] = D([ell(10, 16, 7, 7)]);
glyphs["\u2026"] = D([], [[5, 95], [25, 95], [45, 95]]);
glyphs["*"] = D(["M24 30 L24 66", "M8 39 L40 57", "M40 39 L8 57"]);
glyphs["~"] = D(["M4 62 C12 48 22 50 26 58 C32 68 40 66 46 52"]);
glyphs["<"] = D(["M36 40 L8 60 L36 80"]);
glyphs[">"] = D(["M8 40 L36 60 L8 80"]);

/* accents: a mark is added to a base glyph, centred over it */
function centreX(g) { const b = bbox(g); return (b.minx + b.maxx) / 2; }
function withMark(base, kind, upper) {
  const g = { strokes: base.strokes.slice(), fills: base.fills.slice() };
  const cx = centreX(base);
  const top = upper ? -6 : 30;      // lower end of the mark
  const h = 14;
  if (kind === "acute") g.strokes.push({ pts: [[cx - 3, top], [cx + 4, top - h]], closed: false });
  if (kind === "grave") g.strokes.push({ pts: [[cx - 4, top - h], [cx + 3, top]], closed: false });
  if (kind === "uml") {
    const y = upper ? -13 : 22;
    g.strokes.push({ dot: [cx - 6.5, y] }, { dot: [cx + 6.5, y] });
  }
  return g;
}
const ACC = { "\u00E1": ["a", "acute"], "\u00E9": ["e", "acute"], "\u00ED": ["i", "acute"], "\u00F3": ["o", "acute"], "\u00FA": ["u", "acute"], "\u00FC": ["u", "uml"],
              "\u00E0": ["a", "grave"], "\u00E8": ["e", "grave"], "\u00EC": ["i", "grave"], "\u00F2": ["o", "grave"], "\u00F9": ["u", "grave"],
              "\u00C1": ["A", "acute"], "\u00C9": ["E", "acute"], "\u00CD": ["I", "acute"], "\u00D3": ["O", "acute"], "\u00DA": ["U", "acute"], "\u00DC": ["U", "uml"],
              "\u00C0": ["A", "grave"], "\u00C8": ["E", "grave"], "\u00CC": ["I", "grave"], "\u00D2": ["O", "grave"], "\u00D9": ["U", "grave"] };
for (const [ch, [b, kind]] of Object.entries(ACC)) {
  let base = glyphs[b];
  if (b === "i") {
    // drop the dot (a tiny two-point stroke) and use the accent in its place
    base = { strokes: base.strokes.filter(s => !(s.pts && s.pts.length === 2 && Math.abs(s.pts[0][1] - s.pts[1][1]) < 3 && s.pts[0][1] < 30)), fills: base.fills };
  }
  glyphs[ch] = withMark(base, kind, b === b.toUpperCase());
}
/* the provided i/j dots are a 2-point stroke; make them real dots (same look, fewer shapes) */

/* ───────── outline generation (font units, y up) ───────── */
const fx = (x, minx) => Math.round((x - minx + SB) * K * 10) / 10;
const fy = y => Math.round((BASE - y) * K * 10) / 10;

function area(pts) { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
function inside(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}

/* Offset a polyline by r into clean outline contours (round joins and caps), like a
   real stroker: one contour per open stroke, outer + inner contour for closed ones. */
function normAngle(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
function arcPts(cx, cy, r, a0, delta) {          // points strictly between a0 and a0+delta
  const steps = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 18)));
  const o = [];
  for (let k = 1; k < steps; k++) { const t = a0 + delta * k / steps; o.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); }
  return o;
}
function dirs(pts, closed) {
  const n = pts.length, m = closed ? n : n - 1, d = [];
  for (let i = 0; i < m; i++) {
    const p = pts[i], q = pts[(i + 1) % n], len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    d.push([(q[0] - p[0]) / len, (q[1] - p[1]) / len]);
  }
  return d;
}
function sideOf(pts, closed, r) {
  const n = pts.length, d = dirs(pts, closed), out = [];
  const nl = i => [-d[i][1] * r, d[i][0] * r];
  if (!closed) out.push([pts[0][0] + nl(0)[0], pts[0][1] + nl(0)[1]]);
  const from = closed ? 0 : 1, to = closed ? n : n - 1;
  for (let i = from; i < to; i++) {
    const a = (i - 1 + d.length) % d.length, b = i % d.length;
    const na = nl(a), nb = nl(b), p = pts[i];
    const cross = d[a][0] * d[b][1] - d[a][1] * d[b][0];
    const dot = d[a][0] * d[b][0] + d[a][1] * d[b][1];
    if (cross < -1e-4 && dot < 0.99998) {                       // outer side: round join
      const a0 = Math.atan2(na[1], na[0]), delta = normAngle(Math.atan2(nb[1], nb[0]) - a0);
      out.push([p[0] + na[0], p[1] + na[1]]);
      arcPts(p[0], p[1], r, a0, delta).forEach(q => out.push(q));
      out.push([p[0] + nb[0], p[1] + nb[1]]);
    } else if (dot > 0.99998) {
      out.push([p[0] + nb[0], p[1] + nb[1]]);
    } else {                                                    // inner side
      if (dot > 0.8) {                                           // gentle turn: the offset lines meet at one point
        const k = 1 / (1 + dot);
        out.push([p[0] + (na[0] + nb[0]) * k, p[1] + (na[1] + nb[1]) * k]);
      } else {                                                   // sharp turn: go via the centre (no reverse-wound loop)
        out.push([p[0] + na[0], p[1] + na[1]], [p[0], p[1]], [p[0] + nb[0], p[1] + nb[1]]);
      }
    }
  }
  if (!closed) { const l = d.length - 1, e = pts[n - 1]; out.push([e[0] + nl(l)[0], e[1] + nl(l)[1]]); }
  return out;
}
function capAfter(pts, r) {                                      // clockwise half circle round the last point
  const d = dirs(pts, false), l = d.length - 1, e = pts[pts.length - 1];
  const a0 = Math.atan2(d[l][0], -d[l][1]);                      // angle of the left normal
  return arcPts(e[0], e[1], r, a0, -Math.PI);
}
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Array(pts.length).fill(false); keep[0] = keep[pts.length - 1] = true;
  (function rec(i, j) {
    let max = 0, idx = -1;
    const a = pts[i], b = pts[j], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    for (let k = i + 1; k < j; k++) {
      const d = Math.abs((pts[k][0] - a[0]) * dy - (pts[k][1] - a[1]) * dx) / L;
      if (d > max) { max = d; idx = k; }
    }
    if (max > tol) { keep[idx] = true; rec(i, idx); rec(idx, j); }
  })(0, pts.length - 1);
  return pts.filter((_, i) => keep[i]);
}
function outlineStroke(pts0, closed, r) {
  let pts = pts0.filter((p, i) => i === 0 || Math.hypot(p[0] - pts0[i - 1][0], p[1] - pts0[i - 1][1]) > 0.05);
  if (closed && pts.length > 1 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 0.05) pts.pop();
  if (pts.length < 2) return [];
  if (closed && pts.length > 8) {
    // a closed loop starts and ends at the same point, so split it at the farthest point first
    let m = 0, best = -1;
    pts.forEach((p, i) => { const d = Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]); if (d > best) { best = d; m = i; } });
    const part1 = simplify(pts.slice(0, m + 1), 0.25);
    const part2 = simplify(pts.slice(m).concat([pts[0]]), 0.25);
    pts = part1.concat(part2.slice(1, -1));
  } else if (!closed) {
    pts = simplify(pts, 0.25);
  }
  pts = pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 0.05);
  if (pts.length < 2) return [];
  const rev = pts.slice().reverse();
  if (!closed) {
    const c = sideOf(pts, false, r).concat(capAfter(pts, r), sideOf(rev, false, r), capAfter(rev, r));
    return [area(c) < 0 ? c.reverse() : c];
  }
  const A = sideOf(pts, true, r), B = sideOf(rev, true, r);
  const outer = Math.abs(area(A)) > Math.abs(area(B)) ? A : B, inner = outer === A ? B : A;
  return [area(outer) < 0 ? outer.reverse() : outer, area(inner) > 0 ? inner.reverse() : inner];
}

function circlePoly(cx, cy, r) {
  const n = 48, out = [];
  for (let i = 0; i < n; i++) { const t = 2 * Math.PI * i / n; out.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); }
  return out;                                   // counter-clockwise
}

/* Every part of the glyph as a polygon (outer ring first, then holes). */
function buildShapes(g, minx) {
  const shapes = [];
  const r = R * K;
  const X = x => fx(x, minx);

  g.strokes.forEach(s => {
    if (s.dot) { shapes.push([circlePoly(X(s.dot[0]), fy(s.dot[1]), r)]); return; }
    let pts = s.pts.map(p => [X(p[0]), fy(p[1])]);
    pts = pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 0.01);
    if (s.closed && pts.length > 1 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 0.01) pts.pop();
    if (pts.length === 1) { shapes.push([circlePoly(pts[0][0], pts[0][1], r)]); return; }
    const rings = outlineStroke(pts, !!s.closed, r);
    if (rings.length) shapes.push(rings);
  });

  // already-filled outlines: group every hole with the outer contour that holds it
  const polys = g.fills.map(c => c.map(p => [X(p[0]), fy(p[1])]));
  const depth = polys.map((p, i) => polys.reduce((d, q, j) => d + (i !== j && inside(p[0], q) ? 1 : 0), 0));
  polys.forEach((p, i) => {
    if (depth[i] % 2) return;                                   // a hole: handled below
    const holes = [];
    polys.forEach((q, j) => {
      if (depth[j] % 2 && inside(q[0], p) && depth[j] === depth[i] + 1) holes.push(q);
    });
    const ring = a => (area(a) > 0 ? a : a.slice().reverse());
    shapes.push([ring(p)].concat(holes.map(h => ring(h).slice().reverse())));
  });
  return shapes;
}

function unionPath(shapes) {
  const path = new opentype.Path();
  if (!shapes.length) return { path, rings: 0 };
  const result = polygonClipping.union(shapes[0], ...shapes.slice(1));
  let rings = 0;
  result.forEach(poly => poly.forEach((ring, idx) => {
    let pts = ring.slice(0, -1);                                // drop the repeated closing point
    const ccw = area(pts) > 0;
    if ((idx === 0) !== ccw) pts = pts.slice().reverse();       // outer CCW, holes CW
    pts.forEach((p, i) => (i ? path.lineTo(Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100)
                              : path.moveTo(Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100)));
    path.close();
    rings++;
  }));
  return { path, rings };
}

/* ───────── assemble the font ───────── */
const list = [];
const notdef = new opentype.Path();
notdef.moveTo(60, 0); notdef.lineTo(60, 700); notdef.lineTo(400, 700); notdef.lineTo(400, 0); notdef.close();
notdef.moveTo(110, 50); notdef.lineTo(350, 50); notdef.lineTo(350, 650); notdef.lineTo(110, 650); notdef.close();
list.push(new opentype.Glyph({ name: ".notdef", unicode: 0, advanceWidth: 460, path: notdef }));
list.push(new opentype.Glyph({ name: "space", unicode: 32, advanceWidth: 260, path: new opentype.Path() }));
list.push(new opentype.Glyph({ name: "nbspace", unicode: 160, advanceWidth: 260, path: new opentype.Path() }));

const report = [];
Object.keys(glyphs).sort().forEach(ch => {
  const g = glyphs[ch];
  const b = bbox(g);
  const merged = unionPath(buildShapes(g, b.minx));
  const adv = Math.round((b.maxx - b.minx + 2 * SB) * K);
  const cp = ch.codePointAt(0);
  list.push(new opentype.Glyph({
    name: "uni" + cp.toString(16).toUpperCase().padStart(4, "0"),
    unicode: cp, advanceWidth: adv, path: merged.path
  }));
  report.push(ch + ":" + adv + "/" + merged.rings);
});

const font = new opentype.Font({
  familyName: "UOMI", styleName: "Regular", unitsPerEm: UPM,
  ascender: 900, descender: -300, glyphs: list
});
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, Buffer.from(font.toArrayBuffer()));
console.log("glyphs:", list.length, "size:", fs.statSync(OUT).size, "bytes");
console.log(report.join(" "));

