'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Wind, ArrowRight, AlertCircle, Compass, Landmark, ArrowUp } from 'lucide-react';

export default function WindCorridorsPage() {
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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight" style={{ color: '#a7cecd' }}>
          Wind Corridor Intelligence (CFD-Net)
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          2D CFD potential wind flow solvers and passive cooling corridor mapping.
        </p>
      </div>

      {!selectedCoords || !analysisResult ? (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-start gap-4 shadow-xl">
          <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Coordinate Analysis Required</h3>
            <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
              To evaluate wind corridors and ventilation index, select a coordinate and click "Analyze" on the GIS Map.
            </p>
            <Link 
              href="/dashboard/map" 
              className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-slate-950 font-extrabold text-[10px] rounded-xl shadow-lg transition-all duration-200 ease-in-out hover:bg-slate-950 hover:text-[#a7cecd] border border-transparent hover:border-[#a7cecd] cursor-pointer"
              style={{ backgroundColor: '#a7cecd' }}
            >
              Go to Map Workspace
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* CFD indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-150 flex flex-col justify-between bg-white">
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Ventilation Efficiency</span>
                <span className="text-3xl font-black text-slate-800 mt-1 block">
                  {analysisResult.wind_corridor.ventilation_efficiency_pct}%
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
                Percentage of free-stream wind velocity reaching street level.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-150 flex flex-col justify-between bg-white">
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Calculated Wind Velocity</span>
                <span className="text-3xl font-black text-slate-800 mt-1 block">
                  {analysisResult.wind_corridor.calculated_wind_speed_ms} <span className="text-xs text-slate-400 font-semibold">m/s</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
                Logarithmic wind speed calculated at 2-meter pedestrian height.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-150 flex flex-col justify-between bg-white">
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Obstruction Category</span>
                <span className={`text-sm font-extrabold px-3 py-1 rounded-full uppercase tracking-wider w-fit mt-2 block border ${
                  analysisResult.wind_corridor.obstruction_status.includes('High')
                    ? 'bg-rose-50 border-rose-100 text-rose-700'
                    : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                }`}>
                  {analysisResult.wind_corridor.obstruction_status}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
                Derived surface roughness coefficient (z0) is {analysisResult.wind_corridor.roughness_length_m}m.
              </p>
            </div>
          </div>

          {/* 2D Wind Vector Field Grid (CFD Simulation) */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 bg-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Compass size={16} className="text-emerald-600 animate-spin" />
                2D Wind Field Flow Grid (10m Resolution)
              </h3>
              <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">Grid Size: 100m² Buffer</span>
            </div>

            <div className="grid grid-cols-10 gap-1.5 p-4 bg-slate-900 rounded-xl border border-slate-950 aspect-square md:aspect-auto max-w-lg mx-auto">
              {analysisResult.wind_corridor.wind_vector_grid?.map((vec: any, idx: number) => {
                // Calculate opacity based on wind speed (faster = brighter)
                const opacity = Math.min(Math.max(vec.speed / 4.5, 0.2), 1.0);
                // Rotate arrow (0 deg in CSS points Up, but in math/GIS wind angle 240 is South-West)
                // Rotations: wind direction is where it blows FROM.
                const rotation = vec.angle;
                return (
                  <div 
                    key={idx} 
                    className="aspect-square flex items-center justify-center relative group cursor-pointer hover:bg-slate-800 rounded transition-colors"
                    onClick={() => handleCoordinateClick(vec.latitude, vec.longitude)}
                    title={`Coords: (${vec.latitude.toFixed(4)}, ${vec.longitude.toFixed(4)})\nSpeed: ${vec.speed} m/s\nAngle: ${vec.angle}°\nClick to view on Map Workspace`}
                  >
                    <ArrowUp 
                      size={18} 
                      className="text-blue-400 transition-all duration-300 transform group-hover:scale-125"
                      style={{ 
                        transform: `rotate(${rotation}deg)`, 
                        opacity: opacity 
                      }} 
                    />
                    {/* Tiny speed numeric overlays on hover */}
                    <span className="absolute hidden group-hover:block z-50 bg-slate-950 text-white font-mono text-[8px] p-1 rounded -top-8 border border-slate-800 pointer-events-none">
                      {vec.speed}m/s
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed text-center italic">
              *Monsoon wind flow vectors simulated using localized potential solver over elevations (DEM) and building drag (LULC).*
            </p>
          </div>

          {/* Building Height Recommendations */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 bg-white space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Landmark size={16} className="text-emerald-600" />
              Zoning & Height Regulations
            </h3>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs font-semibold text-slate-700 leading-relaxed">
              "{analysisResult.wind_corridor.building_height_recommendation}"
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
