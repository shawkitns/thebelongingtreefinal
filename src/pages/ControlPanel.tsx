import React, { useState, useRef, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';

const socket = io();

// Hue (degrees) that represents each continent on the colour wheel
const CONTINENT_HUES: Record<string, number> = {
  "Africa":        32,   // amber / warm orange
  "Asia":           5,   // terracotta / red
  "Europe":       218,   // cobalt blue
  "North America":170,   // teal
  "South America":138,   // emerald green
  "Oceania":      278,   // violet / purple
};

const CONTINENTS = {
  "Africa": [
    { name: "Algeria", flag: "🇩🇿" }, { name: "Angola", flag: "🇦🇴" },
    { name: "Benin", flag: "🇧🇯" }, { name: "Botswana", flag: "🇧🇼" },
    { name: "Burkina Faso", flag: "🇧🇫" }, { name: "Burundi", flag: "🇧🇮" },
    { name: "Cameroon", flag: "🇨🇲" }, { name: "Cape Verde", flag: "🇨🇻" },
    { name: "Central African Republic", flag: "🇨🇫" }, { name: "Chad", flag: "🇹🇩" },
    { name: "Comoros", flag: "🇰🇲" }, { name: "DR Congo", flag: "🇨🇩" },
    { name: "Republic of Congo", flag: "🇨🇬" }, { name: "Djibouti", flag: "🇩🇯" },
    { name: "Egypt", flag: "🇪🇬" }, { name: "Equatorial Guinea", flag: "🇬🇶" },
    { name: "Eritrea", flag: "🇪🇷" }, { name: "Eswatini", flag: "🇸🇿" },
    { name: "Ethiopia", flag: "🇪🇹" }, { name: "Gabon", flag: "🇬🇦" },
    { name: "Gambia", flag: "🇬🇲" }, { name: "Ghana", flag: "🇬🇭" },
    { name: "Guinea", flag: "🇬🇳" }, { name: "Guinea-Bissau", flag: "🇬🇼" },
    { name: "Ivory Coast", flag: "🇨🇮" }, { name: "Kenya", flag: "🇰🇪" },
    { name: "Lesotho", flag: "🇱🇸" }, { name: "Liberia", flag: "🇱🇷" },
    { name: "Libya", flag: "🇱🇾" }, { name: "Madagascar", flag: "🇲🇬" },
    { name: "Malawi", flag: "🇲🇼" }, { name: "Mali", flag: "🇲🇱" },
    { name: "Mauritania", flag: "🇲🇷" }, { name: "Mauritius", flag: "🇲🇺" },
    { name: "Morocco", flag: "🇲🇦" }, { name: "Mozambique", flag: "🇲🇿" },
    { name: "Namibia", flag: "🇳🇦" }, { name: "Niger", flag: "🇳🇪" },
    { name: "Nigeria", flag: "🇳🇬" }, { name: "Rwanda", flag: "🇷🇼" },
    { name: "Senegal", flag: "🇸🇳" }, { name: "Sierra Leone", flag: "🇸🇱" },
    { name: "Somalia", flag: "🇸🇴" }, { name: "South Africa", flag: "🇿🇦" },
    { name: "South Sudan", flag: "🇸🇸" }, { name: "Sudan", flag: "🇸🇩" },
    { name: "Tanzania", flag: "🇹🇿" }, { name: "Togo", flag: "🇹🇬" },
    { name: "Tunisia", flag: "🇹🇳" }, { name: "Uganda", flag: "🇺🇬" },
    { name: "Zambia", flag: "🇿🇲" }, { name: "Zimbabwe", flag: "🇿🇼" },
  ],
  "Asia": [
    { name: "Afghanistan", flag: "🇦🇫" }, { name: "Armenia", flag: "🇦🇲" },
    { name: "Azerbaijan", flag: "🇦🇿" }, { name: "Bahrain", flag: "🇧🇭" },
    { name: "Bangladesh", flag: "🇧🇩" }, { name: "Bhutan", flag: "🇧🇹" },
    { name: "Brunei", flag: "🇧🇳" }, { name: "Cambodia", flag: "🇰🇭" },
    { name: "China", flag: "🇨🇳" }, { name: "Cyprus", flag: "🇨🇾" },
    { name: "Georgia", flag: "🇬🇪" }, { name: "India", flag: "🇮🇳" },
    { name: "Indonesia", flag: "🇮🇩" }, { name: "Iran", flag: "🇮🇷" },
    { name: "Iraq", flag: "🇮🇶" }, { name: "Japan", flag: "🇯🇵" },
    { name: "Jordan", flag: "🇯🇴" }, { name: "Kazakhstan", flag: "🇰🇿" },
    { name: "Kuwait", flag: "🇰🇼" }, { name: "Kyrgyzstan", flag: "🇰🇬" },
    { name: "Laos", flag: "🇱🇦" }, { name: "Lebanon", flag: "🇱🇧" },
    { name: "Malaysia", flag: "🇲🇾" }, { name: "Maldives", flag: "🇲🇻" },
    { name: "Mongolia", flag: "🇲🇳" }, { name: "Myanmar", flag: "🇲🇲" },
    { name: "Nepal", flag: "🇳🇵" }, { name: "North Korea", flag: "🇰🇵" },
    { name: "Oman", flag: "🇴🇲" }, { name: "Pakistan", flag: "🇵🇰" },
    { name: "Palestine", flag: "🇵🇸" },
    { name: "Philippines", flag: "🇵🇭" }, { name: "Qatar", flag: "🇶🇦" },
    { name: "Saudi Arabia", flag: "🇸🇦" }, { name: "Singapore", flag: "🇸🇬" },
    { name: "South Korea", flag: "🇰🇷" }, { name: "Sri Lanka", flag: "🇱🇰" },
    { name: "Syria", flag: "🇸🇾" }, { name: "Taiwan", flag: "🇹🇼" },
    { name: "Tajikistan", flag: "🇹🇯" }, { name: "Thailand", flag: "🇹🇭" },
    { name: "Timor-Leste", flag: "🇹🇱" }, { name: "Turkey", flag: "🇹🇷" },
    { name: "Turkmenistan", flag: "🇹🇲" }, { name: "UAE", flag: "🇦🇪" },
    { name: "Uzbekistan", flag: "🇺🇿" }, { name: "Vietnam", flag: "🇻🇳" },
    { name: "Yemen", flag: "🇾🇪" },
  ],
  "Europe": [
    { name: "Albania", flag: "🇦🇱" }, { name: "Austria", flag: "🇦🇹" },
    { name: "Belarus", flag: "🇧🇾" }, { name: "Belgium", flag: "🇧🇪" },
    { name: "Bosnia and Herzegovina", flag: "🇧🇦" }, { name: "Bulgaria", flag: "🇧🇬" },
    { name: "Croatia", flag: "🇭🇷" }, { name: "Czech Republic", flag: "🇨🇿" },
    { name: "Denmark", flag: "🇩🇰" }, { name: "Estonia", flag: "🇪🇪" },
    { name: "Finland", flag: "🇫🇮" }, { name: "France", flag: "🇫🇷" },
    { name: "Germany", flag: "🇩🇪" }, { name: "Greece", flag: "🇬🇷" },
    { name: "Hungary", flag: "🇭🇺" }, { name: "Iceland", flag: "🇮🇸" },
    { name: "Ireland", flag: "🇮🇪" }, { name: "Italy", flag: "🇮🇹" },
    { name: "Kosovo", flag: "🇽🇰" }, { name: "Latvia", flag: "🇱🇻" },
    { name: "Lithuania", flag: "🇱🇹" }, { name: "Luxembourg", flag: "🇱🇺" },
    { name: "Malta", flag: "🇲🇹" }, { name: "Moldova", flag: "🇲🇩" },
    { name: "Montenegro", flag: "🇲🇪" }, { name: "Netherlands", flag: "🇳🇱" },
    { name: "North Macedonia", flag: "🇲🇰" }, { name: "Norway", flag: "🇳🇴" },
    { name: "Poland", flag: "🇵🇱" }, { name: "Portugal", flag: "🇵🇹" },
    { name: "Romania", flag: "🇷🇴" }, { name: "Russia", flag: "🇷🇺" },
    { name: "Serbia", flag: "🇷🇸" }, { name: "Slovakia", flag: "🇸🇰" },
    { name: "Slovenia", flag: "🇸🇮" }, { name: "Spain", flag: "🇪🇸" },
    { name: "Sweden", flag: "🇸🇪" }, { name: "Switzerland", flag: "🇨🇭" },
    { name: "UK", flag: "🇬🇧" }, { name: "Ukraine", flag: "🇺🇦" },
  ],
  "North America": [
    { name: "Bahamas", flag: "🇧🇸" }, { name: "Barbados", flag: "🇧🇧" },
    { name: "Belize", flag: "🇧🇿" }, { name: "Canada", flag: "🇨🇦" },
    { name: "Costa Rica", flag: "🇨🇷" }, { name: "Cuba", flag: "🇨🇺" },
    { name: "Dominican Republic", flag: "🇩🇴" }, { name: "El Salvador", flag: "🇸🇻" },
    { name: "Guatemala", flag: "🇬🇹" }, { name: "Haiti", flag: "🇭🇹" },
    { name: "Honduras", flag: "🇭🇳" }, { name: "Jamaica", flag: "🇯🇲" },
    { name: "Mexico", flag: "🇲🇽" }, { name: "Nicaragua", flag: "🇳🇮" },
    { name: "Panama", flag: "🇵🇦" }, { name: "Trinidad and Tobago", flag: "🇹🇹" },
    { name: "USA", flag: "🇺🇸" },
  ],
  "South America": [
    { name: "Argentina", flag: "🇦🇷" }, { name: "Bolivia", flag: "🇧🇴" },
    { name: "Brazil", flag: "🇧🇷" }, { name: "Chile", flag: "🇨🇱" },
    { name: "Colombia", flag: "🇨🇴" }, { name: "Ecuador", flag: "🇪🇨" },
    { name: "Guyana", flag: "🇬🇾" }, { name: "Paraguay", flag: "🇵🇾" },
    { name: "Peru", flag: "🇵🇪" }, { name: "Suriname", flag: "🇸🇷" },
    { name: "Uruguay", flag: "🇺🇾" }, { name: "Venezuela", flag: "🇻🇪" },
  ],
  "Oceania": [
    { name: "Australia", flag: "🇦🇺" }, { name: "Fiji", flag: "🇫🇯" },
    { name: "Kiribati", flag: "🇰🇮" }, { name: "Marshall Islands", flag: "🇲🇭" },
    { name: "Micronesia", flag: "🇫🇲" }, { name: "Nauru", flag: "🇳🇷" },
    { name: "New Zealand", flag: "🇳🇿" }, { name: "Palau", flag: "🇵🇼" },
    { name: "Papua New Guinea", flag: "🇵🇬" }, { name: "Samoa", flag: "🇼🇸" },
    { name: "Solomon Islands", flag: "🇸🇧" }, { name: "Tonga", flag: "🇹🇴" },
    { name: "Tuvalu", flag: "🇹🇻" }, { name: "Vanuatu", flag: "🇻🇺" },
  ],
};

// Build a flat map: country name → continent
const COUNTRY_CONTINENT: Record<string, string> = {};
for (const [cont, list] of Object.entries(CONTINENTS)) {
  list.forEach(c => { COUNTRY_CONTINENT[c.name] = cont; });
}

/** Blend hues using circular (vector) mean so we stay vivid across any mix */
function blendHues(hues: number[]): number {
  const rad = hues.map(h => (h * Math.PI) / 180);
  const sinMean = rad.reduce((s, r) => s + Math.sin(r), 0) / rad.length;
  const cosMean = rad.reduce((s, r) => s + Math.cos(r), 0) / rad.length;
  return ((Math.atan2(sinMean, cosMean) * 180) / Math.PI + 360) % 360;
}

/** Compute a vivid blended hsl colour from the user's selected countries */
function computeBlendedColor(countries: string[]): string {
  if (countries.length === 0) return 'hsl(138,70%,50%)';
  const hues = countries.map(c => CONTINENT_HUES[COUNTRY_CONTINENT[c]] ?? 0);
  const hue = blendHues(hues);
  return `hsl(${hue.toFixed(0)},78%,55%)`;
}

/** Per-country swatch colour: continent hue, lightness varies by position */
function swatchColor(continent: string, index: number): string {
  const hue = CONTINENT_HUES[continent] ?? 0;
  const lightness = 38 + (index % 5) * 5;
  const sat = 62 + (index % 3) * 6;
  return `hsl(${hue},${sat}%,${lightness}%)`;
}

/**
 * Stamp a cluster of leaf-shaped ellipses at (x, y).
 * Each leaflet radiates outward from the center, giving a natural leaf-cluster look.
 */
function drawLeafStamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  size: number
) {
  const count = 7 + Math.floor(Math.random() * 5); // 7–11 leaflets
  for (let i = 0; i < count; i++) {
    // Evenly spread around center with some jitter
    const baseAngle = (i / count) * Math.PI * 2;
    const angle = baseAngle + (Math.random() - 0.5) * 1.1;
    const dist = size * (0.12 + Math.random() * 0.45);
    const lx = x + Math.cos(angle) * dist;
    const ly = y + Math.sin(angle) * dist;
    // Leaflet points outward (rotate 90° from the radial direction so the long axis faces outward)
    const leafRot = angle + Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    const w = size * (0.05 + Math.random() * 0.07); // very narrow — leaf width
    const h = size * (0.22 + Math.random() * 0.28); // elongated — leaf length
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(leafRot);
    ctx.globalAlpha = 0.55 + Math.random() * 0.38;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** Normalize drawn strokes to an SVG path string centered at (0,0), max dimension ~30 units */
function normalizePath(strokes: { x: number; y: number }[][]): string {
  const allPoints = strokes.flat();
  if (allPoints.length < 2) return '';
  const minX = Math.min(...allPoints.map(p => p.x));
  const maxX = Math.max(...allPoints.map(p => p.x));
  const minY = Math.min(...allPoints.map(p => p.y));
  const maxY = Math.max(...allPoints.map(p => p.y));
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const scale = 16 / Math.max(w, h);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return strokes
    .filter(s => s.length >= 2)
    .map(stroke =>
      stroke
        .map((p, i) => {
          const nx = ((p.x - cx) * scale).toFixed(2);
          const ny = ((p.y - cy) * scale).toFixed(2);
          return `${i === 0 ? 'M' : 'L'}${nx},${ny}`;
        })
        .join(' ') + ' Z'
    )
    .join(' ');
}

export default function ControlPanel() {
  const [step, setStep] = useState(1);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [canvasSnapshot, setCanvasSnapshot] = useState('');
  const [previewColor, setPreviewColor] = useState('hsl(138,78%,55%)');
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<{ x: number; y: number }[][]>([]);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const isDrawingRef = useRef(false);
  // Tracks position of last leaf stamp so we space them evenly
  const lastStampPosRef = useRef<{ x: number; y: number } | null>(null);
  // Always-fresh stroke colour for use inside useCallback
  const strokeColorRef = useRef('hsl(138,78%,55%)');
  // Whether canvas pixel dimensions have been synced to CSS size
  const canvasSizedRef = useRef(false);

  // Keep stroke colour in sync with selection
  useEffect(() => {
    const color = computeBlendedColor(selectedCountries);
    strokeColorRef.current = color;
    setPreviewColor(color);
  }, [selectedCountries]);

  // Reset canvas-sized flag when leaving the draw step
  useEffect(() => {
    if (step !== 4) canvasSizedRef.current = false;
  }, [step]);

  /** Ensure canvas pixel dimensions match CSS layout (call before first draw of each session) */
  const ensureCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSizedRef.current) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (width > 0 && height > 0) {
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      canvasSizedRef.current = true;
    }
  }, []);

  // Stamp a leaf cluster at (x, y) directly onto the main canvas, respecting minimum spacing
  const tryStamp = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = Math.max(canvas.width, canvas.height) * 0.038;
    const minDist = size * 0.4;
    const last = lastStampPosRef.current;
    if (last && Math.hypot(x - last.x, y - last.y) < minDist) return;
    drawLeafStamp(ctx, x, y, strokeColorRef.current, size);
    lastStampPosRef.current = { x, y };
  }, []);

  // Direct drawing
  const getCanvasPt = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0] ?? (e as any).changedTouches[0];
      return { x: (t.clientX - rect.left) * sx, y: (t.clientY - rect.top) * sy };
    }
    const me = e as React.MouseEvent;
    return { x: (me.clientX - rect.left) * sx, y: (me.clientY - rect.top) * sy };
  };

  const onDrawStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    ensureCanvasSize();
    const pt = getCanvasPt(e);
    currentStrokeRef.current = [pt];
    isDrawingRef.current = true;
    lastStampPosRef.current = null;
    tryStamp(pt.x, pt.y);
  };

  const onDrawMove = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    const pt = getCanvasPt(e);
    currentStrokeRef.current.push(pt);
    tryStamp(pt.x, pt.y);
  };

  const onDrawEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawingRef.current) return;
    if (currentStrokeRef.current.length >= 2) {
      strokesRef.current = [...strokesRef.current, [...currentStrokeRef.current]];
      setHasStrokes(true);
    }
    currentStrokeRef.current = [];
    isDrawingRef.current = false;
    lastStampPosRef.current = null;
  };

  const clearDrawing = () => {
    strokesRef.current = [];
    currentStrokeRef.current = [];
    isDrawingRef.current = false;
    lastStampPosRef.current = null;
    setHasStrokes(false);
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const submitLeaf = () => {
    const leafPath = normalizePath(strokesRef.current);
    if (!leafPath) return;
    // Capture canvas as image for the completion preview
    const snapshot = canvasRef.current?.toDataURL() ?? '';
    setCanvasSnapshot(snapshot);
    const color = strokeColorRef.current;
    const leafScale = parseFloat((0.8 + Math.random() * 0.55).toFixed(3));
    socket.emit('submit_leaf', { id: sessionId, countries: selectedCountries, leafPath, color, leafScale });
    socket.emit('status_update', { status: 'YOU BELONG' });
    setStep(5);
  };

  const toggleCountry = (country: string) => {
    if (selectedCountries.includes(country)) {
      setSelectedCountries(prev => prev.filter(c => c !== country));
    } else if (selectedCountries.length < 6) {
      setSelectedCountries(prev => [...prev, country]);
    }
  };

  const reset = () => {
    setStep(1);
    setSelectedCountries([]);
    setHasStrokes(false);
    setCanvasSnapshot('');
    strokesRef.current = [];
    currentStrokeRef.current = [];
    isDrawingRef.current = false;
    socket.emit('status_update', { status: 'WAITING FOR A NEW TRAVELLER...' });
  };

  return (
    <div className="min-h-screen bg-[#F7F3EC] text-[#2C1A0E] font-sans flex flex-col items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">

        {/* STEP 1: Welcome */}
        {step === 1 && (
          <motion.div
            key="s1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center max-w-sm px-8"
          >
            {/* Decorative leaf cluster */}
            <div className="flex justify-center mb-6">
              <svg width="80" height="64" viewBox="0 0 80 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="40" cy="18" rx="5.5" ry="15" fill="#7A4F2D" transform="rotate(-6 40 18)" opacity="0.65"/>
                <ellipse cx="24" cy="26" rx="4.5" ry="12" fill="#A87048" transform="rotate(-38 24 26)" opacity="0.55"/>
                <ellipse cx="56" cy="24" rx="4.5" ry="12" fill="#7A4F2D" transform="rotate(32 56 24)" opacity="0.55"/>
                <ellipse cx="13" cy="34" rx="3.5" ry="9" fill="#C09060" transform="rotate(-55 13 34)" opacity="0.4"/>
                <ellipse cx="67" cy="32" rx="3.5" ry="9" fill="#8B5E3C" transform="rotate(50 67 32)" opacity="0.4"/>
                <path d="M40 33 C40 40 39 50 38.5 56" stroke="#7A4F2D" strokeWidth="1.8" strokeLinecap="round" opacity="0.45"/>
              </svg>
            </div>

            <h1 className="text-5xl font-serif mb-4 leading-tight text-[#2C1A0E]">
              The Belonging Tree
            </h1>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-[#8B5E3C] opacity-20" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#8B5E3C] opacity-35" />
              <div className="flex-1 h-px bg-[#8B5E3C] opacity-20" />
            </div>

            <p className="font-hand text-xl mb-10 text-[#7A5030] leading-relaxed">
              Your actions directly impact the belonging tree visualization. By the end of this journey, you will make your own contribution to it.
            </p>

            <button
              onClick={() => {
                setStep(2);
                socket.emit('status_update', { status: 'A NEW TRAVELLER HAS ARRIVED' });
              }}
              className="bg-[#7A4F2D] text-[#F7F3EC] w-full py-5 rounded-full font-hand font-semibold text-xl hover:bg-[#6A3F20] transition-colors shadow-lg"
            >
              Begin your journey →
            </button>
          </motion.div>
        )}

        {/* STEP 2: Country Selection */}
        {step === 2 && (
          <motion.div
            key="s2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md flex flex-col h-[100dvh] bg-[#0e0a07]"
          >
            <div className="p-6 pb-3 text-center flex-shrink-0">
              <h2 className="text-3xl font-serif mb-1 text-[#F0E0C8]">Pick your colours</h2>
              <p className="font-hand text-[#9A7858] text-base">
                Each country is a colour. Choose up to 6. ({selectedCountries.length}/6)
              </p>
            </div>

            {/* Scrollable palette */}
            <div className="flex-1 overflow-y-auto px-4 pb-2">
              {(Object.entries(CONTINENTS) as [string, { name: string; flag: string }[]][]).map(
                ([continent, countries]) => {
                  const hue = CONTINENT_HUES[continent];
                  return (
                    <div key={continent} className="mb-6">
                      {/* Continent header */}
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: `hsl(${hue},70%,55%)` }}
                        />
                        <span
                          className="font-hand text-sm font-bold tracking-wider uppercase"
                          style={{ color: `hsl(${hue},60%,70%)` }}
                        >
                          {continent}
                        </span>
                        <div
                          className="flex-1 h-px opacity-20"
                          style={{ background: `hsl(${hue},70%,55%)` }}
                        />
                      </div>

                      {/* Country swatches */}
                      <div className="flex flex-wrap gap-3">
                        {countries.map(({ name, flag }, idx) => {
                          const sel = selectedCountries.includes(name);
                          const dis = !sel && selectedCountries.length >= 6;
                          const bg = swatchColor(continent, idx);
                          return (
                            <motion.button
                              key={name}
                              onClick={() => toggleCountry(name)}
                              disabled={dis}
                              whileTap={sel || !dis ? { scale: 0.92 } : {}}
                              className="flex flex-col items-center gap-1 outline-none"
                              style={{ opacity: dis ? 0.3 : 1 }}
                            >
                              <div
                                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-200 relative"
                                style={{
                                  background: bg,
                                  boxShadow: sel
                                    ? `0 0 0 3px #0e0a07, 0 0 0 5px ${bg}, 0 4px 16px ${bg}88`
                                    : '0 2px 6px rgba(0,0,0,0.4)',
                                  transform: sel ? 'scale(1.12)' : 'scale(1)',
                                }}
                              >
                                {flag}
                                {sel && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                                    style={{ background: bg, border: '2px solid #0e0a07' }}
                                  >
                                    {selectedCountries.indexOf(name) + 1}
                                  </motion.div>
                                )}
                              </div>
                              <span className="font-hand text-[11px] text-[#9A7858] text-center w-14 leading-tight truncate">
                                {name}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            {/* Footer: blended colour preview + proceed */}
            <div className="flex-shrink-0 px-4 pb-6 pt-3 bg-[#0e0a07]">
              <div className="mb-4">
                <div
                  className="h-10 rounded-full transition-all duration-500 shadow-lg"
                  style={{
                    background: selectedCountries.length === 0 ? '#2a1a0e' : previewColor,
                    boxShadow: selectedCountries.length > 0 ? `0 4px 20px ${previewColor}66` : 'none',
                  }}
                />
                <p className="font-hand text-center text-[#7A5C40] text-sm mt-2">
                  {selectedCountries.length === 0
                    ? 'Your colour will appear here'
                    : 'Your unique colour'}
                </p>
              </div>

              <button
                onClick={() => setStep(4)}
                disabled={selectedCountries.length < 1}
                className={`w-full py-4 rounded-full font-hand font-semibold text-lg transition-all shadow-lg ${
                  selectedCountries.length >= 1
                    ? 'text-white'
                    : 'bg-[#1e1208] text-[#5A4030] cursor-not-allowed'
                }`}
                style={
                  selectedCountries.length >= 1
                    ? { background: previewColor, boxShadow: `0 4px 20px ${previewColor}66` }
                    : {}
                }
              >
                Draw your leaf →
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 4: Draw Leaf */}
        {step === 4 && (
          <motion.div
            key="s4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-[100dvh] flex flex-col bg-[#0e0a07]"
          >
            <div className="p-5 pb-2 text-center flex-shrink-0">
              <h2 className="text-2xl font-serif mb-1 text-[#F0E0C8]">Draw your leaf</h2>
              <p className="font-hand text-base" style={{ color: previewColor }}>
                Trace any shape with your finger
              </p>
            </div>

            {/* Canvas area — square so the drawn shape has no aspect-ratio distortion */}
            <div className="flex-1 flex items-center justify-center px-4 mb-2">
              <div
                className="relative w-full aspect-square max-h-full rounded-3xl overflow-hidden shadow-inner"
                style={{
                  maxWidth: 'min(100%, calc(100dvh - 200px))',
                  background: '#140e08',
                  border: '1px solid rgba(160,100,60,0.18)',
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full"
                  style={{ touchAction: 'none' }}
                  onTouchStart={onDrawStart}
                  onTouchMove={onDrawMove}
                  onTouchEnd={onDrawEnd}
                  onMouseDown={onDrawStart}
                  onMouseMove={e => { if (e.buttons === 1) onDrawMove(e); }}
                  onMouseUp={onDrawEnd}
                />

                {!hasStrokes && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="font-hand text-2xl text-[#5A3A18]/35 select-none">Draw here…</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 flex gap-3 flex-shrink-0">
              <button
                onClick={clearDrawing}
                className="flex-1 py-4 rounded-full font-hand font-semibold text-base text-[#9A7858] hover:bg-white/5 transition-colors"
                style={{ border: '1px solid rgba(160,100,60,0.22)' }}
              >
                Clear
              </button>
              <button
                onClick={submitLeaf}
                disabled={!hasStrokes}
                className="flex-[2] py-4 rounded-full font-hand font-semibold text-lg transition-all shadow-lg text-white"
                style={
                  hasStrokes
                    ? { background: previewColor, boxShadow: `0 4px 20px ${previewColor}66` }
                    : { background: '#1e1208', color: '#5A4030', cursor: 'not-allowed' }
                }
              >
                Submit leaf →
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 5: Completion */}
        {step === 5 && (
          <motion.div
            key="s5"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md flex flex-col items-center text-center p-8"
          >
            {canvasSnapshot && (
              <div
                className="w-48 h-48 mb-8 rounded-3xl overflow-hidden shadow-2xl"
                style={{
                  background: '#140e08',
                  boxShadow: `0 0 40px ${previewColor}55`,
                }}
              >
                <img src={canvasSnapshot} alt="Your leaf" className="w-full h-full object-contain" />
              </div>
            )}

            <h2 className="text-4xl font-serif mb-3 text-[#5A3820] leading-snug">
              You've left your mark<br />on The Belonging Tree.
            </h2>
            <p className="font-hand text-xl text-[#8B6040] italic mb-12">
              And it'll always belong here.
            </p>

            <button
              onClick={reset}
              className="bg-[#7A4F2D] text-[#F7F3EC] px-8 py-4 rounded-full font-hand font-semibold text-lg hover:bg-[#6A3F20] transition-colors shadow-lg w-full"
            >
              Start New Journey
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
