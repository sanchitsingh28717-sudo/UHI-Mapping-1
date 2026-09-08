'use client';

import { useEffect, useRef } from 'react';
import type { SankalpData } from '@/store/useStore';

interface WindVec {
  latitude: number;
  longitude: number;
  speed: number;
  angle: number;
}

interface Props {
  center: { lat: number; lng: number };
  windGrid: WindVec[];
  sankalpData: SankalpData | null;
  obstructionStatus: string;
  ventilationPct: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Windy-style colour scale  (speed in m/s → RGBA string)
// navy → blue → cyan → green → yellow → orange  (matches windy.com palette)
// ─────────────────────────────────────────────────────────────────────────────
function windyColor(speed: number, alpha: number): string {
  const stops: Array<[number, [number, number, number]]> = [
    [0.0,  [  5,  10,  60]],   // deep navy  – calm
    [0.8,  [  0,  60, 180]],   // dark blue
    [1.6,  [  0, 140, 255]],   // bright blue
    [2.4,  [  0, 220, 220]],   // cyan
    [3.0,  [  0, 240, 120]],   // green-cyan
    [3.6,  [100, 255,   0]],   // lime
    [4.2,  [255, 230,   0]],   // yellow
    [4.8,  [255, 130,   0]],   // orange
    [5.5,  [255,  30,   0]],   // red
  ];

  const s = Math.max(0, speed);
  for (let i = 0; i < stops.length - 1; i++) {
    const [s0, c0] = stops[i];
    const [s1, c1] = stops[i + 1];
    if (s >= s0 && s <= s1) {
      const t = (s - s0) / (s1 - s0);
      const r = Math.round(c0[0] + (c1[0] - c0[0]) * t);
      const g = Math.round(c0[1] + (c1[1] - c0[1]) * t);
      const b = Math.round(c0[2] + (c1[2] - c0[2]) * t);
      return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
    }
  }
  return `rgba(255,30,0,${alpha.toFixed(3)})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bilinear interpolation of the wind field at any canvas pixel
// Returns { vx, vy, speed } at the given canvas (px, py) position
// ─────────────────────────────────────────────────────────────────────────────
interface FieldSample { vx: number; vy: number; speed: number; }

function buildInterpolator(
  windGrid: WindVec[],
  latLngToXY: (lat: number, lng: number) => [number, number]
): (px: number, py: number) => FieldSample {

  if (windGrid.length === 0) return () => ({ vx: 0, vy: 0, speed: 0 });

  // Pre-project all grid points to canvas space
  const pts = windGrid.map(v => {
    const [x, y] = latLngToXY(v.latitude, v.longitude);
    const rad = (v.angle * Math.PI) / 180;
    return {
      x, y,
      vx:  v.speed * Math.sin(rad),
      vy: -v.speed * Math.cos(rad), // canvas y inverted
      speed: v.speed,
    };
  });

  // Simple nearest-4 inverse-distance weighted interpolation
  return (px: number, py: number): FieldSample => {
    let wSum = 0, vxSum = 0, vySum = 0, sSum = 0;
    for (const p of pts) {
      const dx = px - p.x, dy = py - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 1) return { vx: p.vx, vy: p.vy, speed: p.speed };
      const w = 1 / d2;
      wSum  += w;
      vxSum += w * p.vx;
      vySum += w * p.vy;
      sSum  += w * p.speed;
    }
    return { vx: vxSum / wSum, vy: vySum / wSum, speed: sSum / wSum };
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Particle
// ─────────────────────────────────────────────────────────────────────────────
interface Particle {
  x: number; y: number;
  age: number; maxAge: number;
  // Trail history for smooth curve
  trail: Array<{ x: number; y: number; speed: number }>;
}

export default function WindVectorMap({
  center, windGrid, sankalpData, obstructionStatus, ventilationPct,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const rafRef       = useRef<number | null>(null);

  useEffect(() => {
    let L: any;
    let mounted = true;

    (async () => {
      L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      if (!mounted || !containerRef.current) return;

      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }

      // ── Map ──
      const map = L.map(containerRef.current, {
        center: [center.lat, center.lng],
        zoom: 15, maxZoom: 20,
        zoomControl: false, attributionControl: false,
      });
      mapRef.current = map;

      const googleTiles = L.tileLayer(
        'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        { maxZoom: 20, maxNativeZoom: 20 }
      );
      const esriTiles = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, maxNativeZoom: 19 }
      );
      googleTiles.on('tileerror', () => {
        if (!map.hasLayer(esriTiles)) { map.removeLayer(googleTiles); esriTiles.addTo(map); }
      });
      googleTiles.addTo(map);
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, opacity: 0.5 }
      ).addTo(map);

      // Centre crosshair
      L.marker([center.lat, center.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="width:14px;height:14px;border-radius:50%;
                   background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.9);
                   box-shadow:0 0 10px rgba(255,255,255,0.6);"></div>`,
          iconSize: [14,14], iconAnchor: [7,7],
        }),
        interactive: false,
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);

      // ── Canvas overlay ──
      const wrap = containerRef.current!;
      const canvas = document.createElement('canvas');
      canvas.style.cssText = `
        position:absolute;top:0;left:0;width:100%;height:100%;
        pointer-events:none;z-index:500;border-radius:12px;`;
      wrap.style.position = 'relative';
      wrap.appendChild(canvas);
      const ctx = canvas.getContext('2d')!;

      const setSize = () => {
        const r = wrap.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width  = r.width  * dpr;
        canvas.height = r.height * dpr;
        canvas.style.width  = r.width  + 'px';
        canvas.style.height = r.height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      setSize();
      window.addEventListener('resize', setSize);

      // ── Wind field sampler ──
      const latLngToXY = (lat: number, lng: number): [number, number] => {
        const pt = map.latLngToContainerPoint(L.latLng(lat, lng));
        return [pt.x, pt.y];
      };

      let sample = buildInterpolator(windGrid, latLngToXY);
      map.on('moveend zoomend', () => {
        sample = buildInterpolator(windGrid, latLngToXY);
        // Scatter all particles on view change
        particles.forEach(p => resetParticle(p));
      });

      // ── Particle system ──
      const PARTICLE_COUNT = 300;
      const SPEED_SCALE    = 8.0;       // faster movement = longer visible trails
      const TRAIL_LEN      = 28;        // more history = longer, silkier streamlines
      const MIN_AGE        = 80;
      const MAX_AGE        = 180;

      const particles: Particle[] = [];

      const canvasW = () => wrap.getBoundingClientRect().width;
      const canvasH = () => wrap.getBoundingClientRect().height;

      const resetParticle = (p: Particle) => {
        const w = canvasW(), h = canvasH();
        p.x = Math.random() * w;
        p.y = Math.random() * h;
        p.age    = Math.floor(Math.random() * MAX_AGE); // stagger
        p.maxAge = MIN_AGE + Math.floor(Math.random() * (MAX_AGE - MIN_AGE));
        p.trail  = [];
      };

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p: Particle = { x:0, y:0, age:0, maxAge:0, trail:[] };
        resetParticle(p);
        particles.push(p);
      }

      // ── Render loop ──
      const draw = () => {
        if (!mounted) return;

        const w = canvasW(), h = canvasH();

        // clearRect every frame — canvas stays fully transparent,
        // satellite tiles always visible underneath
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';

        for (const p of particles) {
          p.age++;

          if (p.age >= p.maxAge) { resetParticle(p); continue; }

          // Sample wind at current position
          const { vx, vy, speed } = sample(p.x, p.y);

          // If wind is negligible at this spot, slowly drift and skip drawing
          if (speed < 0.05) { p.x += 0.1; p.y += 0.1; continue; }

          // Move particle — enforce a minimum visible movement
          const prevX = p.x, prevY = p.y;
          const minSpd = 0.3; // ensures even calm zones show gentle drift
          const effVx = Math.abs(vx) < minSpd * 0.1 ? vx + minSpd * Math.sin(p.age * 0.05) : vx;
          const effVy = Math.abs(vy) < minSpd * 0.1 ? vy + minSpd * Math.cos(p.age * 0.05) : vy;

          // Add gentle sinuous turbulence — breaks straight-line grid look
          const wander = 0.15;
          const wx = Math.sin(p.age * 0.08 + p.x * 0.003) * wander;
          const wy = Math.cos(p.age * 0.07 + p.y * 0.003) * wander;

          p.x += effVx * SPEED_SCALE + wx;
          p.y += effVy * SPEED_SCALE + wy;

          // Wrap around canvas edges
          if (p.x < 0) p.x = w;
          if (p.x > w) p.x = 0;
          if (p.y < 0) p.y = h;
          if (p.y > h) p.y = 0;

          // Store trail point
          p.trail.push({ x: prevX, y: prevY, speed });
          if (p.trail.length > TRAIL_LEN) p.trail.shift();

          // Opacity envelope — fade in at birth, fade out near death
          const t = p.age / p.maxAge;
          const alpha = t < 0.12
            ? t / 0.12
            : t > 0.80
            ? 1 - (t - 0.80) / 0.20
            : 1.0;

          if (alpha < 0.02) continue;

          // ── Draw trail as a smooth Windy-style thin line ──
          // Each segment is drawn individually so we can taper opacity toward tail
          if (p.trail.length >= 2) {
            for (let i = 1; i < p.trail.length; i++) {
              const segT    = i / p.trail.length;   // 0 = tail, 1 = head
              const segAlpha = segT * segT * alpha * 0.72; // visible but translucent over satellite
              const spd = p.trail[i].speed;

              ctx.beginPath();
              ctx.moveTo(p.trail[i-1].x, p.trail[i-1].y);

              // Smooth curve through midpoints (Windy uses this trick)
              if (i < p.trail.length - 1) {
                const mx = (p.trail[i].x + p.trail[i+1].x) / 2;
                const my = (p.trail[i].y + p.trail[i+1].y) / 2;
                ctx.quadraticCurveTo(p.trail[i].x, p.trail[i].y, mx, my);
              } else {
                ctx.lineTo(p.trail[i].x, p.trail[i].y);
              }

              ctx.strokeStyle = windyColor(spd, segAlpha);
              ctx.lineWidth   = 1.2 + spd * 0.2;   // slightly thicker for visibility
              ctx.lineCap     = 'round';
              ctx.stroke();
            }
          }

          // ── Bright head dot — signature Windy look ──
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.0 + speed * 0.12, 0, Math.PI * 2);
          ctx.fillStyle = windyColor(speed, alpha * 0.75);
          ctx.fill();
        }

        rafRef.current = requestAnimationFrame(draw);
      };

      map.whenReady(() => { draw(); });

      // ── SANKALP HUD ──
      if (sankalpData?.optimization) {
        const opt = sankalpData.optimization;
        const act = sankalpData.actuation?.hardware_triggers;
        const AgentControl = L.Control.extend({
          options: { position: 'bottomleft' },
          onAdd() {
            const div = L.DomUtil.create('div');
            div.innerHTML = `
              <div style="font-family:'JetBrains Mono',monospace;font-size:9px;
                background:rgba(3,3,5,0.85);border:1px solid rgba(0,140,255,0.3);
                border-radius:10px;padding:10px 12px;color:#94a3b8;line-height:1.8;
                min-width:170px;box-shadow:0 8px 32px rgba(0,0,0,0.7);">
                <div style="color:#00c8ff;font-weight:700;letter-spacing:1px;
                  border-bottom:1px solid rgba(255,255,255,0.08);
                  padding-bottom:5px;margin-bottom:7px;font-size:8px;">SANKALP WIND AGENT</div>
                <div style="display:flex;justify-content:space-between;gap:16px;">
                  <span>Wind Before</span>
                  <span style="color:#f1f5f9;font-weight:700">${opt.initial_wind.toFixed(2)} m/s</span>
                </div>
                <div style="display:flex;justify-content:space-between;gap:16px;">
                  <span>Wind After</span>
                  <span style="color:#34d399;font-weight:700">${opt.final_wind.toFixed(2)} m/s</span>
                </div>
                <div style="display:flex;justify-content:space-between;gap:16px;">
                  <span>LST Δ</span>
                  <span style="color:#f87171;font-weight:700">-${opt.lst_delta}°C</span>
                </div>
                ${act ? `
                <div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:7px;padding-top:6px;">
                  <div style="display:flex;justify-content:space-between;gap:16px;">
                    <span>Louver</span><span style="color:#a7cecd;font-weight:700">${act.louver_servo_angle_deg}°</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;gap:16px;">
                    <span>Misting</span><span style="color:#a7cecd;font-weight:700">${act.misting_grid_pulse_ms}ms</span>
                  </div>
                </div>` : ''}
              </div>`;
            L.DomEvent.disableClickPropagation(div);
            return div;
          },
        });
        new AgentControl().addTo(map);
      }

      // ── Windy-style colour scale legend ──
      const LegendControl = L.Control.extend({
        options: { position: 'bottomright' },
        onAdd() {
          const div = L.DomUtil.create('div');
          // Horizontal gradient bar like windy.com
          div.innerHTML = `
            <div style="font-family:'JetBrains Mono',monospace;font-size:8px;
              background:rgba(3,3,5,0.85);border:1px solid rgba(255,255,255,0.1);
              border-radius:8px;padding:8px 10px;color:#94a3b8;
              box-shadow:0 8px 24px rgba(0,0,0,0.6);min-width:180px;">
              <div style="font-weight:700;color:#e2e8f0;margin-bottom:6px;
                letter-spacing:1px;font-size:8px;text-transform:uppercase;">Wind Speed (m/s)</div>
              <div style="height:8px;border-radius:4px;margin-bottom:4px;
                background:linear-gradient(90deg,
                  rgb(5,10,60) 0%,
                  rgb(0,60,180) 15%,
                  rgb(0,140,255) 30%,
                  rgb(0,220,220) 44%,
                  rgb(0,240,120) 55%,
                  rgb(255,230,0) 76%,
                  rgb(255,130,0) 88%,
                  rgb(255,30,0) 100%
                );"></div>
              <div style="display:flex;justify-content:space-between;color:#64748b;font-size:7.5px;">
                <span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5+</span>
              </div>
              <div style="border-top:1px solid rgba(255,255,255,0.07);margin-top:7px;padding-top:5px;">
                Vent: <span style="color:#00c8ff;font-weight:700">${ventilationPct}%</span>&nbsp;&nbsp;
                <span style="color:${
                  obstructionStatus.includes('High') ? '#f87171'
                  : obstructionStatus.includes('Highway') ? '#34d399'
                  : '#38bdf8'};font-weight:700;">${obstructionStatus}</span>
              </div>
            </div>`;
          L.DomEvent.disableClickPropagation(div);
          return div;
        },
      });
      new LegendControl().addTo(map);
    })();

    return () => {
      mounted = false;
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, windGrid]);

  return (
    <div ref={containerRef}
      style={{ width:'100%', height:'100%', borderRadius:'12px', position:'relative' }} />
  );
}
