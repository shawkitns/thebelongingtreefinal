import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import * as d3 from 'd3';
import { createLeafPaintStyle } from '../lib/leafArt';
import { supabase } from '../supabaseClient';

const socket = io();

// ~30×26 unit leaf shape — large enough to read at world-map scale
const DEFAULT_LEAF = 'M0,-13 C5,-13 11,-7 11,0 C11,7 0,13 0,13 C0,13 -11,7 -11,0 C-11,-7 -5,-13 0,-13 Z';
const BASE_OPACITY = 0.9;
const FADE_FACTOR = 0.82;


//Artistic Coordinates made manually in Photoshop using reference image

const ARTISTIC_COORDS: Record<string, { x: number, y: number, r: number }> = {

  // Africa
  "Algeria": { x: 0.466, y: 0.532, r: 0.013 },
  "Angola": { x: 0.492, y: 0.664, r: 0.007 },
  "Benin": { x: 0.466, y: 0.593, r: 0.001 },
  "Botswana": { x: 0.504, y: 0.696, r: 0.006 },
  "Burkina Faso": { x: 0.460, y: 0.583, r: 0.002 },
  "Burundi": { x: 0.512, y: 0.637, r: 0.001 },
  "Cameron": { x: 0.484, y: 0.607, r: 0.001 },
  "Cape Verde": { x: 0.422, y: 0.573, r: 0.002 },
  "Central African Republic": { x: 0.496, y: 0.602, r: 0.002 },
  "Chad": { x: 0.495, y: 0.571, r: 0.007 },
  "Comoros": { x: 0.536, y: 0.662, r: 0.002 },
  "DR Congo": { x: 0.502, y: 0.632, r: 0.006 },
  "Republic of Congo": { x: 0.488, y: 0.626, r: 0.003 },
  "Djibouti": { x: 0.534, y: 0.585, r: 0.001 },
  "Egypt": { x: 0.512, y: 0.535, r: 0.005 },
  "Ethiopia": { x: 0.530, y: 0.595, r: 0.010 },
  "Gabon": { x: 0.482, y: 0.625, r: 0.003 },
  "Gambia": { x: 0.436, y: 0.582, r: 0.001 },
  "Ghana": { x: 0.460, y: 0.592, r: 0.003 },
  "Guinea": { x: 0.443, y: 0.589, r: 0.002 },
  "Ivory Coast": { x: 0.453, y: 0.598, r: 0.002 },
  "Kenya": { x: 0.526, y: 0.623, r: 0.003 },
  "Libya": { x: 0.492, y: 0.537, r: 0.015 },
  "Madagascar": { x: 0.541, y: 0.686, r: 0.013 },
  "Malawi": { x: 0.520, y: 0.668, r: 0.002 },
  "Mali": { x: 0.459, y: 0.568, r: 0.010 },
  "Mauritania": { x: 0.445, y: 0.561, r: 0.009 },
  "Mauritius": { x: 0.560, y: 0.688, r: 0.001 },
  "Morocco": { x: 0.452, y: 0.519, r: 0.003 },
  "Mozambique": { x: 0.524, y: 0.680, r: 0.015 },
  "Namibia": { x: 0.491, y: 0.697, r: 0.020 },
  "Niger": { x: 0.477, y: 0.567, r: 0.016 },
  "Nigeria": { x: 0.476, y: 0.595, r: 0.014 },
  "Rwanda": { x: 0.513, y: 0.628, r: 0.001 },
  "Senegal": { x: 0.438, y: 0.578, r: 0.003 },
  "Sierra Leone": { x: 0.442, y: 0.595, r: 0.001 },
  "Somalia": { x: 0.544, y: 0.602, r: 0.005 },
  "South Africa": { x: 0.506, y: 0.717, r: 0.018 },
  "South Sudan": { x: 0.514, y: 0.603, r: 0.004 },
  "Sudan": { x: 0.513, y: 0.572, r: 0.018 },
  "Tanzania": { x: 0.522, y: 0.643, r: 0.004 },
  "Togo": { x: 0.464, y: 0.596, r: 0.001 },
  "Tunisia": { x: 0.479, y: 0.511, r: 0.001 },
  "Uganda": { x: 0.517, y: 0.621, r: 0.002 },
  "Zambia": { x: 0.511, y: 0.672, r: 0.003 },
  "Zimbabwe": { x: 0.512, y: 0.686, r: 0.003 },

  // Asia
  "Afghanistan": { x: 0.574, y: 0.512, r: 0.007 },
  "Armenia": { x: 0.538, y: 0.489, r: 0.001 },
  "Azerbaijan": { x: 0.545, y: 0.489, r: 0.001 },
  "Bahrain": { x: 0.548, y: 0.537, r: 0.001 },
  "Bangladesh": { x: 0.614, y: 0.545, r: 0.003 },
  "Bhutan": { x: 0.614, y: 0.534, r: 0.001 },
  "Cambodia": { x: 0.639, y: 0.582, r: 0.001 },
  "China": { x: 0.636, y: 0.508, r: 0.045 },
  "Cyprus": { x: 0.518, y: 0.506, r: 0.002 },
  "Georgia": { x: 0.537, y: 0.480, r: 0.002 },
  "India": { x: 0.595, y: 0.549, r: 0.021 },
  "Indonesia": { x: 0.667, y: 0.638, r: 0.035 },
  "Iran": { x: 0.554, y: 0.517, r: 0.013 },
  "Iraq": { x: 0.536, y: 0.516, r: 0.004 },
  "Japan": { x: 0.697, y: 0.496, r: 0.016 },
  "Jordan": { x: 0.524, y: 0.522, r: 0.010 },
  "Kazakhstan": { x: 0.578, y: 0.456, r: 0.035 },
  "Kuwait": { x: 0.543, y: 0.527, r: 0.001 },
  "Kyrgyzstan": { x: 0.589, y: 0.482, r: 0.003 },
  "Laos": { x: 0.636, y: 0.559, r: 0.002 },
  "Lebanon": { x: 0.521, y: 0.510, r: 0.002 },
  "Malaysia": { x: 0.652, y: 0.614, r: 0.016 },
  "Mongolia": { x: 0.636, y: 0.463, r: 0.020 },
  "Myanmar": { x: 0.624, y: 0.554, r: 0.005 },
  "Nepal": { x: 0.603, y: 0.530, r: 0.008 },
  "North Korea": { x: 0.675, y: 0.487, r: 0.002 },
  "Oman": { x: 0.557, y: 0.557, r: 0.010 },
  "Pakistan": { x: 0.579, y: 0.524, r: 0.008 },
  "Palestine": { x: 0.520, y: 0.521, r: 0.003 },
  "Philippines": { x: 0.670, y: 0.586, r: 0.010 },
  "Qatar": { x: 0.549, y: 0.544, r: 0.002 },
  "Saudi Arabia": { x: 0.536, y: 0.545, r: 0.013 },
  "Singapore": { x: 0.637, y: 0.618, r: 0.002 },
  "Sri Lanka": { x: 0.598, y: 0.598, r: 0.002 },
  "Syria": { x: 0.527, y: 0.505, r: 0.006 },
  "Taiwan": { x: 0.666, y: 0.546, r: 0.004 },
  "South Korea": { x: 0.678, y: 0.500, r: 0.002 },
  "Tajikistan": { x: 0.583, y: 0.493, r: 0.006 },
  "Thailand": { x: 0.632, y: 0.573, r: 0.009 },
  "Turkey": { x: 0.522, y: 0.493, r: 0.012 },
  "Turkmenistan": { x: 0.562, y: 0.490, r: 0.008 },
  "UAE": { x: 0.553, y: 0.545, r: 0.003 },
  "Uzbekistan": { x: 0.569, y: 0.482, r: 0.006 },
  "Vietnam": { x: 0.564, y: 0.571, r: 0.005 },
  "Yemen": { x: 0.553, y: 0.584, r: 0.002 },

  // Oceania
  "Australia": { x: 0.690, y: 0.706, r: 0.030 },
  "Fiji": { x: 0.762, y: 0.680, r: 0.001 },
  "New Zealand": { x: 0.755, y: 0.764, r: 0.012 },
  "Papua New Guinea": { x: 0.707, y: 0.644, r: 0.006 },
  "Solomon Islands": { x: 0.732, y: 0.651, r: 0.007 },

  // South America
  "Argentina": { x: 0.354, y: 0.741, r: 0.011 },
  "Bolivia": { x: 0.354, y: 0.674, r: 0.007 },
  "Brazil": { x: 0.374, y: 0.656, r: 0.028 },
  "Chile": { x: 0.343, y: 0.727, r: 0.005 },
  "Ecuador": { x: 0.330, y: 0.626, r: 0.003 },
  "Colombia": { x: 0.339, y: 0.611, r: 0.007 },
  "Guyana": { x: 0.363, y: 0.607, r: 0.002 },
  "Paraguay": { x: 0.364, y: 0.700, r: 0.002 },
  "Peru": { x: 0.335, y: 0.651, r: 0.005 },
  "Suriname": { x: 0.368, y: 0.609, r: 0.001 },
  "Uruguay": { x: 0.368, y: 0.731, r: 0.002 },
  "Venezuela": { x: 0.353, y: 0.599, r: 0.010 },

  // North America
  "Barbados": { x: 0.364, y: 0.581, r: 0.001 },
  "Bahamas": { x: 0.334, y: 0.545, r: 0.001 },
  "Belize": { x: 0.313, y: 0.568, r: 0.001 },
  "Canada": { x: 0.304, y: 0.389, r: 0.070 },
  "Cuba": { x: 0.329, y: 0.554, r: 0.002 },
  "Costa Rica": { x: 0.320, y: 0.592, r: 0.001 },
  "Dominican Republic": { x: 0.344, y: 0.562, r: 0.001 },
  "El Salvador": { x: 0.312, y: 0.578, r: 0.001 },
  "Guatemala": { x: 0.310, y: 0.574, r: 0.001 },
  "Haiti": { x: 0.339, y: 0.562, r: 0.001 },
  "USA": { x: 0.293, y: 0.492, r: 0.032 },
  "Honduras": { x: 0.317, y: 0.576, r: 0.001 },
  "Jamaica": { x: 0.332, y: 0.566, r: 0.001 },
  "Mexico": { x: 0.294, y: 0.553, r: 0.010 },
  "Nicaragua": { x: 0.318, y: 0.583, r: 0.001 },
  "Panama": { x: 0.327, y: 0.596, r: 0.001 },
  "Trinidad and Tobago": { x: 0.359, y: 0.588, r: 0.001 },
  "Puerto Rico": { x: 0.350, y: 0.564, r: 0.001 },

  // Europe
  "Albania": { x: 0.495, y: 0.483, r: 0.002 },
  "Austria": { x: 0.487, y: 0.459, r: 0.005 },
  "Belarus": { x: 0.510, y: 0.433, r: 0.006 },
  "Belgium": { x: 0.470, y: 0.445, r: 0.003 },
  "Bosnia and Herzegovina": { x: 0.492, y: 0.472, r: 0.001 },
  "Bulgaria": { x: 0.505, y: 0.479, r: 0.002 },
  "Croatia": { x: 0.490, y: 0.467, r: 0.002 },
  "Czech Republic": { x: 0.488, y: 0.450, r: 0.002 },
  "Denmark": { x: 0.477, y: 0.422, r: 0.020 },
  "Estonia": { x: 0.506, y: 0.411, r: 0.004 },
  "Finland": { x: 0.508, y: 0.383, r: 0.008 },
  "France": { x: 0.468, y: 0.461, r: 0.014 },
  "Germany": { x: 0.480, y: 0.444, r: 0.003 },
  "Greece": { x: 0.499, y: 0.492, r: 0.002 },
  "Hungary": { x: 0.495, y: 0.459, r: 0.002 },
  "Iceland": { x: 0.432, y: 0.380, r: 0.008 },
  "Ireland": { x: 0.448, y: 0.436, r: 0.003 },
  "Italy": { x: 0.485, y: 0.481, r: 0.008 },
  "Kosovo": { x: 0.496, y: 0.480, r: 0.001 },
  "Latvia": { x: 0.504, y: 0.418, r: 0.002 },
  "Lithuania": { x: 0.503, y: 0.427, r: 0.002 },
  "Luxembourg": { x: 0.474, y: 0.453, r: 0.001 },
  "Malta": { x: 0.487, y: 0.505, r: 0.001 },
  "Moldova": { x: 0.511, y: 0.460, r: 0.002 },
  "Montenegro": { x: 0.495, y: 0.478, r: 0.001 },
  "Netherlands": { x: 0.472, y: 0.438, r: 0.002 },
  "North Macedonia": { x: 0.499, y: 0.481, r: 0.001 },
  "Norway": { x: 0.478, y: 0.395, r: 0.006 },
  "Poland": { x: 0.494, y: 0.439, r: 0.003 },
  "Portugal": { x: 0.448, y: 0.490, r: 0.002 },
  "Romania": { x: 0.505, y: 0.467, r: 0.008 },
  "Russia": { x: 0.623, y: 0.391, r: 0.090 },
  "Serbia": { x: 0.497, y: 0.473, r: 0.002 },
  "Slovakia": { x: 0.495, y: 0.454, r: 0.002 },
  "Slovenia": { x: 0.486, y: 0.464, r: 0.001 },
  "Spain": { x: 0.458, y: 0.489, r: 0.003 },
  "Sweden": { x: 0.490, y: 0.389, r: 0.007 },
  "Switzerland": { x: 0.477, y: 0.462, r: 0.002 },
  "UK": { x: 0.458, y: 0.434, r: 0.007 },
  "Ukraine": { x: 0.517, y: 0.452, r: 0.011 }


};


// Maps our display names → exact GeoJSON property names
const GEO_NAME_MAP: Record<string, string> = {
  "UK":                        "England",
  "UAE":                       "United Arab Emirates",
  "DR Congo":                  "Democratic Republic of the Congo",
  "Republic of Congo":         "Republic of the Congo",
  "Tanzania":                  "United Republic of Tanzania",
  "Ivory Coast":               "Ivory Coast",
  "Guinea-Bissau":             "Guinea Bissau",
  "North Macedonia":           "Macedonia",
  "Eswatini":                  "Swaziland",
  "Timor-Leste":               "East Timor",
  "Serbia":                    "Republic of Serbia",
  "Bahamas":                   "The Bahamas",
  "Palestine":                 "West Bank",
  "Dominican Republic":        "Dominican Republic",
};

// ---------------------------------------------------------------------------
// Web Audio synthesis for the visualization screen
// ---------------------------------------------------------------------------
let _vizCtx: AudioContext | null = null;

function getVizAudioCtx(): AudioContext | null {
  try {
    if (!_vizCtx) _vizCtx = new AudioContext();
    if (_vizCtx.state === 'suspended') _vizCtx.resume();
    return _vizCtx;
  } catch { return null; }
}

/** Tiny pitched click — played per leaf as it appears (throttled in caller) */
function playLeafLand(ctx: AudioContext) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  const pitch = 700 + Math.random() * 500;
  osc.frequency.setValueAtTime(pitch, t);
  osc.frequency.exponentialRampToValueAtTime(pitch * 0.55, t + 0.05);
  g.gain.setValueAtTime(0.07, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(t); osc.stop(t + 0.06);
}

/** Ascending filtered-noise sweep — played when zooming in */
function playZoomIn(ctx: AudioContext) {
  const dur = 1.3;
  const t = ctx.currentTime;
  const buf = ctx.createBuffer(1, Math.round(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.setValueAtTime(150, t);
  filt.frequency.exponentialRampToValueAtTime(1100, t + dur);
  filt.Q.value = 3;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.09, t + 0.25);
  g.gain.linearRampToValueAtTime(0.04, t + dur);
  src.connect(filt); filt.connect(g); g.connect(ctx.destination);
  src.start(t);
}

/** Descending filtered-noise sweep — played when zooming out */
function playZoomOut(ctx: AudioContext) {
  const dur = 1.3;
  const t = ctx.currentTime;
  const buf = ctx.createBuffer(1, Math.round(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.setValueAtTime(1100, t);
  filt.frequency.exponentialRampToValueAtTime(150, t + dur);
  filt.Q.value = 3;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.09, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filt); filt.connect(g); g.connect(ctx.destination);
  src.start(t);
}

/** Soft resonant chord — played once path drawing finishes */
function playPathDone(ctx: AudioContext) {
  const t = ctx.currentTime;
  [220, 277.2, 330].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t + i * 0.12);
    g.gain.linearRampToValueAtTime(0.07, t + i * 0.12 + 0.25);
    g.gain.linearRampToValueAtTime(0.05, t + 1.5);
    g.gain.exponentialRampToValueAtTime(0.001, t + 3.2);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t + i * 0.12); osc.stop(t + 3.2);
  });
}
// ---------------------------------------------------------------------------

type PathEntry = {
  id: string;
  countries: string[];
  leafPath: string;
  color?: string;
  leafScale?: number;
  timestamp: number;
};

/**
 * Apply the target transform as a CSS transition so the browser can GPU-composite it.
 * SVG filter elements prevent GPU compositing when using attr('transform'), but
 * CSS transform bypasses that and runs on the compositor thread.
 */
function setCSSTransform(
  el: SVGGElement,
  tx: number,
  ty: number,
  scale: number,
  durationMs: number
): Promise<void> {
  return new Promise(resolve => {
    el.style.willChange = 'transform';
    el.style.transition = `transform ${durationMs}ms cubic-bezier(0.45,0,0.55,1)`;
    el.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`;
    const onEnd = () => { el.removeEventListener('transitionend', onEnd); resolve(); };
    el.addEventListener('transitionend', onEnd);
    // Safety fallback in case transitionend doesn't fire (e.g. no change)
    setTimeout(resolve, durationMs + 50);
  });
}

/** Smooth zoom to the bounding box of a set of map points */
function zoomToBBox(
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  points: [number, number][],
  svgWidth: number,
  svgHeight: number,
  duration = 1400
): Promise<void> {
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const pad = Math.min(svgWidth, svgHeight) * 0.12;
  const x0 = Math.min(...xs) - pad;
  const x1 = Math.max(...xs) + pad;
  const y0 = Math.min(...ys) - pad - svgHeight * 0.12;
  const y1 = Math.max(...ys) + pad;
  const bw = Math.max(x1 - x0, 1);
  const bh = Math.max(y1 - y0, 1);
  const scale = Math.min(svgWidth / bw, svgHeight / bh, 6);
  const tx = svgWidth / 2 - scale * (x0 + x1) / 2;
  const ty = svgHeight / 2 - scale * (y0 + y1) / 2;
  return setCSSTransform(container.node()!, tx, ty, scale, duration);
}

/** Smooth zoom back to identity */
function zoomOut(
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  duration = 1400
): Promise<void> {
  return setCSSTransform(container.node()!, 0, 0, 1, duration);
}

/** Simple awaitable sleep */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// function appendPaintedLeaf(
//   parent: d3.Selection<SVGGElement, unknown, null, undefined>,
//   stampShape: string,
//   x: number,
//   y: number,
//   scale: number,
//   color: string,
//   opacity: number,
// ) {
//   const paint = createLeafPaintStyle(color, stampShape);
  
//   // 1. The Container: D3 uses this to place the leaf at the coordinates (x,y)
//   const leaf = parent.append('g')
//     .attr('transform', `translate(${x},${y}) scale(${scale})`)
//     .style('opacity', opacity);

//   // 2. The Flutter Group: CSS uses this to animate the "wind" sway
//   // Note: All actual drawing paths are now appended to 'flutterGroup'
//   const flutterGroup = leaf.append('g')
//     .attr('class', 'path-leaf')
//     .style('--flutter-delay', `${(Math.random() * -4).toFixed(2)}s`)
//     // .style('filter', 'url(#watercolor)');

//   // const branchInk = 'rgba(38,30,19,0.88)';
//   // const warmShadow = 'rgba(94,59,37,0.26)';
//   // const glowWash = 'rgba(246,236,222,0.18)';
// //   const branchInk = 'rgba(20,15,10,1)'; // Darker, fully opaque
// // const warmShadow = 'rgba(50,30,20,0.5)'; // Heavier shadow
// // const glowWash = 'rgba(255,255,255,0.4)'; // Brighter, more opaque highlight

// const branchInk = '#1a140f'; // Solid dark brown
// const warmShadow = '#321e14'; // Solid deep shadow
// const glowWash = '#ffffff';   // Solid white highlight
//   // --- START DRAWING (All appended to flutterGroup) ---

//   flutterGroup.append('path')
//     .attr('d', stampShape)
//     .attr('fill', warmShadow)
//     // .attr('transform', 'translate(0.95,1.35) scale(1.05 1.03)');

//   flutterGroup.append('path')
//     .attr('d', stampShape)
//     .attr('fill', paint.fillB)
//     // .attr('opacity', 0.48);

//   flutterGroup.append('path')
//     .attr('d', stampShape)
//     .attr('fill', paint.fillA)
//     .attr('opacity', 0.58);

//   flutterGroup.append('path')
//     .attr('d', stampShape)
//     .attr('fill', paint.fillC)
//     .attr('transform', 'translate(-0.8,-0.65) scale(0.92 0.8)')
//     .attr('opacity', 0.36);

//   flutterGroup.append('path')
//     .attr('d', stampShape)
//     .attr('fill', glowWash)
//     .attr('transform', 'translate(-0.35,-0.3) scale(0.98 0.94)')
//     .attr('opacity', 0.34);

//   const clipped = flutterGroup.append('g').attr('clip-path', null);
//   clipped.append('clipPath')
//     .attr('id', `leaf-clip-${Math.random().toString(36).slice(2, 9)}`)
//     .append('path')
//     .attr('d', stampShape);

//   const clipId = clipped.select('clipPath').attr('id');
//   const paintedBody = flutterGroup.append('g').attr('clip-path', `url(#${clipId})`);

// // For the brush strokes, use a very high opacity (0.8+)
// paint.brushPaths.forEach((brush, index) => {
//   paintedBody.append('path')
//     .attr('d', brush)
//     .attr('fill', 'none')
//     .attr('stroke', index % 2 === 0 ? paint.fillC : paint.shadow)
//     .attr('stroke-width', 1.4)
//     .attr('stroke-linecap', 'round')
//     .attr('opacity', 0.85); // High opacity for "thick" paint feel
// });

//   paint.brushPaths.slice(0, 3).forEach((brush, index) => {
//     paintedBody.append('path')
//       .attr('d', brush)
//       .attr('fill', 'none')
//       .attr('stroke', glowWash)
//       .attr('stroke-width', 0.8 + index * 0.2)
//       .attr('stroke-linecap', 'round')
//       .attr('opacity', 0.16)
//       .attr('transform', `translate(${(-3 + index * 3.5).toFixed(2)},${(-6 + index * 4.1).toFixed(2)}) rotate(${(6 - index * 4)})`);
//   });

//   paint.brushPaths.slice(0, 5).forEach((brush, index) => {
//     flutterGroup.append('path')
//       .attr('d', brush)
//       .attr('fill', 'none')
//       .attr('stroke', branchInk)
//       .attr('stroke-width', 0.46 + index * 0.11)
//       .attr('stroke-linecap', 'round')
//       .attr('opacity', 0.34)
//       .attr('transform', `translate(${(-6.5 + index * 2.6).toFixed(2)},${(-11 + index * 4.2).toFixed(2)}) rotate(${(-12 + index * 5)}) scale(1.08 0.94)`);
//   });

//   flutterGroup.append('path')
//     .attr('d', stampShape)
//     .attr('fill', 'none')
//     .attr('stroke', branchInk)
//     .attr('stroke-width', 0.78)
//     .attr('stroke-linecap', 'round')
//     .attr('stroke-linejoin', 'round')
//     .attr('opacity', 0.3);

//   flutterGroup.append('path')
//     .attr('d', stampShape)
//     .attr('fill', 'none')
//     .attr('stroke', 'rgba(117,54,89,0.4)')
//     .attr('stroke-width', 0.38)
//     .attr('stroke-linecap', 'round')
//     .attr('stroke-linejoin', 'round')
//     .attr('transform', 'translate(0.2,0.15)')
//     .attr('opacity', 0.42);

//   paint.speckles.slice(0, 8).forEach((speck, index) => {
//     paintedBody.append('ellipse')
//       .attr('cx', Number(speck.x))
//       .attr('cy', Number(speck.y))
//       .attr('rx', Number(speck.rx) * (index % 2 === 0 ? 1.8 : 1.1))
//       .attr('ry', Number(speck.ry) * (index % 2 === 0 ? 1.2 : 0.95))
//       .attr('fill', index % 3 === 0 ? glowWash : paint.speck)
//       .attr('opacity', Number(speck.opacity) * 0.9);
//   });

//   return leaf;
// }

// function appendPaintedLeaf(
//   parent: d3.Selection<SVGGElement, unknown, null, undefined>,
//   stampShape: string,
//   x: number,
//   y: number,
//   scale: number,
//   color: string,
//   opacity: number,
// ) {
//   const paint = createLeafPaintStyle(color, stampShape);
  
//   const leaf = parent.append('g')
//     .attr('transform', `translate(${x},${y}) scale(${scale})`);

//   const flutterGroup = leaf.append('g')
//     .attr('class', 'path-leaf')
//     .style('--flutter-delay', `${(Math.random() * -4).toFixed(2)}s`);
//     // Re-enable this ONLY if you want the soft watercolor blur back:
//     // .style('filter', 'url(#watercolor)');

//   // 1. THE PRIMER (Solid color base so background doesn't bleed through)
//   flutterGroup.append('path')
//     .attr('d', stampShape)
//     .attr('fill', color)
//     .attr('opacity', 1);

//   // 2. THE INK (Restoring the dark, sketchy details)
//   const branchInk = 'rgba(30, 25, 20, 0.85)'; // Dark brown-black, NOT white


//   flutterGroup.append('path')
//     .attr('d', stampShape)
//     .attr('fill', 'none')
//     .attr('stroke', branchInk)
//     .attr('stroke-width', 0.8)
//     .attr('opacity', 0.6);

//   // 3. THE BODY (Watercolor layers with high density)
//   flutterGroup.append('path')
//     .attr('d', stampShape)
//     .attr('fill', paint.fillB)
//     .attr('opacity', 0.8);

//   flutterGroup.append('path')
//     .attr('d', stampShape)
//     .attr('fill', paint.fillA)
//     .attr('opacity', 0.7);

//   // 4. BRUSH STROKES (Restoring the dark texture lines)
//   paint.brushPaths.forEach((brush, index) => {
//     flutterGroup.append('path')
//       .attr('d', brush)
//       .attr('fill', 'none')
//       // Use the journey color mixed with dark ink for the strokes
//       .attr('stroke', index % 2 === 0 ? paint.shadow : branchInk)
//       .attr('stroke-width', 1.5)
//       .attr('stroke-linecap', 'round')
//       .attr('opacity', 0.75); // High visibility but not "solid white"
//   });

//   return leaf;
// }

function appendPaintedLeaf(
  parent: d3.Selection<SVGGElement, unknown, null, undefined>,
  stampShape: string,
  x: number,
  y: number,
  scale: number,
  color: string,
  opacity: number,
) {
  const paint = createLeafPaintStyle(color, stampShape);
  
  const leaf = parent.append('g')
    .attr('transform', `translate(${x},${y}) scale(${scale})`);

  const flutterGroup = leaf.append('g')
    .attr('class', 'path-leaf')
    .style('--flutter-delay', `${(Math.random() * -4).toFixed(2)}s`);

  // 1. THE SOLID BASE (Provides the punchy color)
  flutterGroup.append('path')
    .attr('d', stampShape)
    .attr('fill', color)
    .attr('opacity', 1);

  // 2. THE INK OUTLINE (Provides the "sketchy" definition)
  // This gives the tree its hand-drawn feel without the messy internal lines.
  flutterGroup.append('path')
    .attr('d', stampShape)
    .attr('fill', 'none')
    .attr('stroke', 'rgba(30, 25, 20, 0.7)') 
    .attr('stroke-width', 1.2)
    .attr('opacity', 0.6);

  // 3. THE TEXTURE LAYERS (Subtle watercolor variations)
  flutterGroup.append('path')
    .attr('d', stampShape)
    .attr('fill', paint.fillB)
    .attr('opacity', 0.6);

  flutterGroup.append('path')
    .attr('d', stampShape)
    .attr('fill', paint.fillA)
    .attr('opacity', 0.5);

  // NOTE: The 'paint.brushPaths.forEach' loop has been REMOVED 
  // to eliminate the "seven lines" over each leaf.

  return leaf;
}

export default function Viz() {
  const [statusText, setStatusText] = useState('WAITING FOR A NEW TRAVELLER...');
  const [audioUnlocked, setAudioUnlocked] = useState(false);
const [mapReady, setMapReady] = useState(false);

  // AudioContext MUST be created inside a synchronous user-gesture handler.
  // The operator taps the screen once at startup; after that sounds work for
  // the entire session regardless of how animations are triggered.
  const unlockAudio = () => {
    if (audioUnlocked) return;
    try {
      if (!_vizCtx) _vizCtx = new AudioContext();
      if (_vizCtx.state === 'suspended') _vizCtx.resume();
      setAudioUnlocked(true);
    } catch {}
  };
  const svgRef = useRef<SVGSVGElement>(null);
  const getCentroidRef = useRef<((countryName: string, pathId?: string) => [number, number] | null) | null>(null);
  const pathsLayerRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const zoomContainerRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const worldDataRef = useRef<any>(null);
  const storedPathsRef = useRef<PathEntry[]>([]);
  // Prevents concurrent zoom animations; queues next path if one is in flight
  const animatingRef = useRef(false);
  const pendingRef = useRef<PathEntry[]>([]);

  /** Draw a path statically (no zoom, used for initial load and resize redraw) */
const drawPath = (p: PathEntry, animate: boolean) => {
  const pathsLayer = pathsLayerRef.current;
  if (!pathsLayer) return;

  // We now use the FIXED viewBox dimensions for the math
  const w = 1920; 
  const h = 1080;

  const points = p.countries.map(c => {
    const data = ARTISTIC_COORDS[c];
    if (!data) return null;

    let offsetX = 0;
    let offsetY = 0;
    if (p.id) {
      const seed = p.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      offsetX = (Math.sin(seed * 567.8) * data.r) * w;
      offsetY = (Math.cos(seed * 123.4) * data.r) * h;
    }
    return [(data.x * w) + offsetX, (data.y * h) + offsetY] as [number, number];
  }).filter(Boolean) as [number, number][];
  
  // Safety: If the map isn't sized yet, don't draw anything
  if (p.countries.length > 0 && points.length === 0) return;

  const color = p.color || '#5ecf3e';
  const scale = 1.4;
  const stampShape = p.leafPath || DEFAULT_LEAF;
  const group = pathsLayer.append('g').attr('data-path-id', p.id);

  if (points.length > 1) {
    const lineGen = d3.line<[number, number]>()
      .x(d => d[0]).y(d => d[1])
      .curve(d3.curveCatmullRom.alpha(0.5));

    const pathString = lineGen(points);
    if (pathString) {
      const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      tempPath.setAttribute('d', pathString);
      const totalLength = tempPath.getTotalLength();
      const leafSpacing = 52 * scale;
      const numLeaves = Math.floor(totalLength / leafSpacing);
      const leafPoints: { x: number; y: number }[] = [];
      for (let i = 0; i <= numLeaves; i++) {
        const pt = tempPath.getPointAtLength(i * leafSpacing);
        leafPoints.push({ x: pt.x, y: pt.y });
      }

   group
  .selectAll<SVGGElement, (typeof leafPoints)[number]>('.path-leaf')
  .data(leafPoints)
  .join(enter => enter.append('g'))
  .attr('class', 'path-leaf')
  .call(sel => {
    sel.each(function (d) {
      const leaf = d3.select(this);
      leaf.selectAll('*').remove();
      
      // ADDED: Solid Underlay to prevent the "faint" look
      leaf.append('path')
  .attr('d', stampShape)
  .attr('fill', color)
  .attr('opacity', 1.0);// This acts as a primer for the paint

      appendPaintedLeaf(leaf as any, stampShape, 0, 0, 1, color, 1);
      leaf.style('transform', `translate(${d.x}px, ${d.y}px) scale(${scale})`, 'important');
    });
    
    if (animate) {
      sel.style('opacity', 0)
        .transition()
        .duration(300)
        .style('opacity', BASE_OPACITY, 'important');
    }
  });
    }
  }

  // Draw end-cap circles if animating
  if (animate) {
    points.forEach(pt => {
      group.append('circle')
        .attr('cx', pt[0]).attr('cy', pt[1])
        .attr('r', 6 * scale).attr('fill', color)
        .style('opacity', 0.9)
        .transition().duration(600).style('opacity', 0.7).attr('r', 18 * scale)
        .transition().duration(400).style('opacity', 0).attr('r', 28 * scale)
        .remove();
    });
  }
};
// const fadeExistingPaths = (newId: string) => {
//   const pathsLayer = pathsLayerRef.current;
//   const history = storedPathsRef.current;
//   if (!pathsLayer || !history.length) return;

//   pathsLayer.selectAll<SVGGElement, unknown>('g[data-path-id]')
//     .each(function () {
//       const g = d3.select(this);
//       const pathId = g.attr('data-path-id');
//       if (pathId === newId) return;

//       const idx = history.findIndex(h => h.id === pathId);
//       if (idx === -1) return;

//       // EXTREMELY AGGRESSIVE VIBRANCY: 
//       // Instead of letting them fade to 0.1, we lock them at 0.5 minimum.
//       const ageFactor = Math.pow(FADE_FACTOR, history.length - 1 - idx);
//       const targetOpacity = Math.max(0.50, BASE_OPACITY * ageFactor);

//       g.selectAll('.path-leaf')
//         .interrupt() // STOP any current transitions
//         .style('opacity', targetOpacity.toFixed(2), 'important');
//     });
// };

const fadeExistingPaths = (newId: string) => {
  const pathsLayer = pathsLayerRef.current;
  const history = storedPathsRef.current;
  if (!pathsLayer || !history.length) return;

  pathsLayer.selectAll<SVGGElement, unknown>('g[data-path-id]')
    .each(function () {
      const g = d3.select(this);
      const pathId = g.attr('data-path-id');
      if (pathId === newId) return;

      // Dim the old leaves to 0.35 during the zoom/label sequence
      g.selectAll('.path-leaf')
        .transition().duration(800)
        .style('opacity', '0.35', 'important');
    });
};
  /**
   * Animated path: zoom in → draw leaves progressively + country labels → hold → zoom out.
   * Drains pendingRef after finishing so queued submissions also animate.
   */

// PASTE THIS ABOVE animateNewPath
// const redrawStoredPaths = () => {
//   const pathsLayer = pathsLayerRef.current;
//   const history = storedPathsRef.current;
//   if (!pathsLayer || !history.length) return;

//   pathsLayer.selectAll('*').remove();

//   history.forEach((p, i) => {
//     drawPath(p, false);
//     const ageFactor = Math.pow(FADE_FACTOR, history.length - 1 - i);
    
//     // Using our high 0.70 vibrancy floor
//     const targetOpacity = Math.max(0.70, BASE_OPACITY * ageFactor);

//     pathsLayer
//       .select(`g[data-path-id="${p.id}"]`)
//       .selectAll('.path-leaf')
//       .interrupt()
//       .style('opacity', targetOpacity.toFixed(2), 'important');
//   });
// };

const redrawStoredPaths = () => {
  const pathsLayer = pathsLayerRef.current;
  const history = storedPathsRef.current;
  if (!pathsLayer || !history.length) return;

  history.forEach((p, i) => {
    // 1. Check if the leaf group already exists
    let group = pathsLayer.select(`g[data-path-id="${p.id}"]`);
    
    // 2. If it doesn't exist (initial load), create it at 0 opacity
    if (group.empty()) {
      drawPath(p, false);
      group = pathsLayer.select(`g[data-path-id="${p.id}"]`);
      group.selectAll('.path-leaf').style('opacity', 0);
    }

    // 3. Calculate target vibrancy (your 0.70 floor)
    const ageFactor = Math.pow(FADE_FACTOR, history.length - 1 - i);
    const targetOpacity = Math.max(0.70, BASE_OPACITY * ageFactor);

    // 4. THE SMOOTH BLOOM
    // We transition from whatever the current opacity is (0.35 or 0) 
    // up to the target exhibition vibrancy.
    group.selectAll('.path-leaf')
      .interrupt() 
      .transition()
      .duration(2000) // 2 seconds for an elegant, slow grow
      .ease(d3.easeCubicOut)
      .style('opacity', targetOpacity.toFixed(2), 'important');
  });
};

  const animateNewPath = async (p: PathEntry) => {
    animatingRef.current = true;
    try {
      const getCentroid = getCentroidRef.current;
      const pathsLayer = pathsLayerRef.current;
      const zoomContainer = zoomContainerRef.current;
      const svgEl = svgRef.current;
      if (!getCentroid || !pathsLayer || !zoomContainer || !svgEl) return;

const points = p.countries.map(c => getCentroid(c, p.id)).filter(Boolean) as [number, number][];      if (points.length < 1) return;

      const color = p.color || '#5ecf3e';
      const leafScale = 1.4;
      const stampShape = p.leafPath || DEFAULT_LEAF;
      const W = svgEl.clientWidth;
      const H = svgEl.clientHeight;

      fadeExistingPaths(p.id);

      const svgSel = d3.select(svgEl);
      svgSel.select('.tree-trunk').attr('filter', null);

      // 1 — Zoom in to the bounding box of all selected countries
      const actx = getVizAudioCtx();
      if (actx) playZoomIn(actx);
      // await zoomToBBox(zoomContainer, points, W, H);
      await zoomToBBox(zoomContainer, points, 1920, 1080);

      const group = pathsLayer.append('g').attr('data-path-id', p.id);

      if (points.length === 1) {
        // Single country — just place a leaf and pulse
        appendPaintedLeaf(group, stampShape, points[0][0], points[0][1], leafScale, color, 0)
          .transition().duration(400).style('opacity', BASE_OPACITY);
      } else {
        // 2 — Build curved path and draw leaves one by one
        const lineGen = d3.line<[number, number]>()
          .x(d => d[0]).y(d => d[1])
          .curve(d3.curveCatmullRom.alpha(0.5));

        const pathString = lineGen(points);
        if (pathString) {
          const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          tempPath.setAttribute('d', pathString);
          const totalLength = tempPath.getTotalLength();

          // Spacing in SVG units — 40px apart at scale=1
          const leafSpacing = 40 * leafScale;
          const numLeaves = Math.max(1, Math.floor(totalLength / leafSpacing));
          // Total draw time ~1.8s regardless of path length
          const delay = Math.max(10, Math.min(60, 1800 / numLeaves));
          // Play a leaf-land sound every N leaves so it doesn't overwhelm
          const soundEvery = Math.max(1, Math.round(numLeaves / 12));

          for (let i = 0; i <= numLeaves; i++) {
            const pt = tempPath.getPointAtLength((i / numLeaves) * totalLength);
            appendPaintedLeaf(group, stampShape, pt.x, pt.y, leafScale, color, 0)
              .transition()
              .duration(250)
              .style('opacity', BASE_OPACITY);
            if (actx && i % soundEvery === 0) playLeafLand(actx);
            await sleep(delay);
          }
        }
      }

      // Path drawing done — play resonant chord
      if (actx) playPathDone(actx);

      // 3 — Glow pulse + country name label at each country point
    // 3 — Glow pulse + country name label at each country point
      p.countries.forEach((name, idx) => {
        const pt = getCentroid(name, p.id); // Passing p.id for artistic consistency
        if (!pt) return;

        // Expanding ring pulse
        group.append('circle')
          .attr('cx', pt[0]).attr('cy', pt[1])
          .attr('r', 4 * leafScale).attr('fill', color)
          .style('opacity', 0.95)
          .transition().duration(700).style('opacity', 0.6).attr('r', 22 * leafScale)
          .transition().duration(500).style('opacity', 0).attr('r', 34 * leafScale)
          .remove();

        // --- NEW PILL LABEL LOGIC ---
        const labelGroup = group.append('g')
          .attr('class', 'label-group')
          .style('opacity', 0);

        // 1. Add the text first so we can measure it
        const labelText = labelGroup.append('text')
          .attr('class', 'country-label-text')
.attr('fill', '#000000')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
       .style('font-family', 'SoberDoctor, sans-serif') // USE THE CUSTOM FONT NAME HERE
  .style('font-size', `${Math.round(14 * leafScale)}px`) // Hand-drawn fonts often need a bit more size
          .text(name);

        // 2. Measure the text to size the pill
        const bbox = (labelText.node() as SVGTextContentElement).getBBox();
        const paddingH = 10;
        const paddingV = 5;

        // 3. Add the Pill (Background) behind the text
        labelGroup.insert('rect', 'text') // Inserts BEFORE text so it's behind
          .attr('class', 'country-label-pill')
          .attr('x', bbox.x - paddingH)
          .attr('y', bbox.y - paddingV)
          .attr('width', bbox.width + paddingH * 2)
          .attr('height', bbox.height + paddingV * 2)
          .attr('rx', (bbox.height + paddingV * 2) / 2) // Fully rounded ends
          .attr('fill', color) // Pill is the unique journey color
          .style('filter', 'drop-shadow(0px 2px 3px rgba(0,0,0,0.4))');

        // 4. Position the whole label group above the point
        labelGroup.attr('transform', `translate(${pt[0]}, ${pt[1] - 25 * leafScale})`);

        // 5. Animate the label in
        labelGroup.transition()
          .delay(idx * 150)
          .duration(600)
          .style('opacity', 1);
      });

      // 4 — Hold so the viewer can read the countries
      await sleep(2800);

    // 5 — Fade labels out before zooming back
      group.selectAll('.label-group')
        .transition().duration(600).style('opacity', 0);
      await sleep(650);

      // 6 — Zoom back out
      if (actx) playZoomOut(actx);
      await zoomOut(zoomContainer);

      // --- ADD THIS LINE HERE ---
      // This forces the "Hard State" redraw of all 23+ leaves
      // at their vibrant 0.70+ opacity floor.
      redrawStoredPaths(); 

      svgSel.select('.tree-trunk').attr('filter', 'url(#watercolor)');
    } finally {
      animatingRef.current = false;
      const next = pendingRef.current.shift();
      if (next) animateNewPath(next);
    }
  };

  /** Build (or rebuild) the D3 map. Called on load and on every resize. */
const initMap = (clearExisting = false) => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    
    // 1. FIXED COORDINATE MATH: Sync with your new ViewBox (1920x1080)
    const getCentroid = (countryName: string, pathId?: string): [number, number] | null => {
        const data = ARTISTIC_COORDS[countryName];
        
        // We now use the FIXED world-space units defined in your ViewBox
        const w = 1920; 
        const h = 1080;

        if (!data) return null;

        let offsetX = 0;
        let offsetY = 0;
        
        if (pathId) {
            const seed = pathId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
            offsetX = (Math.sin(seed * 567.8) * data.r) * w;
            offsetY = (Math.cos(seed * 123.4) * data.r) * h;
        }

        return [
            (data.x * w) + offsetX,
            (data.y * h) + offsetY
        ];
    };

    getCentroidRef.current = getCentroid;

    // Use internal units for logic, so we don't return early if clientWidth is 0
    const width = 1920;
    const height = 1080;

    // 2. Link the Zoom Container
    const zoomContainer = svg.select('.zoom-root');
    if (!animatingRef.current) {
        // Keep translate at 0,0 since D3 now handles the viewbox scaling
        (zoomContainer.node() as SVGGElement).style.transform = 'translate(0px,0px) scale(1)';
    }
    zoomContainerRef.current = zoomContainer as any;

    // 3. Link the Paths Layer
    const pathsLayer = svg.select('#paths-layer');
    if (clearExisting && !animatingRef.current) {
        pathsLayer.selectAll('*').remove();
    }
    pathsLayerRef.current = pathsLayer as any;
};



useEffect(() => {
  // 1. Define tryDraw so it can be called from anywhere in the effect
  // 1. Move redrawStoredPaths INSIDE here


  // 2. Define tryDraw so it can call the fresh redrawStoredPaths
  const tryDraw = () => {
    svgRef.current?.getBoundingClientRect();
    initMap(); 
    const measuredWidth = svgRef.current?.getBoundingClientRect().width || 0;
    
    if (getCentroidRef.current && pathsLayerRef.current && measuredWidth > 800) {
      redrawStoredPaths();
      setMapReady(true); 
    } else {
      setTimeout(tryDraw, 300);
    }
  };

  const fetchHistoricalLeaves = async () => {
    const { data, error } = await supabase
      .from('leaves')
      .select('*')
      .order('created_at', { ascending: true });

    if (data) {
      const formattedHistory: PathEntry[] = data.map(d => ({
        id: d.id,
        leafPath: d.path_data,
        color: d.color,
        countries: d.countries,
        leafScale: 1.4,
        timestamp: new Date(d.created_at).getTime() 
      }));

      // Store all 23 records in the ref before calling tryDraw
      storedPathsRef.current = formattedHistory;
      tryDraw();
    }
  };

  // Load Map Geometry first
  d3.json('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
    .then((data: any) => {
      worldDataRef.current = data;
      initMap();
      // Brief delay to allow the browser to paint the background video
      setTimeout(fetchHistoricalLeaves, 500);
    });

  // Resize handling for the 32-inch exhibition monitor
  const observer = new ResizeObserver(() => {
if (!worldDataRef.current || !mapReady) return; // Wait until the map is ready
  initMap();
  redrawStoredPaths();
  });
  if (svgRef.current) observer.observe(svgRef.current);

  // Real-time listener for new participants
  const channel = supabase
    .channel('schema-db-changes')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'leaves' }, 
      (payload) => {
        const newPath: PathEntry = {
          id: payload.new.id,
          leafPath: payload.new.path_data,
          color: payload.new.color,
          countries: payload.new.countries,
          leafScale: 1.4,
          timestamp: Date.now()
        };
        storedPathsRef.current = [...storedPathsRef.current, newPath];
        if (animatingRef.current) {
          pendingRef.current.push(newPath);
        } else {
          animateNewPath(newPath);
        }
        setStatusText("A NEW LEAF BELONGS");
      }
    )
    .subscribe();

  return () => {
    observer.disconnect();
    supabase.removeChannel(channel);
  };
}, []);

return (
<div 
  className="w-full h-screen overflow-hidden relative bg-[#0f0f0f]" 
  onClick={unlockAudio}
>
<style>{`
  #paths-layer {
    /* REMOVED: will-change and backface-visibility */
    /* These were likely causing the 'washed out' rendering path */
    isolation: isolate; /* Forces the group to render solidly before blending */
    transform-box: fill-box;

  }

  .path-leaf {
   shape-rendering: geometricPrecision;
  animation: leafFlutter 4s ease-in-out infinite;
  animation-delay: var(--flutter-delay, 0s);
  transform-origin: center;
  transform-box: fill-box;
  
  /* NEW: Force the browser to ignore transparency and blend like solid paint */
  isolation: isolate;
  mix-blend-mode: source-over; 
  image-rendering: pixelated; /* Forces sharp, high-contrast edges */
  }

  @font-face {
    font-family: 'SoberDoctor';
    src: url('/fonts/SoberDoctor-Regular.otf') format('opentype');
    font-weight: normal;
    font-style: normal;
  }

  .font-sober {
    font-family: 'SoberDoctor', sans-serif !important;
  }

  @keyframes leafFlutter {
    0% { transform: rotate(0deg) translate(0px, 0px); }
    33% { transform: rotate(2deg) translate(1px, -1px); }
    66% { transform: rotate(-1.5deg) translate(-0.5px, 1px); }
    100% { transform: rotate(0deg) translate(0px, 0px); }
  }

  .country-label-pill {
    rx: 12px;
    ry: 12px;
    filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5));
  }

  .country-label-text {
    font-family: 'SoberDoctor', sans-serif !important;
    fill: #000000 !important;
    font-weight: normal;
    text-transform: none;
    user-select: none;
    pointer-events: none;
  }

  .label-group {
    pointer-events: none;
  }

  .label-group rect, .label-group text {
    animation: none !important; 
  }
`}</style>

<svg 
  ref={svgRef} 
  viewBox="0 0 1920 1080" 
  width="100%"
  height="100%"
  preserveAspectRatio="xMidYMid slice"
  className="w-full h-full absolute inset-0 z-10 bg-transparent"
>
  <defs>
    {/* Watercolor filter remains here */}
  </defs>

  {/* THE ZOOM ROOT: Everything inside here moves when we zoom */}
  <g className="zoom-root" style={{ transformOrigin: '0 0' }}>
    
    {/* 1. Video Background: Now inside the zoom group */}
    <foreignObject x="0" y="0" width="1920" height="1080" style={{ pointerEvents: 'none' }}>
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      >
        <source src="/treemap-dark-animated.mp4" type="video/mp4" />
      </video>
    </foreignObject>

    {/* 2. Path Layer: On top of the video, moving in sync */}
    <g id="paths-layer" />
  </g>
</svg>

    {/* Quote + status overlay */}
<div className="absolute top-8 left-0 right-0 text-center z-20 px-8 pointer-events-none font-sober">
  {/* Changed 'text-amber-50/80' to 'text-black' */}
  <h1 className="text-2xl md:text-4xl text-black mb-3 drop-shadow-sm leading-snug">
    "Our routes become our roots, wherever our lives may lead us to be.<br />
    Across continents and generations, part of one belonging tree."
  </h1>
  
  {/* Changed 'text-white/60' to 'text-black/70' */}
  <p className="text-xl text-black/70 animate-pulse tracking-widest drop-shadow-sm mt-6">
    {statusText}
  </p>
</div>

{/* Bottom fade into black overlay - Lighter Opacity */}
<div
  className="absolute bottom-0 w-full h-24 pointer-events-none z-20"
  /* Change 0.7 to 0.5 if you want it even lighter */
  style={{ background: 'linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent)' }}
/>

    {!audioUnlocked && (
      <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-30 font-sober">
        <span className="text-white/40 text-sm tracking-wide animate-pulse">
          tap screen to enable sound
        </span>
      </div>
    )}
  </div>
);
}
