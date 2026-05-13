export type Point = { x: number; y: number };
export type Stroke = Point[];
type LeafRenderOptions = {
  paintSeed?: number;
  guideStrokes?: Stroke[];
  previewInPlace?: boolean;
};

type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function hashString(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createStableLeafSeed(strokes: Stroke[]) {
  const first = strokes.find(stroke => stroke.length > 0)?.[0];
  if (!first) return 0;
  const strokeCount = strokes.length;
  return hashString(`${first.x.toFixed(1)}|${first.y.toFixed(1)}|${strokeCount}`);
}

function createSeededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseHslColor(color: string) {
  const match = color.match(/hsl\(\s*([-\d.]+)\s*,\s*([-\d.]+)%\s*,\s*([-\d.]+)%\s*\)/i);
  if (!match) return { h: 138, s: 70, l: 50 };
  return {
    h: Number(match[1]),
    s: Number(match[2]),
    l: Number(match[3]),
  };
}

function toHslString(h: number, s: number, l: number, alpha?: number) {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100);
  const light = clamp(l, 0, 100);
  if (alpha == null) return `hsl(${hue.toFixed(1)} ${sat.toFixed(1)}% ${light.toFixed(1)}%)`;
  return `hsl(${hue.toFixed(1)} ${sat.toFixed(1)}% ${light.toFixed(1)}% / ${clamp(alpha, 0, 1).toFixed(3)})`;
}

function getBounds(points: Point[]): Bounds {
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  return {
    minX,
    maxX,
    minY,
    maxY,
    width,
    height,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  };
}

function dist(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function normalize(v: Point) {
  const length = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / length, y: v.y / length };
}

function getStrokeLength(points: Stroke) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1], points[i]);
  return total;
}

function smoothStroke(points: Stroke) {
  if (points.length < 3) return points;
  const smoothed: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    smoothed.push({
      x: prev.x * 0.2 + curr.x * 0.6 + next.x * 0.2,
      y: prev.y * 0.2 + curr.y * 0.6 + next.y * 0.2,
    });
  }
  smoothed.push(points[points.length - 1]);
  return smoothed;
}

function resampleStroke(points: Stroke, spacing: number) {
  if (points.length < 2) return points;
  const out: Point[] = [points[0]];
  let anchor = points[0];
  let carry = 0;

  for (let i = 1; i < points.length; i++) {
    const end = points[i];
    let segmentLength = dist(anchor, end);
    if (segmentLength === 0) continue;
    const direction = normalize({ x: end.x - anchor.x, y: end.y - anchor.y });

    while (carry + segmentLength >= spacing) {
      const step = spacing - carry;
      anchor = {
        x: anchor.x + direction.x * step,
        y: anchor.y + direction.y * step,
      };
      out.push(anchor);
      segmentLength -= step;
      carry = 0;
    }

    carry += segmentLength;
    anchor = end;
  }

  const last = points[points.length - 1];
  if (dist(out[out.length - 1], last) > spacing * 0.4) out.push(last);
  return out;
}

function pointsToClosedPath(points: Point[]) {
  if (points.length === 0) return '';
  const cmds = [`M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`];
  for (let i = 1; i < points.length; i++) {
    cmds.push(`L${points[i].x.toFixed(2)},${points[i].y.toFixed(2)}`);
  }
  return `${cmds.join(' ')} Z`;
}

function drawImpastoDab(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  width: number,
  length: number,
  color: string,
  alpha: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-width * 0.55, -length * 0.28);
  ctx.quadraticCurveTo(-width * 0.12, -length * 0.72, width * 0.48, -length * 0.18);
  ctx.lineTo(width * 0.56, length * 0.24);
  ctx.quadraticCurveTo(width * 0.1, length * 0.62, -width * 0.52, length * 0.16);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,245,224,0.22)';
  ctx.lineWidth = Math.max(0.6, width * 0.08);
  ctx.beginPath();
  ctx.moveTo(-width * 0.25, -length * 0.18);
  ctx.lineTo(width * 0.22, length * 0.12);
  ctx.stroke();
  ctx.restore();
}

function drawLeafyStrokePreview(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  color: string,
  seed: number,
) {
  const paint = createLeafPaintStyle(color, '', seed);
  const rnd = createSeededRandom(seed || 1);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  strokes.forEach((stroke, strokeIndex) => {
    if (stroke.length < 2) return;
    const smooth = smoothStroke(stroke);
    const spacing = Math.max(8, getStrokeLength(smooth) / 30);
    const resampled = resampleStroke(smooth, spacing);
    ctx.strokeStyle = 'rgba(46,26,14,0.18)';
    ctx.globalAlpha = 1;
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(smooth[0].x, smooth[0].y);
    for (let i = 1; i < smooth.length; i++) ctx.lineTo(smooth[i].x, smooth[i].y);
    ctx.stroke();

    ctx.strokeStyle = paint.shadow;
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(smooth[0].x, smooth[0].y);
    for (let i = 1; i < smooth.length; i++) ctx.lineTo(smooth[i].x, smooth[i].y);
    ctx.stroke();

    for (let i = 1; i < resampled.length - 1; i++) {
      const prev = resampled[i - 1];
      const curr = resampled[i];
      const next = resampled[i + 1];
      const tangent = normalize({ x: next.x - prev.x, y: next.y - prev.y });
      const normal = { x: -tangent.y, y: tangent.x };
      const angle = Math.atan2(tangent.y, tangent.x);
      const strokeWidth = 10 + Math.sin((i / Math.max(1, resampled.length - 1)) * Math.PI) * 6;

      drawImpastoDab(
        ctx,
        curr.x,
        curr.y,
        angle + (rnd() - 0.5) * 0.45,
        strokeWidth * (0.9 + rnd() * 0.45),
        strokeWidth * (1.25 + rnd() * 0.75),
        i % 5 === 0 ? paint.fillC : i % 3 === 0 ? paint.fillA : paint.fillB,
        0.84,
      );

      drawImpastoDab(
        ctx,
        curr.x + normal.x * (rnd() - 0.5) * 4,
        curr.y + normal.y * (rnd() - 0.5) * 4,
        angle + (rnd() - 0.5) * 0.9,
        strokeWidth * 0.62,
        strokeWidth * (0.82 + rnd() * 0.42),
        rnd() > 0.5 ? paint.rim : paint.shadow,
        0.42,
      );

      if (i % 2 === 0) {
        const side = (i + strokeIndex) % 2 === 0 ? 1 : -1;
        const leafAngle = angle + side * (0.75 + rnd() * 0.35);
        const cx = curr.x + normal.x * side * (4 + rnd() * 3);
        const cy = curr.y + normal.y * side * (4 + rnd() * 3);
        drawImpastoDab(
          ctx,
          cx,
          cy,
          leafAngle,
          5 + rnd() * 3,
          10 + rnd() * 6,
          i % 4 === 0 ? paint.fillC : paint.rim,
          0.5,
        );
      }
    }

    ctx.strokeStyle = 'rgba(74,42,21,0.35)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(smooth[0].x, smooth[0].y);
    for (let i = 1; i < smooth.length; i++) ctx.lineTo(smooth[i].x, smooth[i].y);
    ctx.stroke();
  });

  ctx.restore();
}

function sampleNormalizedPoints(strokes: Stroke[]) {
  const points = strokes.flat();
  if (points.length < 2) return [];
  const bounds = getBounds(points);
  return points.map(p => ({
    x: (p.x - bounds.cx) / bounds.width,
    y: (p.y - bounds.cy) / bounds.height,
  }));
}

function getLeafDescriptor(strokes: Stroke[], seedOverride?: number) {
  const normalized = sampleNormalizedPoints(strokes);
  if (normalized.length < 2) return null;

  const raw = strokes
    .flat()
    .map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join('|');
  const seed = seedOverride ?? hashString(raw);
  const rnd = createSeededRandom(seed);

  let leftMass = 0;
  let rightMass = 0;
  let topMass = 0;
  let bottomMass = 0;
  let leanAccumulator = 0;
  let waveEnergy = 0;

  for (const p of normalized) {
    if (p.x < 0) leftMass += Math.abs(p.x);
    else rightMass += p.x;
    if (p.y < 0) topMass += Math.abs(p.y);
    else bottomMass += p.y;
    leanAccumulator += p.x * p.y;
    waveEnergy += Math.abs(p.x) * (0.4 + Math.abs(p.y));
  }

  const bounds = getBounds(strokes.flat());
  const aspect = clamp(bounds.width / bounds.height, 0.42, 1.65);
  const widthFactor = clamp(0.7 + (aspect - 0.42) / 1.4, 0.72, 1.5);
  const asymmetry = clamp((rightMass - leftMass) / Math.max(leftMass + rightMass, 0.001), -0.38, 0.38);
  const lean = clamp(leanAccumulator / normalized.length * 2.3, -0.34, 0.34);
  const tipSharpness = clamp(0.7 + topMass / Math.max(bottomMass + topMass, 0.001) * 0.75 + (rnd() - 0.5) * 0.12, 0.72, 1.38);
  const baseRoundness = clamp(0.82 + bottomMass / Math.max(bottomMass + topMass, 0.001) * 0.52 + (rnd() - 0.5) * 0.1, 0.78, 1.35);
  const waist = clamp(0.18 + waveEnergy / normalized.length * 0.28 + rnd() * 0.08, 0.16, 0.42);
  const serration = clamp(0.018 + waveEnergy / normalized.length * 0.042 + rnd() * 0.02, 0.02, 0.07);
  const curveA = 0.35 + rnd() * 0.5;
  const curveB = 0.45 + rnd() * 0.45;
  const midShift = clamp(asymmetry * 0.8 + (rnd() - 0.5) * 0.08, -0.26, 0.26);

  return {
    seed,
    widthFactor,
    asymmetry,
    lean,
    tipSharpness,
    baseRoundness,
    waist,
    serration,
    curveA,
    curveB,
    midShift,
  };
}

export function buildLeafPathFromStrokes(strokes: Stroke[], seedOverride?: number) {
  const descriptor = getLeafDescriptor(strokes, seedOverride);
  if (!descriptor) return '';
  const allPoints = strokes.flat();
  const bounds = getBounds(allPoints);
  const normalizeScale = 22 / Math.max(bounds.width, bounds.height, 1);
  const rnd = createSeededRandom(descriptor.seed);
  const parts: string[] = [];

  strokes
    .filter(stroke => stroke.length >= 2)
    .forEach((stroke, strokeIndex) => {
      const smooth = smoothStroke(stroke);
      const spacing = Math.max(4, getStrokeLength(smooth) / 28);
      const resampled = resampleStroke(smooth, spacing).map(point => ({
        x: (point.x - bounds.cx) * normalizeScale,
        y: (point.y - bounds.cy) * normalizeScale,
      }));
      if (resampled.length < 2) return;

      const leftEdge: Point[] = [];
      const rightEdge: Point[] = [];

      for (let i = 0; i < resampled.length; i++) {
        const prev = resampled[Math.max(0, i - 1)];
        const curr = resampled[i];
        const next = resampled[Math.min(resampled.length - 1, i + 1)];
        const tangent = normalize({ x: next.x - prev.x, y: next.y - prev.y });
        const normal = { x: -tangent.y, y: tangent.x };
        const progress = resampled.length === 1 ? 0 : i / (resampled.length - 1);
        const taper = Math.sin(progress * Math.PI);
        const baseWidth = (0.9 + descriptor.widthFactor * 0.35) * (0.44 + taper * 0.92);
        const flutter = Math.sin(progress * Math.PI * (4.2 + descriptor.curveA + strokeIndex * 0.3)) * descriptor.serration * 6.5;
        const sideBias = descriptor.asymmetry * 0.6;
        leftEdge.push({
          x: curr.x + normal.x * (baseWidth * (1 + sideBias)) + normal.x * flutter,
          y: curr.y + normal.y * (baseWidth * (1 + sideBias)) + normal.y * flutter,
        });
        rightEdge.push({
          x: curr.x - normal.x * (baseWidth * (1 - sideBias)) - normal.x * flutter * 0.82,
          y: curr.y - normal.y * (baseWidth * (1 - sideBias)) - normal.y * flutter * 0.82,
        });

        if (i > 0 && i < resampled.length - 1 && i % 3 === 0) {
          const side = (i + strokeIndex) % 2 === 0 ? 1 : -1;
          const leafletReach = baseWidth * (1.65 + rnd() * 0.9);
          const leafletSpread = baseWidth * (0.42 + rnd() * 0.22);
          const center = {
            x: curr.x + normal.x * side * baseWidth * 0.75,
            y: curr.y + normal.y * side * baseWidth * 0.75,
          };
          const tip = {
            x: center.x + normal.x * side * leafletReach + tangent.x * leafletSpread * 0.5,
            y: center.y + normal.y * side * leafletReach + tangent.y * leafletSpread * 0.5,
          };
          const baseA = {
            x: curr.x + tangent.x * leafletSpread - normal.x * side * baseWidth * 0.12,
            y: curr.y + tangent.y * leafletSpread - normal.y * side * baseWidth * 0.12,
          };
          const baseB = {
            x: curr.x - tangent.x * leafletSpread - normal.x * side * baseWidth * 0.12,
            y: curr.y - tangent.y * leafletSpread - normal.y * side * baseWidth * 0.12,
          };
          parts.push(pointsToClosedPath([baseA, tip, baseB]));
        }
      }

      parts.push(pointsToClosedPath([...leftEdge, ...rightEdge.reverse()]));
    });

  return parts.join(' ');
}

export function createLeafPaintStyle(color: string, leafPath: string, seedOverride?: number) {
  const seed = seedOverride ?? hashString(`${color}|${leafPath}`);
  const rnd = createSeededRandom(seed);
  const base = parseHslColor(color);

  const fillA = toHslString(base.h + rnd() * 8 - 4, base.s + 8, base.l + 10);
  const fillB = toHslString(base.h - 8 + rnd() * 6, base.s + 14, base.l - 6);
  const fillC = toHslString(base.h + 12, base.s + 4, base.l + 22, 0.78);
  const shadow = toHslString(base.h - 5, base.s + 12, base.l - 28, 0.42);
  const rim = toHslString(base.h + 18, base.s + 16, base.l + 28, 0.5);
  const vein = toHslString(base.h - 12, base.s + 2, base.l - 20, 0.48);
  const speck = toHslString(base.h + 20, base.s + 10, base.l + 30, 0.28);
  const stem = toHslString(base.h - 18, base.s + 6, Math.max(18, base.l - 30), 0.65);

  const brushPaths = Array.from({ length: 7 }, (_, index) => {
    const y = -14 + index * 4.3 + (rnd() - 0.5) * 1.4;
    const left = -16 + (rnd() - 0.5) * 4.8;
    const right = 16 + (rnd() - 0.5) * 4.8;
    const arc = 1 + rnd() * 2.2;
    return `M${left.toFixed(2)},${y.toFixed(2)} C${(left + 1.8).toFixed(2)},${(y - arc).toFixed(2)} ${(right - 1.8).toFixed(2)},${(y - arc * 0.7).toFixed(2)} ${right.toFixed(2)},${y.toFixed(2)}`;
  });

  const speckles = Array.from({ length: 10 }, () => ({
    x: (-15 + rnd() * 30).toFixed(2),
    y: (-15 + rnd() * 30).toFixed(2),
    rx: (0.28 + rnd() * 0.9).toFixed(2),
    ry: (0.18 + rnd() * 0.64).toFixed(2),
    opacity: (0.08 + rnd() * 0.18).toFixed(2),
  }));

  return { seed, fillA, fillB, fillC, shadow, rim, vein, speck, stem, brushPaths, speckles };
}

export function renderLeafToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  leafPath: string,
  color: string,
  options: LeafRenderOptions = {},
) {
  ctx.clearRect(0, 0, width, height);
  const { paintSeed, guideStrokes = [], previewInPlace = false } = options;

  if (guideStrokes.length > 0) {
    drawLeafyStrokePreview(ctx, guideStrokes, color, paintSeed ?? 1);
    if (previewInPlace) return;
  }

  if (!leafPath) return;

  const path = new Path2D(leafPath);
  const paint = createLeafPaintStyle(color, leafPath, paintSeed);
  const grad = ctx.createLinearGradient(width * 0.35, height * 0.14, width * 0.7, height * 0.86);
  grad.addColorStop(0, paint.fillA);
  grad.addColorStop(0.58, paint.fillB);
  grad.addColorStop(1, paint.shadow);

  ctx.save();
  ctx.translate(width / 2, height / 2 + height * 0.03);
  const scale = Math.min(width, height) / 48;
  ctx.scale(scale, scale);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = grad;
  ctx.fill(path);
  ctx.restore();

  ctx.save();
  ctx.clip(path);

  ctx.globalAlpha = 0.92;
  ctx.fillStyle = grad;
  ctx.fill(path);

  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = paint.fillC;
  ctx.beginPath();
  ctx.ellipse(-4.5, -4.8, 8.5, 14.5, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = 'multiply';
  ctx.strokeStyle = paint.shadow;
  ctx.lineCap = 'round';
  for (let i = 0; i < paint.brushPaths.length; i++) {
    ctx.lineWidth = 0.45 + (i % 3) * 0.18;
    ctx.globalAlpha = 0.18 + (i % 4) * 0.05;
    ctx.stroke(new Path2D(paint.brushPaths[i]));
  }

  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = paint.rim;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.22;
  paint.brushPaths.slice(0, 4).forEach((brush, index) => {
    ctx.stroke(new Path2D(brush));
    ctx.translate(index % 2 === 0 ? 0.4 : -0.4, 0.2);
  });

  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = paint.vein;
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 0.3;
  paint.brushPaths.forEach(brush => ctx.stroke(new Path2D(brush)));

  ctx.fillStyle = paint.speck;
  for (const speck of paint.speckles) {
    ctx.globalAlpha = Number(speck.opacity);
    ctx.beginPath();
    ctx.ellipse(Number(speck.x), Number(speck.y), Number(speck.rx), Number(speck.ry), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
