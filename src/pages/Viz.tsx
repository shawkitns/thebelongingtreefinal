import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import * as d3 from 'd3';

const socket = io();

const DEFAULT_LEAF = 'M0,-4 C3,-4 5,-1 5,0 C5,3 0,5 0,5 C0,5 -5,3 -5,0 C-5,-1 -3,-4 0,-4 Z';
const BASE_OPACITY = 0.9;
// Each time a new path arrives, older groups dim by this multiplier
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

export default function Viz() {
  const [statusText, setStatusText] = useState('WAITING FOR A NEW TRAVELLER...');
  const svgRef = useRef<SVGSVGElement>(null);
  const getCentroidRef = useRef<((name: string) => [number, number] | null) | null>(null);
  const pathsLayerRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  // Draw a single path entry; animate=true triggers stagger + glow on arrival
  const drawPath = (p: PathEntry, animate: boolean) => {
    const getCentroid = getCentroidRef.current;
    const pathsLayer = pathsLayerRef.current;
    if (!getCentroid || !pathsLayer) return;

    const points = p.countries.map(c => getCentroid(c)).filter(Boolean) as [number, number][];
    if (points.length < 1) return;

    const leafShape = p.leafPath || DEFAULT_LEAF;
    const isDrawnLeaf = !!p.leafPath;
    const color = p.color || '#5ecf3e';
    const scale = p.leafScale ?? 1;
    const group = pathsLayer.append('g').attr('data-path-id', p.id);

    if (points.length > 1) {
      const lineGen = d3.line<[number, number]>()
        .x(d => d[0])
        .y(d => d[1])
        .curve(d3.curveBundle.beta(0.8));

      const pathString = lineGen(points);
      if (pathString) {
        const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        tempPath.setAttribute('d', pathString);
        const totalLength = tempPath.getTotalLength();

        const leafSpacing = 32 * scale;
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
          .attr('d', leafShape)
          .attr('transform', d => `translate(${d.x},${d.y}) scale(${scale})`)
          .attr('fill', isDrawnLeaf ? 'none' : color)
          .attr('stroke', isDrawnLeaf ? color : 'none')
          .attr('stroke-width', isDrawnLeaf ? 1.5 : 0)
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round')
          .style('opacity', animate ? 0 : BASE_OPACITY)
          .call(sel => {
            if (animate) {
              sel
                .transition()
                .delay((_, i) => i * 8)
                .duration(300)
                .style('opacity', BASE_OPACITY);
            }
          });
      }
    }

    // Glow pulse on arrival — a brief radial halo at each country dot
    if (animate) {
      points.forEach(pt => {
        const circle = group.append('circle')
          .attr('cx', pt[0])
          .attr('cy', pt[1])
          .attr('r', 6 * scale)
          .attr('fill', color)
          .style('opacity', 0.9);

        circle
          .transition().duration(600).style('opacity', 0.7).attr('r', 18 * scale)
          .transition().duration(400).style('opacity', 0).attr('r', 28 * scale)
          .remove();
      });
    }
  };

  // Dim all existing path groups when a new one arrives
  const fadeExistingPaths = (newId: string) => {
    const pathsLayer = pathsLayerRef.current;
    if (!pathsLayer) return;
    pathsLayer.selectAll<SVGGElement, unknown>('g[data-path-id]')
      .filter(function() {
        return d3.select(this).attr('data-path-id') !== newId;
      })
      .each(function() {
        const g = d3.select(this);
        g.selectAll('.path-leaf').each(function() {
          const el = d3.select(this);
          const cur = parseFloat(el.style('opacity') || String(BASE_OPACITY));
          el.transition().duration(800).style('opacity', Math.max(0.08, cur * FADE_FACTOR));
        });
        g.selectAll('circle').each(function() {
          const el = d3.select(this);
          const cur = parseFloat(el.style('opacity') || '0.6');
          el.transition().duration(800).style('opacity', Math.max(0.05, cur * FADE_FACTOR));
        });
      });
  };

  useEffect(() => {
    d3.json('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson').then(
      (data: any) => { initMap(data); }
    );

    socket.on('initial_state', (state: { totalTravellers: number; paths: PathEntry[] }) => {
      const tryDraw = () => {
        if (getCentroidRef.current && pathsLayerRef.current) {
          state.paths.forEach((p, i) => {
            // Fade older paths proportionally so history feels layered
            const ageFactor = Math.pow(FADE_FACTOR, state.paths.length - 1 - i);
            const entry = { ...p };
            drawPath(entry, false);
            // Apply age-based opacity after drawing
            const g = pathsLayerRef.current!.select(`g[data-path-id="${p.id}"]`);
            g.selectAll('.path-leaf').style('opacity', BASE_OPACITY * ageFactor);
          });
        } else {
          setTimeout(tryDraw, 100);
        }
      };
      tryDraw();
    });

    socket.on('new_path_added', (data: { totalTravellers: number; newPath: PathEntry }) => {
      fadeExistingPaths(data.newPath.id);
      drawPath(data.newPath, true);
    });

    socket.on('status_update', (data: { status: string }) => {
      setStatusText(data.status);
    });

    return () => {
      socket.off('initial_state');
      socket.off('new_path_added');
      socket.off('status_update');
    };
  }, []);

  const initMap = (worldData: any) => {
    const svg = d3.select(svgRef.current!);
    const width = svgRef.current!.clientWidth;
    const height = svgRef.current!.clientHeight;

    const projection = d3.geoMercator().fitExtent(
      [[50, 160], [width - 50, height - 50]],
      worldData
    );
    const pathGen = d3.geoPath().projection(projection);

    svg
      .selectAll('.country')
      .data(worldData.features)
      .join('path')
      .attr('class', 'country')
      .attr('d', pathGen as any)
      .style('opacity', 0);

    let pathsLayer = svg.select<SVGGElement>('#paths-layer');
    if (pathsLayer.empty()) {
      pathsLayer = svg.append('g').attr('id', 'paths-layer');
    }
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

  return (
    <div className="w-full h-screen bg-black text-white overflow-hidden flex flex-col items-center relative">

      <div className="absolute top-10 text-center z-10 px-8 pointer-events-none">
        <h1 className="text-3xl md:text-4xl font-serif italic text-amber-50 mb-4 drop-shadow-lg leading-snug">
          "Our routes become our roots, wherever our lives may lead us to be.<br />
          Across continents and generations, part of one belonging tree."
        </h1>
        <p className="text-lg text-white animate-pulse mt-8 uppercase tracking-widest drop-shadow-md">
          {statusText}
        </p>
      </div>

      <video
        src="/images/treemap-dark-animated.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      <svg ref={svgRef} className="w-full h-full absolute inset-0 z-0" />

      <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-[#0a1118] to-transparent pointer-events-none" />
    </div>
  );
}
