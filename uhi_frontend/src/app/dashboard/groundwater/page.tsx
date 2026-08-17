'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Droplets, ArrowRight, AlertCircle, Compass, ShieldCheck } from 'lucide-react';

export default function GroundwaterPage() {
  const { selectedCoords, analysisResult, setSelectedCoords, runAnalysis, fetchRecommendations } = useStore();
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

  const getGridColor = (score: number) => {
    if (score < 35) return 'bg-rose-950/40 border-rose-800/60 text-rose-300';
    if (score < 60) return 'bg-amber-950/40 border-amber-800/60 text-amber-300';
    return 'bg-emerald-950/40 border-emerald-800/60 text-[#a7cecd]';
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 min-h-full">
      {/* Page Header Box - Seamless Blended Glass */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-black/25 backdrop-blur-sm border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] transition-colors hover:border-white/20">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-black/35 border border-[#a7cecd]/40 text-[#a7cecd] shadow-[0_0_15px_rgba(167,206,205,0.25)]">
            <Droplets size={22} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white drop-shadow-sm" style={{ color: '#a7cecd' }}>
              Groundwater Recharge Planning (Geo-GAN)
            </h1>
            <p className="text-xs text-slate-300 font-medium mt-0.5 drop-shadow-sm">
              Catchment modeling, deep fracture identification, and aquifer recharge shaft planning.
            </p>
          </div>
        </div>
      </div>

      {!selectedCoords || !analysisResult ? (
        /* Inspection Coordinate Required Box - Seamless Blended Glass */
        <div className="bg-black/25 backdrop-blur-sm border border-amber-500/30 p-6 rounded-2xl flex items-start gap-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] transition-colors hover:border-amber-500/40">
          <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5 drop-shadow" size={22} />
          <div>
            <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Coordinate Analysis Required</h3>
            <p className="text-[11px] text-slate-200 mt-1.5 leading-relaxed drop-shadow-sm">
              To evaluate aquifer recharge suitability, select a coordinate and click "Analyze" on the GIS Map.
            </p>
            <Link 
              href="/dashboard/map" 
              className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 text-slate-950 font-extrabold text-[11px] rounded-xl shadow-lg transition-all duration-200 ease-in-out hover:bg-black/60 hover:text-[#a7cecd] border border-transparent hover:border-[#a7cecd] cursor-pointer"
              style={{ backgroundColor: '#a7cecd' }}
            >
              Go to Map Workspace
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Groundwater Indicators - Blended Glass */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border border-white/10 bg-black/25 backdrop-blur-sm flex flex-col justify-between shadow-lg">
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Recharge Suitability</span>
                <span className="text-3xl font-black text-slate-100 mt-1 block">
                  {analysisResult.groundwater_recharge.recharge_suitability_score} <span className="text-xs text-slate-400 font-semibold">/ 100</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-300 mt-3 leading-relaxed">
                Calculated based on low surface sealing, vegetation coverage, and gentle slope.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-white/10 bg-black/25 backdrop-blur-sm flex flex-col justify-between shadow-lg">
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Soil Permeability Index</span>
                <span className="text-3xl font-black text-slate-100 mt-1 block">
                  {analysisResult.groundwater_recharge.permeability_index}
                </span>
              </div>
              <p className="text-[10px] text-slate-300 mt-3 leading-relaxed">
                Represents natural soil drainage capacity, inverted from concrete soil sealing (NDBI).
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-white/10 bg-black/25 backdrop-blur-sm flex flex-col justify-between shadow-lg">
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Terrain Slope</span>
                <span className="text-3xl font-black text-slate-100 mt-1 block">
                  {analysisResult.groundwater_recharge.estimated_slope_pct.toFixed(2)}%
                </span>
              </div>
              <p className="text-[10px] text-slate-300 mt-3 leading-relaxed">
                Slopes under 5% prevent quick surface runoff, encouraging water infiltration.
              </p>
            </div>
          </div>

          {/* Infiltration Matrix Grid - Blended Glass */}
          <div className="p-6 rounded-2xl border border-white/10 bg-black/25 backdrop-blur-sm space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Compass size={16} className="text-[#a7cecd] animate-pulse" />
                2D Infiltration Suitability Grid (Catchment Model)
              </h3>
              <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">Grid Size: 100m² Buffer</span>
            </div>

            <div className="grid grid-cols-10 gap-1 p-3 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl aspect-square md:aspect-auto max-w-lg mx-auto shadow-inner">
              {analysisResult.groundwater_recharge.recharge_suitability_grid?.map((cell: any, idx: number) => {
                return (
                  <div
                    key={idx}
                    className={`aspect-square rounded border flex flex-col items-center justify-center relative group transition-all duration-200 cursor-pointer hover:ring-2 hover:ring-[#a7cecd]/50 ${getGridColor(cell.suitability_score)}`}
                    onClick={() => handleCoordinateClick(cell.latitude, cell.longitude)}
                    title={`Coords: (${cell.latitude.toFixed(4)}, ${cell.longitude.toFixed(4)})\nRecharge Suitability: ${cell.suitability_score}/100\nPermeability: ${cell.permeability}\nClick to view on Map Workspace`}
                  >
                    {/* Render score value inside cell */}
                    <span className="text-[8px] font-extrabold opacity-80">
                      {Math.round(cell.suitability_score)}
                    </span>
                    {/* Hover tooltip details */}
                    <div className="absolute hidden group-hover:block z-50 bg-black/90 backdrop-blur-md text-slate-100 font-mono text-[8px] p-2 rounded -top-16 border border-white/20 w-36 pointer-events-none text-center shadow-xl">
                      <p className="font-bold border-b border-white/10 pb-0.5 mb-0.5 text-[#a7cecd]">Suitability: {cell.suitability_score}</p>
                      <p>Permeability: {cell.permeability}</p>
                      <p>Elevation: {cell.elevation.toFixed(1)}m</p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Grid Legend */}
            <div className="flex justify-center gap-6 pt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-emerald-950/40 border border-emerald-800/60" />
                <span>Optimal (&gt;60)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-amber-950/40 border border-amber-800/60" />
                <span>Moderate (35-60)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-rose-950/40 border border-rose-800/60" />
                <span>Poor (&lt;35)</span>
              </div>
            </div>
          </div>

          {/* Recharge Recommendations - Blended Glass */}
          <div className="p-6 rounded-2xl border border-white/10 bg-black/25 backdrop-blur-sm space-y-4 shadow-xl">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#a7cecd]" />
              Catchment Planning Directives
            </h3>
            <div className="p-4 bg-black/40 rounded-xl border border-white/10 text-xs font-medium text-slate-200 leading-relaxed">
              "{analysisResult.groundwater_recharge.planning_recommendation}"
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
