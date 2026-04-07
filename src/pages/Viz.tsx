import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import * as d3 from 'd3';

const socket = io();

// ~30×26 unit leaf shape — large enough to read at world-map scale
const DEFAULT_LEAF = 'M0,-13 C5,-13 11,-7 11,0 C11,7 0,13 0,13 C0,13 -11,7 -11,0 C-11,-7 -5,-13 0,-13 Z';
const BASE_OPACITY = 0.9;
const FADE_FACTOR = 0.82;

const GEO_NAME_MAP: Record<string, string> = {
  "USA": "USA",
  "UK": "England",
  "UAE": "United Arab Emirates",
  "South Korea": "South Korea",
  "North Korea": "Dem. Rep. Korea",
  "Dominican Republic": "Dominican Rep.",
  "Papua New Guinea": "Papua New Guinea",
  "El Salvador": "El Salvador",
  "Costa Rica": "Costa Rica",
  "Solomon Islands": "Solomon Is.",
  "Sri Lanka": "Sri Lanka",
};

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

export default function Viz() {
  const [statusText, setStatusText] = useState('WAITING FOR A NEW TRAVELLER...');
  const svgRef = useRef<SVGSVGElement>(null);
  const getCentroidRef = useRef<((name: string) => [number, number] | null) | null>(null);
  const pathsLayerRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const zoomContainerRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const worldDataRef = useRef<any>(null);
  const storedPathsRef = useRef<PathEntry[]>([]);
  // Prevents concurrent zoom animations; queues next path if one is in flight
  const animatingRef = useRef(false);
  const pendingRef = useRef<PathEntry[]>([]);

  /** Draw a path statically (no zoom, used for initial load and resize redraw) */
  const drawPath = (p: PathEntry, animate: boolean) => {
    const getCentroid = getCentroidRef.current;
    const pathsLayer = pathsLayerRef.current;
    if (!getCentroid || !pathsLayer) return;

    const points = p.countries.map(c => getCentroid(c)).filter(Boolean) as [number, number][];
    if (points.length < 1) return;

    const color = p.color || '#5ecf3e';
    const scale = 1;
    const group = pathsLayer.append('g').attr('data-path-id', p.id);

    if (points.length > 1) {
      const lineGen = d3.line<[number, number]>()
        .x(d => d[0]).y(d => d[1])
        .curve(d3.curveBundle.beta(0.8));

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
          .selectAll<SVGPathElement, (typeof leafPoints)[number]>('.path-leaf')
          .data(leafPoints)
          .join('path')
          .attr('class', 'path-leaf')
          .attr('d', DEFAULT_LEAF)
          .attr('transform', d => `translate(${d.x},${d.y}) scale(${scale})`)
          .attr('fill', color)
          .attr('stroke', 'none')
          .style('opacity', animate ? 0 : BASE_OPACITY)
          .call(sel => {
            if (animate) {
              sel.transition()
                .delay((_, i) => i * 8)
                .duration(300)
                .style('opacity', BASE_OPACITY);
            }
          });
      }
    }

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

  const fadeExistingPaths = (newId: string) => {
    const pathsLayer = pathsLayerRef.current;
    if (!pathsLayer) return;
    pathsLayer.selectAll<SVGGElement, unknown>('g[data-path-id]')
      .filter(function () { return d3.select(this).attr('data-path-id') !== newId; })
      .each(function () {
        const g = d3.select(this);
        g.selectAll('.path-leaf').each(function () {
          const el = d3.select(this);
          const cur = parseFloat(el.style('opacity') || String(BASE_OPACITY));
          el.transition().duration(800).style('opacity', Math.max(0.08, cur * FADE_FACTOR));
        });
      });
  };

  /**
   * Animated path: zoom in → draw leaves progressively + country labels → hold → zoom out.
   * Drains pendingRef after finishing so queued submissions also animate.
   */
  const animateNewPath = async (p: PathEntry) => {
    animatingRef.current = true;
    try {
      const getCentroid = getCentroidRef.current;
      const pathsLayer = pathsLayerRef.current;
      const zoomContainer = zoomContainerRef.current;
      const svgEl = svgRef.current;
      if (!getCentroid || !pathsLayer || !zoomContainer || !svgEl) return;

      const points = p.countries.map(c => getCentroid(c)).filter(Boolean) as [number, number][];
      if (points.length < 1) return;

      const color = p.color || '#5ecf3e';
      const leafScale = 1;
      const W = svgEl.clientWidth;
      const H = svgEl.clientHeight;

      fadeExistingPaths(p.id);

      // Temporarily remove the expensive watercolor filter so the zoom runs on the GPU compositor.
      // The filter forces CPU rasterization every frame — removing it during motion is imperceptible.
      const svgSel = d3.select(svgEl);
      svgSel.select('.country-group').attr('filter', null);
      svgSel.select('.tree-trunk').attr('filter', null);

      // 1 — Zoom in to the bounding box of all selected countries
      await zoomToBBox(zoomContainer, points, W, H);

      const group = pathsLayer.append('g').attr('data-path-id', p.id);

      if (points.length === 1) {
        // Single country — just place a leaf and pulse
        group.append('path')
          .attr('class', 'path-leaf')
          .attr('d', DEFAULT_LEAF)
          .attr('transform', `translate(${points[0][0]},${points[0][1]}) scale(${leafScale})`)
          .attr('fill', color).attr('stroke', 'none')
          .style('opacity', 0)
          .transition().duration(400).style('opacity', BASE_OPACITY);
      } else {
        // 2 — Build curved path and draw leaves one by one
        const lineGen = d3.line<[number, number]>()
          .x(d => d[0]).y(d => d[1])
          .curve(d3.curveBundle.beta(0.8));

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

          for (let i = 0; i <= numLeaves; i++) {
            const pt = tempPath.getPointAtLength((i / numLeaves) * totalLength);
            group.append('path')
              .attr('class', 'path-leaf')
              .attr('d', DEFAULT_LEAF)
              .attr('transform', `translate(${pt.x},${pt.y}) scale(${leafScale})`)
              .attr('fill', color)
              .attr('stroke', 'none')
              .style('opacity', 0)
              .transition()
              .duration(250)
              .style('opacity', BASE_OPACITY);
            await sleep(delay);
          }
        }
      }

      // 3 — Glow pulse + country name label at each country point
      p.countries.forEach((name, idx) => {
        const pt = getCentroid(name);
        if (!pt) return;

        // Expanding ring
        group.append('circle')
          .attr('cx', pt[0]).attr('cy', pt[1])
          .attr('r', 4 * leafScale).attr('fill', color)
          .style('opacity', 0.95)
          .transition().duration(700).style('opacity', 0.6).attr('r', 22 * leafScale)
          .transition().duration(500).style('opacity', 0).attr('r', 34 * leafScale)
          .remove();

        // Country name label — fades in with slight delay per country
        const label = group.append('text')
          .attr('x', pt[0])
          .attr('y', pt[1] - 18 * leafScale)
          .attr('text-anchor', 'middle')
          .attr('font-family', 'Georgia, serif')
          .attr('font-size', `${Math.round(11 * leafScale)}px`)
          .attr('fill', color)
          .attr('filter', 'url(#label-shadow)')
          .style('opacity', 0)
          .text(name);

        label.transition()
          .delay(idx * 120)
          .duration(500)
          .style('opacity', 0.92);
      });

      // 4 — Hold so the viewer can read the countries
      await sleep(2800);

      // 5 — Fade labels out before zooming back
      group.selectAll('text')
        .transition().duration(600).style('opacity', 0);
      await sleep(650);

      // 6 — Zoom back out
      await zoomOut(zoomContainer);

      // Restore watercolor filter now that motion is done
      svgSel.select('.country-group').attr('filter', 'url(#watercolor)');
      svgSel.select('.tree-trunk').attr('filter', 'url(#watercolor)');
    } finally {
      animatingRef.current = false;
      const next = pendingRef.current.shift();
      if (next) animateNewPath(next);
    }
  };

  /** Build (or rebuild) the D3 map. Called on load and on every resize. */
  const initMap = (worldData: any) => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    const width = svgEl.clientWidth;
    const height = svgEl.clientHeight;
    if (width === 0 || height === 0) return;

    // Clear everything D3 manages
    svg.selectAll('.map-bg').remove();
    svg.selectAll('.tree-stump').remove();
    svg.selectAll('.grass-strip').remove();
    svg.selectAll('.grass-edge').remove();
    svg.select(`#sky-gradient`).remove();
    svg.select(`#grass-gradient`).remove();
    svg.select('.zoom-root').remove();

    // Sky gradient background — deep night at top, warmer near horizon
    const skyId = 'sky-gradient';
    svg.select(`#${skyId}`).remove();
    const defs = svg.select('defs');
    const skyGrad = defs.append('linearGradient')
      .attr('id', skyId)
      .attr('x1', '0').attr('y1', '0').attr('x2', '0').attr('y2', '1');
    skyGrad.append('stop').attr('offset', '0%').attr('stop-color', '#060d12');
    skyGrad.append('stop').attr('offset', '60%').attr('stop-color', '#0a1a1f');
    skyGrad.append('stop').attr('offset', '100%').attr('stop-color', '#0f2318');

    svg.append('rect')
      .attr('class', 'map-bg')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', `url(#${skyId})`);

    // Zoom container — everything that should scale lives here.
    // Seed the CSS transform so transitions always have a defined start state.
    const zoomContainer = svg.append('g').attr('class', 'zoom-root');
    (zoomContainer.node() as SVGGElement).style.transform = 'translate(0px,0px) scale(1)';
    zoomContainerRef.current = zoomContainer;

    const worldWithoutAntarctica = {
      ...worldData,
      features: worldData.features.filter((f: any) => f.properties.name !== 'Antarctica'),
    };
    const hPad = 40 + width * 0.05;
    // Fit for scale + vertical position
    const projection = d3.geoMercator().fitExtent(
      [[hPad, 130], [width - hPad, height * 0.72]],
      worldWithoutAntarctica
    );
    // Shift horizontally so Africa's center (lon 20°E, lat 5°N) sits above the stump (width/2)
    const africaCenter = projection([20, 5])!;
    const [tx, ty] = projection.translate();
    projection.translate([tx + (width / 2 - africaCenter[0]), ty]);
    const pathGen = d3.geoPath().projection(projection);

    // Country paths — dark painterly variation
    zoomContainer.append('g')
      .attr('class', 'country-group')
      .attr('filter', 'url(#watercolor)')
      .selectAll<SVGPathElement, any>('.country')
      .data(worldData.features.filter((f: any) => f.properties.name !== 'Antarctica'))
      .join('path')
      .attr('class', 'country')
      .attr('d', pathGen as any)
      .attr('fill', (_: any, i: number) => {
        const h = 100 + (i % 9) * 6;
        const s = 18 + (i % 4) * 4;
        const l = 12 + (i % 6) * 1.8;
        return `hsl(${h},${s}%,${l}%)`;
      })
      .attr('stroke', (_: any, i: number) => `hsl(${100 + (i % 9) * 6},22%,28%)`)
      .attr('stroke-width', 0.4)
      .style('opacity', 0.92);

    // Tree stump + grass — drawn outside the zoomContainer so they don't scale/shift
    const cx = width / 2;
    const grassY = height * 0.82;      // grass line sits at 82% down
    const stumpW = 70;                  // half-width of stump at base
    const stumpNarrow = 22;             // half-width at top
    const stumpTop = height * 0.74;    // stump top connects just below map

    // Stump — tapers from narrow top to wider base
    svg.selectAll('.tree-stump').remove();
    svg.append('path')
      .attr('class', 'tree-stump')
      .attr('filter', 'url(#watercolor)')
      .attr('d', `
        M ${cx - stumpNarrow},${stumpTop}
        C ${cx - stumpNarrow - 4},${stumpTop + 20} ${cx - stumpW + 10},${grassY - 20} ${cx - stumpW},${grassY}
        L ${cx + stumpW},${grassY}
        C ${cx + stumpW - 10},${grassY - 20} ${cx + stumpNarrow + 4},${stumpTop + 20} ${cx + stumpNarrow},${stumpTop}
        Z
      `)
      .attr('fill', '#1a0f06');

    // Grass strip
    const grassH = height - grassY;
    svg.selectAll('.grass-strip').remove();
    const grassGradId = 'grass-gradient';
    svg.select(`#${grassGradId}`).remove();
    const grassGrad = defs.append('linearGradient')
      .attr('id', grassGradId)
      .attr('x1', '0').attr('y1', '0').attr('x2', '0').attr('y2', '1');
    grassGrad.append('stop').attr('offset', '0%').attr('stop-color', '#1a3d12');
    grassGrad.append('stop').attr('offset', '100%').attr('stop-color', '#0d2009');

    svg.append('rect')
      .attr('class', 'grass-strip')
      .attr('x', 0).attr('y', grassY)
      .attr('width', width).attr('height', grassH + 2)
      .attr('fill', `url(#${grassGradId})`);

    // Organic wavy grass top edge
    svg.selectAll('.grass-edge').remove();
    const wavePoints: string[] = [];
    const waveSegs = 18;
    for (let i = 0; i <= waveSegs; i++) {
      const wx = (i / waveSegs) * width;
      const wy = grassY - 4 - Math.sin(i * 1.9) * 5 - Math.sin(i * 0.7 + 1) * 4;
      wavePoints.push(`${i === 0 ? 'M' : 'L'}${wx},${wy}`);
    }
    wavePoints.push(`L${width},${height} L0,${height} Z`);
    svg.append('path')
      .attr('class', 'grass-edge')
      .attr('d', wavePoints.join(' '))
      .attr('fill', '#1a3d12')
      .attr('filter', 'url(#watercolor)');

    // Leaf-path layer — always on top inside the zoom container
    const pathsLayer = zoomContainer.append('g').attr('id', 'paths-layer');
    pathsLayerRef.current = pathsLayer;

    const getCentroid = (countryName: string): [number, number] | null => {
      const geoName = GEO_NAME_MAP[countryName] ?? countryName;
      const feature = worldData.features.find((f: any) => f.properties.name === geoName);
      if (!feature) return null;
      const c = pathGen.centroid(feature);
      return isNaN(c[0]) ? null : c;
    };
    getCentroidRef.current = getCentroid;
  };

  const redrawStoredPaths = () => {
    const paths = storedPathsRef.current;
    paths.forEach((p, i) => {
      drawPath(p, false);
      const ageFactor = Math.pow(FADE_FACTOR, paths.length - 1 - i);
      pathsLayerRef.current
        ?.select(`g[data-path-id="${p.id}"]`)
        .selectAll('.path-leaf')
        .style('opacity', BASE_OPACITY * ageFactor);
    });
  };

  useEffect(() => {
    d3.json('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
      .then((data: any) => {
        worldDataRef.current = data;
        initMap(data);
        if (storedPathsRef.current.length > 0) redrawStoredPaths();
      });

    const observer = new ResizeObserver(() => {
      if (!worldDataRef.current) return;
      initMap(worldDataRef.current);
      redrawStoredPaths();
    });
    if (svgRef.current) observer.observe(svgRef.current);

    socket.on('initial_state', (state: { totalTravellers: number; paths: PathEntry[] }) => {
      storedPathsRef.current = state.paths;
      const tryDraw = () => {
        if (getCentroidRef.current && pathsLayerRef.current) {
          state.paths.forEach((p, i) => {
            const ageFactor = Math.pow(FADE_FACTOR, state.paths.length - 1 - i);
            drawPath(p, false);
            pathsLayerRef.current!
              .select(`g[data-path-id="${p.id}"]`)
              .selectAll('.path-leaf')
              .style('opacity', BASE_OPACITY * ageFactor);
          });
        } else {
          setTimeout(tryDraw, 100);
        }
      };
      tryDraw();
    });

    socket.on('new_path_added', (data: { totalTravellers: number; newPath: PathEntry }) => {
      storedPathsRef.current = [...storedPathsRef.current, data.newPath];
      if (animatingRef.current) {
        // Queue it — will be picked up when current animation finishes
        pendingRef.current.push(data.newPath);
      } else {
        animateNewPath(data.newPath);
      }
    });

    socket.on('status_update', (data: { status: string }) => {
      setStatusText(data.status);
    });

    return () => {
      observer.disconnect();
      socket.off('initial_state');
      socket.off('new_path_added');
      socket.off('status_update');
    };
  }, []);

  return (
    <div className="w-full h-screen overflow-hidden relative" style={{ background: '#060d12' }}>

      {/* Quote + status */}
      <div className="absolute top-8 left-0 right-0 text-center z-10 px-8 pointer-events-none">
        <h1 className="text-2xl md:text-3xl font-serif italic text-amber-50/80 mb-3 drop-shadow-lg leading-snug">
          "Our routes become our roots, wherever our lives may lead us to be.<br />
          Across continents and generations, part of one belonging tree."
        </h1>
        <p className="text-base text-white/60 animate-pulse uppercase tracking-widest drop-shadow-md mt-6">
          {statusText}
        </p>
      </div>

      {/* D3 SVG — map + leaves */}
      <svg ref={svgRef} className="w-full h-full absolute inset-0">
        <defs>
          {/* Drop-shadow so country labels read over dark map */}
          <filter id="label-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#000" floodOpacity="0.9" />
          </filter>
          <filter id="watercolor" x="-8%" y="-8%" width="116%" height="116%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.022 0.028"
              numOctaves="4"
              seed="9"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                values="0.022 0.028;0.024 0.031;0.020 0.026;0.022 0.028"
                dur="16s"
                repeatCount="indefinite"
                calcMode="spline"
                keyTimes="0;0.33;0.67;1"
                keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="5"
              xChannelSelector="R"
              yChannelSelector="G"
              result="rough"
            />
            <feGaussianBlur in="rough" stdDeviation="0.7" result="soft" />
            <feMerge>
              <feMergeNode in="soft" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Bottom fade into grass */}
      <div
        className="absolute bottom-0 w-full h-16 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #0d2009, transparent)' }}
      />
    </div>
  );
}
