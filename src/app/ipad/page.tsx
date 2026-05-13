import React, { useState, useRef, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { buildLeafPathFromStrokes, createStableLeafSeed, renderLeafToCanvas, type Stroke } from '../lib/leafArt';
import { supabase } from '../supabaseClient';

const socket = io();

// Hue (degrees) that represents each continent on the colour wheel
const CONTINENT_HUES: Record<string, number> = {
  "Africa":        32,
  "Asia":           5,
  "Europe":       218,
  "North America":170,
  "South America":138,
  "Oceania":      278,
};

const CONTINENTS = {
  "Africa": [
    { name: "Algeria", flag: "🇩🇿" },
    { name: "Angola", flag: "🇦🇴" },
    { name: "Benin", flag: "🇧🇯" },
    { name: "Botswana", flag: "🇧🇼" },
    { name: "Burkina Faso", flag: "🇧🇫" },
    { name: "Burundi", flag: "🇧🇮" },
    { name: "Cape Verde", flag: "🇨🇻" },
    { name: "Central African Republic", flag: "🇨🇫" },
    { name: "Chad", flag: "🇹🇩" },
    { name: "Comoros", flag: "🇰🇲" },
    { name: "DR Congo", flag: "🇨🇩" },
    { name: "Republic of Congo", flag: "🇨🇬" },
    { name: "Djibouti", flag: "🇩🇯" },
    { name: "Egypt", flag: "🇪🇬" },
    { name: "Ethiopia", flag: "🇪🇹" },
    { name: "Gabon", flag: "🇬🇦" },
    { name: "Gambia", flag: "🇬🇲" },
    { name: "Ghana", flag: "🇬🇭" },
    { name: "Guinea", flag: "🇬🇳" },
    { name: "Ivory Coast", flag: "🇨🇮" },
    { name: "Kenya", flag: "🇰🇪" },
    { name: "Libya", flag: "🇱🇾" },
    { name: "Madagascar", flag: "🇲🇬" },
    { name: "Malawi", flag: "🇲🇼" },
    { name: "Mali", flag: "🇲🇱" },
    { name: "Mauritania", flag: "🇲🇷" },
    { name: "Mauritius", flag: "🇲🇺" },
    { name: "Morocco", flag: "🇲🇦" },
    { name: "Mozambique", flag: "🇲🇿" },
    { name: "Namibia", flag: "🇳🇦" },
    { name: "Niger", flag: "🇳🇪" },
    { name: "Nigeria", flag: "🇳🇬" },
    { name: "Rwanda", flag: "🇷🇼" },
    { name: "Senegal", flag: "🇸🇳" },
    { name: "Sierra Leone", flag: "🇸🇱" },
    { name: "Somalia", flag: "🇸🇴" },
    { name: "South Africa", flag: "🇿🇦" },
    { name: "South Sudan", flag: "🇸🇸" },
    { name: "Sudan", flag: "🇸🇩" },
    { name: "Tanzania", flag: "🇹🇿" },
    { name: "Togo", flag: "🇹🇬" },
    { name: "Tunisia", flag: "🇹🇳" },
    { name: "Uganda", flag: "🇺🇬" },
    { name: "Zambia", flag: "🇿🇲" },
    { name: "Zimbabwe", flag: "🇿🇼" },
  ],

  "Asia": [
    { name: "Afghanistan", flag: "🇦🇫" },
    { name: "Armenia", flag: "🇦🇲" },
    { name: "Azerbaijan", flag: "🇦🇿" },
    { name: "Bahrain", flag: "🇧🇭" },
    { name: "Bangladesh", flag: "🇧🇩" },
    { name: "Bhutan", flag: "🇧🇹" },
    { name: "Cambodia", flag: "🇰🇭" },
    { name: "China", flag: "🇨🇳" },
    { name: "Cyprus", flag: "🇨🇾" },
    { name: "Georgia", flag: "🇬🇪" },
    { name: "India", flag: "🇮🇳" },
    { name: "Indonesia", flag: "🇮🇩" },
    { name: "Iran", flag: "🇮🇷" },
    { name: "Iraq", flag: "🇮🇶" },
    { name: "Japan", flag: "🇯🇵" },
    { name: "Jordan", flag: "🇯🇴" },
    { name: "Kazakhstan", flag: "🇰🇿" },
    { name: "Kuwait", flag: "🇰🇼" },
    { name: "Kyrgyzstan", flag: "🇰🇬" },
    { name: "Laos", flag: "🇱🇦" },
    { name: "Lebanon", flag: "🇱🇧" },
    { name: "Malaysia", flag: "🇲🇾" },
    { name: "Mongolia", flag: "🇲🇳" },
    { name: "Myanmar", flag: "🇲🇲" },
    { name: "Nepal", flag: "🇳🇵" },
    { name: "North Korea", flag: "🇰🇵" },
    { name: "Oman", flag: "🇴🇲" },
    { name: "Pakistan", flag: "🇵🇰" },
    { name: "Palestine", flag: "🇵🇸" },
    { name: "Philippines", flag: "🇵🇭" },
    { name: "Qatar", flag: "🇶🇦" },
    { name: "Saudi Arabia", flag: "🇸🇦" },
    { name: "Singapore", flag: "🇸🇬" },
    { name: "South Korea", flag: "🇰🇷" },
    { name: "Sri Lanka", flag: "🇱🇰" },
    { name: "Syria", flag: "🇸🇾" },
    { name: "Taiwan", flag: "🇹🇼" },
    { name: "Tajikistan", flag: "🇹🇯" },
    { name: "Thailand", flag: "🇹🇭" },
    { name: "Turkey", flag: "🇹🇷" },
    { name: "Turkmenistan", flag: "🇹🇲" },
    { name: "UAE", flag: "🇦🇪" },
    { name: "Uzbekistan", flag: "🇺🇿" },
    { name: "Vietnam", flag: "🇻🇳" },
    { name: "Yemen", flag: "🇾🇪" },
  ],

  "Europe": [
    { name: "Albania", flag: "🇦🇱" },
    { name: "Austria", flag: "🇦🇹" },
    { name: "Belarus", flag: "🇧🇾" },
    { name: "Belgium", flag: "🇧🇪" },
    { name: "Bosnia and Herzegovina", flag: "🇧🇦" },
    { name: "Bulgaria", flag: "🇧🇬" },
    { name: "Croatia", flag: "🇭🇷" },
    { name: "Czech Republic", flag: "🇨🇿" },
    { name: "Denmark", flag: "🇩🇰" },
    { name: "Estonia", flag: "🇪🇪" },
    { name: "Finland", flag: "🇫🇮" },
    { name: "France", flag: "🇫🇷" },
    { name: "Germany", flag: "🇩🇪" },
    { name: "Greece", flag: "🇬🇷" },
    { name: "Hungary", flag: "🇭🇺" },
    { name: "Iceland", flag: "🇮🇸" },
    { name: "Ireland", flag: "🇮🇪" },
    { name: "Italy", flag: "🇮🇹" },
    { name: "Kosovo", flag: "🇽🇰" },
    { name: "Latvia", flag: "🇱🇻" },
    { name: "Lithuania", flag: "🇱🇹" },
    { name: "Luxembourg", flag: "🇱🇺" },
    { name: "Malta", flag: "🇲🇹" },
    { name: "Moldova", flag: "🇲🇩" },
    { name: "Montenegro", flag: "🇲🇪" },
    { name: "Netherlands", flag: "🇳🇱" },
    { name: "North Macedonia", flag: "🇲🇰" },
    { name: "Norway", flag: "🇳🇴" },
    { name: "Poland", flag: "🇵🇱" },
    { name: "Portugal", flag: "🇵🇹" },
    { name: "Romania", flag: "🇷🇴" },
    { name: "Russia", flag: "🇷🇺" },
    { name: "Serbia", flag: "🇷🇸" },
    { name: "Slovakia", flag: "🇸🇰" },
    { name: "Slovenia", flag: "🇸🇮" },
    { name: "Spain", flag: "🇪🇸" },
    { name: "Sweden", flag: "🇸🇪" },
    { name: "Switzerland", flag: "🇨🇭" },
    { name: "UK", flag: "🇬🇧" },
    { name: "Ukraine", flag: "🇺🇦" },
  ],

  "North America": [
    { name: "Bahamas", flag: "🇧🇸" },
    { name: "Barbados", flag: "🇧🇧" },
    { name: "Belize", flag: "🇧🇿" },
    { name: "Canada", flag: "🇨🇦" },
    { name: "Costa Rica", flag: "🇨🇷" },
    { name: "Cuba", flag: "🇨🇺" },
    { name: "Dominican Republic", flag: "🇩🇴" },
    { name: "El Salvador", flag: "🇸🇻" },
    { name: "Guatemala", flag: "🇬🇹" },
    { name: "Haiti", flag: "🇭🇹" },
    { name: "Honduras", flag: "🇭🇳" },
    { name: "Jamaica", flag: "🇯🇲" },
    { name: "Mexico", flag: "🇲🇽" },
    { name: "Nicaragua", flag: "🇳🇮" },
    { name: "Panama", flag: "🇵🇦" },
    { name: "Trinidad and Tobago", flag: "🇹🇹" },
    { name: "USA", flag: "🇺🇸" },
  ],

  "South America": [
    { name: "Argentina", flag: "🇦🇷" },
    { name: "Bolivia", flag: "🇧🇴" },
    { name: "Brazil", flag: "🇧🇷" },
    { name: "Chile", flag: "🇨🇱" },
    { name: "Colombia", flag: "🇨🇴" },
    { name: "Ecuador", flag: "🇪🇨" },
    { name: "Guyana", flag: "🇬🇾" },
    { name: "Paraguay", flag: "🇵🇾" },
    { name: "Peru", flag: "🇵🇪" },
    { name: "Suriname", flag: "🇸🇷" },
    { name: "Uruguay", flag: "🇺🇾" },
    { name: "Venezuela", flag: "🇻🇪" },
  ],

  "Oceania": [
    { name: "Australia", flag: "🇦🇺" },
    { name: "Fiji", flag: "🇫🇯" },
    { name: "New Zealand", flag: "🇳🇿" },
    { name: "Papua New Guinea", flag: "🇵🇬" },
    { name: "Solomon Islands", flag: "🇸🇧" },
  ],
};

const COUNTRY_CONTINENT: Record<string, string> = {};
for (const [cont, list] of Object.entries(CONTINENTS)) {
  list.forEach(c => { COUNTRY_CONTINENT[c.name] = cont; });
}

function blendHues(hues: number[]): number {
  const rad = hues.map(h => (h * Math.PI) / 180);
  const sinMean = rad.reduce((s, r) => s + Math.sin(r), 0) / rad.length;
  const cosMean = rad.reduce((s, r) => s + Math.cos(r), 0) / rad.length;
  return ((Math.atan2(sinMean, cosMean) * 180) / Math.PI + 360) % 360;
}

function computeBlendedColor(countries: string[]): string {
  if (countries.length === 0) return 'hsl(138,70%,50%)';
  const hues = countries.map(c => CONTINENT_HUES[COUNTRY_CONTINENT[c]] ?? 0);
  const hue = blendHues(hues);
  return `hsl(${hue.toFixed(0)},78%,55%)`;
}

function swatchColor(continent: string, index: number): string {
  const hue = CONTINENT_HUES[continent] ?? 0;
  const lightness = 38 + (index % 5) * 5;
  const sat = 62 + (index % 3) * 6;
  return `hsl(${hue},${sat}%,${lightness}%)`;
}

// ---------------------------------------------------------------------------
// Web Audio synthesis — no files needed, works offline
// ---------------------------------------------------------------------------
let _audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  try {
    if (!_audioCtx) _audioCtx = new AudioContext();
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
    return _audioCtx;
  } catch { return null; }
}

/** Soft rising tones — played on Begin Journey */
function playBegin(ctx: AudioContext) {
  const t = ctx.currentTime;
  [261.6, 329.6, 392].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.85, t + i * 0.1);
    osc.frequency.linearRampToValueAtTime(freq, t + i * 0.1 + 0.3);
    g.gain.setValueAtTime(0, t + i * 0.1);
    g.gain.linearRampToValueAtTime(0.14, t + i * 0.1 + 0.07);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 1.2);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t + i * 0.1); osc.stop(t + i * 0.1 + 1.2);
  });
}

/** Marimba-like tap — pitch varies by continent hue */
function playSelect(ctx: AudioContext, hue: number) {
  const scale = [261.6, 293.7, 329.6, 349.2, 392, 440, 493.9, 523.2];
  const freq = scale[Math.round((hue / 360) * (scale.length - 1))];
  const t = ctx.currentTime;
  [freq, freq * 2].forEach((f, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    const vol = i === 0 ? 0.2 : 0.07;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.55);
  });
}

/** Soft descending tone — played on country deselect */
function playDeselect(ctx: AudioContext) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(330, t);
  osc.frequency.exponentialRampToValueAtTime(220, t + 0.18);
  g.gain.setValueAtTime(0.1, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(t); osc.stop(t + 0.22);
}

/** Organic leaf-rustle noise — played while drawing (throttled) */
function playRustle(ctx: AudioContext) {
  const dur = 0.07;
  const buf = ctx.createBuffer(1, Math.round(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.8);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = 700 + Math.random() * 600;
  filt.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.value = 0.13;
  src.connect(filt); filt.connect(g); g.connect(ctx.destination);
  src.start();
}

/** Soft wind whoosh — played on step transitions */
function playWhoosh(ctx: AudioContext) {
  const dur = 0.45;
  const buf = ctx.createBuffer(1, Math.round(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const t = i / d.length;
    d[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'highpass';
  filt.frequency.value = 300;
  const g = ctx.createGain();
  g.gain.value = 0.14;
  src.connect(filt); filt.connect(g); g.connect(ctx.destination);
  src.start();
}

/** Warm chord bloom — played on leaf submission */
function playSubmit(ctx: AudioContext) {
  const t = ctx.currentTime;
  [261.6, 329.6, 392, 523.2].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const delay = i * 0.07;
    g.gain.setValueAtTime(0, t + delay);
    g.gain.linearRampToValueAtTime(0.16, t + delay + 0.07);
    g.gain.exponentialRampToValueAtTime(0.001, t + delay + 1.6);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t + delay); osc.stop(t + delay + 1.6);
  });
}

/** Ascending chime — played on completion screen */
function playComplete(ctx: AudioContext) {
  const t = ctx.currentTime;
  [261.6, 329.6, 392, 523.2, 659.3].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const delay = i * 0.13;
    g.gain.setValueAtTime(0, t + delay);
    g.gain.linearRampToValueAtTime(0.18, t + delay + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, t + delay + 1.8);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t + delay); osc.stop(t + delay + 1.8);
  });
}

function LookAtMapTransition({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    // Wait 5 seconds, then move to the completion screen automatically
    const timer = setTimeout(() => {
      onComplete();
    }, 5000); 

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      key="s4.5" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#0e0a07] flex flex-col items-center justify-center text-[#F0E0C8] text-center px-12"
    >
      <div className="space-y-8">
        {/* Animated loader to draw the eye */}
        <div className="w-24 h-24 border-4 border-[#F0E0C8]/20 border-t-[#F0E0C8] rounded-full animate-spin mx-auto mb-8" />
        
        <h2 className="text-5xl mb-4">Look at the projection</h2>
        
        <p className="text-2xl text-[#9A7858] max-w-lg leading-relaxed">
          Your unique leaf is now traveling across the borders of the Belonging Tree...
        </p>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------

export default function ControlPanel() {
  const [step, setStep] = useState(1);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [canvasSnapshot, setCanvasSnapshot] = useState('');
  const [previewColor, setPreviewColor] = useState('hsl(138,78%,55%)');
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke>([]);
  const isDrawingRef = useRef(false);
  const strokeColorRef = useRef('hsl(138,78%,55%)');
  const canvasSizedRef = useRef(false);
  const lastRustleTimeRef = useRef(0);
  const liveSeedRef = useRef(0);
  const renderLeafPreview = useCallback((strokes: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const leafPath = buildLeafPathFromStrokes(strokes, liveSeedRef.current || undefined);
    renderLeafToCanvas(ctx, canvas.width, canvas.height, leafPath, strokeColorRef.current, {
      paintSeed: liveSeedRef.current || undefined,
      guideStrokes: strokes,
      previewInPlace: true,
    });
  }, []);

  useEffect(() => {
    const color = computeBlendedColor(selectedCountries);
    strokeColorRef.current = color;
    setPreviewColor(color);
    renderLeafPreview([...strokesRef.current, ...((currentStrokeRef.current.length >= 2) ? [currentStrokeRef.current] : [])]);
  }, [selectedCountries, renderLeafPreview]);

  useEffect(() => {
    if (step !== 4) canvasSizedRef.current = false;
  }, [step]);

  // Play ascending chime when completion screen appears
  useEffect(() => {
    if (step === 5) {
      const ctx = getAudioCtx();
      if (ctx) playComplete(ctx);
    }
  }, [step]);

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
    lastRustleTimeRef.current = 0;
    liveSeedRef.current = createStableLeafSeed([...strokesRef.current, currentStrokeRef.current]);
    renderLeafPreview([...strokesRef.current, currentStrokeRef.current]);
  };

  const onDrawMove = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    const pt = getCanvasPt(e);
    currentStrokeRef.current.push(pt);
    renderLeafPreview([...strokesRef.current, currentStrokeRef.current]);

    const now = Date.now();
    if (now - lastRustleTimeRef.current > 90) {
      const actx = getAudioCtx();
      if (actx) playRustle(actx);
      lastRustleTimeRef.current = now;
    }
  };

  const onDrawEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawingRef.current) return;
    if (currentStrokeRef.current.length >= 2) {
      strokesRef.current = [...strokesRef.current, [...currentStrokeRef.current]];
      liveSeedRef.current = createStableLeafSeed(strokesRef.current);
      setHasStrokes(true);
      renderLeafPreview(strokesRef.current);
    }
    currentStrokeRef.current = [];
    isDrawingRef.current = false;
  };

  const clearDrawing = () => {
    strokesRef.current = [];
    currentStrokeRef.current = [];
    isDrawingRef.current = false;
    setHasStrokes(false);
    liveSeedRef.current = 0;
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const submitLeaf = async () => {
  // 1. Keep your existing logic to generate the SVG path and snapshot
  const leafPath = buildLeafPathFromStrokes(strokesRef.current, liveSeedRef.current || undefined);
  if (!leafPath) return;

  const snapshot = canvasRef.current?.toDataURL() ?? '';
  setCanvasSnapshot(snapshot);
  
  const color = strokeColorRef.current;
  const leafScale = parseFloat((0.8 + Math.random() * 0.55).toFixed(3));

  // 2. Play your existing submit sound
  const ctx = getAudioCtx();
  if (ctx) playSubmit(ctx);

  // 3. Instead of socket.emit, we INSERT into Supabase
  const { error } = await supabase
    .from('leaves')
    .insert([
      { 
        path_data: leafPath,        // Your SVG path string
        color: color,               // Your blended hex color
        countries: selectedCountries, // The array of selected countries
        // Note: You can also add leafScale to your Supabase table 
        // if you want that specific size to persist!
      }
    ]);

  if (!error) {
    // 4. Trigger the new narrative flow you requested
    setStep(4.5); // "Look at projection" screen with auto-timer
  } else {
    console.error("Supabase Save Error:", error.message);
    // Optional: Alert user or let them try again
  }
};

  const toggleCountry = (country: string) => {
    if (selectedCountries.includes(country)) {
      setSelectedCountries(prev => prev.filter(c => c !== country));
      const ctx = getAudioCtx();
      if (ctx) playDeselect(ctx);
    } else if (selectedCountries.length < 6) {
      setSelectedCountries(prev => [...prev, country]);
      const continent = COUNTRY_CONTINENT[country];
      const hue = CONTINENT_HUES[continent] ?? 0;
      const ctx = getAudioCtx();
      if (ctx) playSelect(ctx, hue);
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
    liveSeedRef.current = 0;
    socket.emit('status_update', { status: 'WAITING FOR A NEW TRAVELLER...' });
  };

return (
  <div className="min-h-screen font-sober-global overflow-hidden text-lg">    
    <style>{`
      @font-face {
        font-family: 'SoberDoctor';
        src: url('/fonts/SoberDoctor-Regular.otf') format('opentype');
        font-weight: normal;
        font-style: normal;
      }
      .font-sober-global {
        font-family: 'SoberDoctor', sans-serif !important;
        font-size: 1.1rem; 
      }
      .scroll-container {
        -webkit-overflow-scrolling: touch;
        touch-action: pan-y;
      }
      canvas {
        touch-action: none;
        image-rendering: -webkit-optimize-contrast;
      }
      * {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
      }
      h1 { font-size: 3.5rem !important; }
      h2 { font-size: 2.5rem !important; }
      button {
        font-size: 1.4rem !important;
      }
    `}</style>
    
    <AnimatePresence mode="wait">
      {/* STEP 1: Welcome */}
      {step === 1 && (
        <motion.div
          key="s1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed inset-0 bg-[#F7F3EC] flex flex-col items-center justify-center text-[#2C1A0E]"
        >
                  <FallingLeavesBackground />

        <div className="text-center max-w-lg px-8 relative z-10">
      <h1 className="mb-6 leading-tight">The Belonging Tree</h1>
            <button
              /* FIXED: Now goes to 1.5 instead of 2 */
              onClick={() => { setStep(1.5); }}
              className="bg-[#7A4F2D] text-[#F7F3EC] w-full py-6 rounded-full shadow-lg active:scale-95 transition-transform"
            >
              Begin your journey →
            </button>
          </div>
        
        </motion.div>
      )}

      {/* NEW STEP 1.5: Onboarding Context */}
      {step === 1.5 && (
        <motion.div key="s1.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#F7F3EC] flex flex-col items-center justify-center text-[#2C1A0E] px-10"
        >
          <FallingLeavesBackground />
<div className="max-w-2xl space-y-8 text-center relative z-10">            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-3xl italic">
              Where are you from? What is home to you? Is it just one place?
            </motion.p>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} className="text-xl leading-relaxed opacity-80">
              Whether you are a third-culture-kid, an international student, a young professional in a new city, or a refugee who had to leave as a consequence of war—your sense of home, belonging, and identity is constantly being informed by your movement across borders.
            </motion.p>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.2 }} className="text-xl leading-relaxed font-bold">
              On the screen above is the tree map. Help obscure the borders across countries by leaving your mark so in the end, there is no your tree or my tree. There is only our tree.
            </motion.p>
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.2 }}
              onClick={() => { const ctx = getAudioCtx(); if (ctx) playBegin(ctx); setStep(2); }}
              className="bg-[#7A4F2D] text-[#F7F3EC] w-full py-6 rounded-full shadow-lg mt-12"
            >
              Select your countries →
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* STEP 2: Country Selection */}
      {step === 2 && (
        <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#0e0a07] flex flex-col items-center">
          <div className="w-full max-w-5xl flex flex-col h-full">
            <div className="p-8 pb-4 text-center flex-shrink-0">
              <h2 className="mb-2 text-[#F0E0C8]">Pick your colours</h2>
              <p className="text-[#9A7858] text-xl">Choose up to 6. ({selectedCountries.length}/6)</p>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-4 scroll-container">
              {(Object.entries(CONTINENTS) as [string, any[]][]).map(([continent, countries]) => (
                <div key={continent} className="mb-12">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-3.5 h-3.5 rounded-full" style={{ background: swatchColor(continent, 0) }}/>
                    <span className="text-xl tracking-widest uppercase text-[#9A7858]">{continent}</span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-x-6 gap-y-12 justify-items-center">
                    {countries.map(({ name, flag }, idx) => {
                      const sel = selectedCountries.includes(name);
                      const bg = swatchColor(continent, idx);
                      return (
                        <button key={name} onClick={() => toggleCountry(name)} className="flex flex-col items-center gap-3 outline-none group">
                          <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl relative transition-transform active:scale-90"
                            style={{ background: bg, boxShadow: sel ? `0 0 0 3px #0e0a07, 0 0 0 5px white` : 'none' }}>
                            {flag}
                            {sel && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white border-2 border-[#0e0a07]" style={{ background: bg }}>
                                {selectedCountries.indexOf(name) + 1}
                              </motion.div>
                            )}
                          </div>
                          <span className="text-[16px] text-[#9A7858] leading-tight w-24 text-center">{name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex-shrink-0 px-8 pb-12 pt-5 bg-[#0e0a07] border-t border-white/5 w-full">
              <div className="max-w-md mx-auto">
                <div className="mb-6">
                  <div className="h-12 rounded-full transition-all duration-500 shadow-lg" style={{ background: selectedCountries.length === 0 ? '#1e1208' : previewColor, boxShadow: selectedCountries.length > 0 ? `0 4px 20px ${previewColor}66` : 'none' }} />
                  <p className="text-center text-[#F0E0C8]/60 text-xl mt-3">{selectedCountries.length === 0 ? 'Your colour will appear here' : 'Your unique colour'}</p>
                </div>
                <button
                  onClick={() => setStep(4)}
                  disabled={selectedCountries.length < 1}
                  className={`w-full py-6 rounded-full text-2xl transition-all shadow-lg active:scale-95 ${selectedCountries.length >= 1 ? 'text-stone-900' : 'bg-[#1e1208] text-[#5A4030] cursor-not-allowed'}`}
                  style={selectedCountries.length >= 1 ? { background: previewColor } : {}}
                >
                  Draw your leaf →
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 4: Draw Leaf */}
      {step === 4 && (
        <motion.div key="s4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#0e0a07] flex flex-col items-center">
          <div className="w-full max-w-4xl flex flex-col h-full">
            <div className="p-8 pb-4 text-center">
              <h2 className="text-[#F0E0C8]">Draw your leaf</h2>
              <p className="text-xl" style={{ color: previewColor }}>Trace any shape with your finger</p>
            </div>
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="relative w-full aspect-square bg-[#140e08] rounded-3xl overflow-hidden border border-white/5" style={{ maxWidth: 'min(100%, calc(100dvh - 320px))' }}>
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full touch-none" onPointerDown={onDrawStart} onPointerMove={onDrawMove} onPointerUp={onDrawEnd} />
                {!hasStrokes && <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-3xl text-[#5A3A18]/35">Draw here…</div>}
              </div>
            </div>
            <div className="p-6 pb-12 flex gap-4 max-w-lg w-full mx-auto">
              <button onClick={clearDrawing} className="flex-1 py-6 rounded-full text-[#9A7858] border border-white/10 active:bg-white/5">Clear</button>
              <button 
                /* FIXED: Now goes to 4.5 instead of 5 */
                onClick={() => { submitLeaf(); setStep(4.5); }} 
                disabled={!hasStrokes} 
                className={`flex-[2] py-6 rounded-full shadow-lg active:scale-95 ${hasStrokes ? 'text-stone-900' : 'bg-[#1e1208] text-[#5A4030]'}`}
                style={hasStrokes ? { background: previewColor } : {}}
              >
                Submit →
              </button>
            </div>
          </div>
        </motion.div>
      )}

     {/* NEW STEP 4.5: Look at Map (Now Auto-Transitioning) */}
      {step === 4.5 && (
        <LookAtMapTransition onComplete={() => setStep(5)} />
      )}

      {/* STEP 5: Completion */}
      {step === 5 && (
        <motion.div key="s5" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 bg-[#F7F3EC] flex flex-col items-center justify-center text-[#2C1A0E] p-10 text-center">
          {canvasSnapshot && (
            <div className="w-64 h-64 mb-10 rounded-3xl overflow-hidden shadow-2xl bg-[#140e08]" style={{ boxShadow: `0 0 40px ${previewColor}55` }}>
              <img src={canvasSnapshot} alt="leaf" className="w-full h-full object-contain" />
            </div>
          )}
          <h2 className="mb-4 leading-snug">You've left your mark<br />on The Belonging Tree.</h2>
          <p className="text-2xl text-[#8B6040] italic mb-16">And it'll always belong here.</p>
          <button onClick={reset} className="bg-[#7A4F2D] text-[#F7F3EC] px-10 py-6 rounded-full text-xl shadow-lg w-full max-w-sm active:scale-95 transition-transform">
            Start New Journey
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
}

function FallingLeavesBackground() {
  const [leaves, setLeaves] = useState<any[]>([]);

  useEffect(() => {
    const fetchLeaves = async () => {
      const { data } = await supabase.from('leaves').select('color, path_data').limit(30);
      if (data) {
        // Create 30 "particle" instances using the real data
       const particles = Array.from({ length: 30 }).map((_, i) => ({
  id: i,
  ...data[i % data.length],
  left: Math.random() * 100,
  delay: Math.random() * -20,
  duration: 20 + Math.random() * 15, // Slower for larger objects
  // LARGER SIZE: Bumping from (20-60) to (60-120)
  size: 60 + Math.random() * 60, 
  rotation: Math.random() * 360
}));
        setLeaves(particles);
      }
    };
    fetchLeaves();
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
      {leaves.map((leaf) => (
     <motion.svg
  key={leaf.id}
  viewBox="-15 -15 60 60" // Adjusted ViewBox to give the leaf more "breathing room"
  style={{
    position: 'absolute',
    left: `${leaf.left}%`,
    width: leaf.size,
    height: leaf.size,
    fill: leaf.color,
    // Slightly less blur since they are larger now
    filter: 'blur(0.8px)', 
    zIndex: 0
  }}
  initial={{ y: -150, rotate: leaf.rotation }}
  animate={{ 
    y: ['0vh', '115vh'],
    rotate: leaf.rotation + 180 // Reduced rotation speed for a "heavier" feel
  }}
  transition={{
    duration: leaf.duration,
    repeat: Infinity,
    delay: leaf.delay,
    ease: "linear"
  }}
>
  {/* Using the real path from Supabase */}
  <path d={leaf.path_data || "M15,2 C20,2 28,10 28,15 C28,20 20,28 15,28 C10,28 2,20 2,15 C2,10 10,2 15,2 Z"} />
</motion.svg>
      ))}
    </div>
  );
}
