'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Wind, ArrowRight, AlertCircle, Compass, Landmark, ArrowUp, Activity } from 'lucide-react';

// Leaflet must not SSR — load the map only on the client
const WindVectorMap = dynamic(() => import('@/components/WindVectorMap'), { ssr: false });

export default function WindCorridorsPage() {
  const { selectedCoords, analysisResult, sankalpData, setSelectedCoords, runAnalysis, fetchRecommendations } = useStore();
  const router = useRouter();

  const handleCoordinateClick = (latitude: number, longitude: number) => {
    setSelectedCoords({ lat: latitude, lng: longitude });
    runAnalysis(latitude, longitude).then(success => {
      if (success) {
        fetchRecommendations(latitude, longitude);
      }
    });
    router.push('/dashboard/map');
  };

  return (
    <div className="min-h-full w-full flex flex-col text-slate-100">
      <div className="p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6 flex-1">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl cosmic-card border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-black/35 border border-[#a7cecd]/40 text-[#a7cecd] shadow-[0_0_15px_rgba(167,206,205,0.25)] glow-active">
              <Wind size={22} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight" style={{ color: '#a7cecd' }}>
                Wind Corridor Intelligence (CFD-Net)
              </h1>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">
                2D CFD potential wind flow solvers and passive cooling corridor mapping.
              </p>
            </div>
          </div>
        </div>

        {!selectedCoords || !analysisResult ? (
          <div className="cosmic-card border border-amber-500/30 p-6 rounded-2xl flex items-start gap-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
            <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" size={22} />
            <div>
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Coordinate Analysis Required</h3>
              <p className="text-[11px] text-zinc-300 mt-1.5 leading-relaxed">
                To evaluate wind corridors and ventilation index, select a coordinate and click "Analyze" on the GIS Map.
              </p>
              <Link 
                href="/dashboard/map" 
                className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 text-slate-950 font-extrabold text-[11px] rounded-xl shadow-lg transition-all duration-200 ease-in-out hover:bg-zinc-900 hover:text-[#a7cecd] border border-transparent hover:border-[#a7cecd] cursor-pointer animate-shimmer"
                style={{ backgroundColor: '#a7cecd' }}
              >
                Go to Map Workspace
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* CFD indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl cosmic-card flex flex-col justify-between shadow-lg">
                <div>
                  <span className="text-[9px] font-bold text-zinc-500 block uppercase tracking-wider">Ventilation Efficiency</span>
                  <span className="text-3xl font-black text-white mt-1 block tracking-tight">
                    {analysisResult.wind_corridor.ventilation_efficiency_pct}%
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-3 leading-relaxed">
                  Percentage of free-stream wind velocity reaching street level.
                </p>
              </div>

              <div className="p-5 rounded-2xl cosmic-card flex flex-col justify-between shadow-lg">
                <div>
                  <span className="text-[9px] font-bold text-zinc-500 block uppercase tracking-wider">Calculated Wind Velocity</span>
                  <span className="text-3xl font-black text-white mt-1 block tracking-tight">
                    {analysisResult.wind_corridor.calculated_wind_speed_ms} <span className="text-xs text-zinc-400 font-semibold">m/s</span>
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-3 leading-relaxed">
                  Logarithmic wind speed calculated at 2-meter pedestrian height.
                </p>
              </div>

              <div className="p-5 rounded-2xl cosmic-card flex flex-col justify-between shadow-lg">
                <div>
                  <span className="text-[9px] font-bold text-zinc-500 block uppercase tracking-wider">Obstruction Category</span>
                  <span className={`text-xs font-extrabold uppercase tracking-wider w-fit mt-2 block ${
                    analysisResult.wind_corridor.obstruction_status.includes('High')
                      ? 'text-rose-400'
                      : 'text-emerald-400'
                  }`}>
                    {analysisResult.wind_corridor.obstruction_status}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-3 leading-relaxed">
                  Derived surface roughness coefficient (z0) is {analysisResult.wind_corridor.roughness_length_m}m.
                </p>
              </div>
            </div>

            {/* Satellite Wind Vector Map (replaces CSS grid) */}
            <div className="p-6 rounded-2xl cosmic-card space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <Compass size={16} className="text-[#a7cecd] animate-spin" />
                  Live Wind Field — Satellite View (10m Resolution)
                </h3>
                <span className="text-[9px] font-mono text-zinc-500 font-bold uppercase">
                  Esri World Imagery · SANKALP CFD-Net
                </span>
              </div>

              {/* Map container — fixed height so Leaflet renders correctly */}
              <div className="rounded-xl overflow-hidden border border-white/10 shadow-inner" style={{ height: '520px' }}>
                <WindVectorMap
                  center={selectedCoords}
                  windGrid={analysisResult.wind_corridor.wind_vector_grid ?? []}
                  sankalpData={sankalpData}
                  obstructionStatus={analysisResult.wind_corridor.obstruction_status}
                  ventilationPct={analysisResult.wind_corridor.ventilation_efficiency_pct}
                />
              </div>

              <p className="text-[10px] text-zinc-500 leading-relaxed text-center italic">
                * Wind vectors geo-positioned over real satellite imagery. Colour: cyan = slow, yellow = moderate, red = fast.
                Hover any arrow for exact speed &amp; bearing. SANKALP agent overlay shows optimized wind targets.
              </p>
            </div>

            {/* Building Height Recommendations */}
            <div className="p-6 rounded-2xl cosmic-card space-y-4 shadow-xl">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <Landmark size={16} className="text-[#a7cecd]" />
                Zoning & Height Regulations
              </h3>
              <div className="p-4 bg-black/40 rounded-xl border border-white/10 text-xs font-medium text-zinc-200 leading-relaxed">
                "{analysisResult.wind_corridor.building_height_recommendation}"
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
