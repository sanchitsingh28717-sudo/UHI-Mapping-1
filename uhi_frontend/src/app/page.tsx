'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ThermometerSnowflake, ShieldAlert, Sparkles, MapPin, 
  Wind, Droplets, ArrowRight, LineChart, Globe 
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans">
      {/* Decorative Blur Vectors */}
      <div className="absolute top-[-10%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-emerald-50 blur-3xl opacity-70 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-teal-50 blur-3xl opacity-70 pointer-events-none" />

      {/* Main Header / Navigation */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-md shadow-emerald-600/10">
            <ThermometerSnowflake size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold text-slate-800 tracking-tight">ClimateIntel</span>
            <span className="text-[9px] text-slate-400 font-bold tracking-wider uppercase">Ahmedabad Twin</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            href="/login" 
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Sign In
          </Link>
          <Link 
            href="/register" 
            className="px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/15 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            Launch Platform
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-full text-[10px] font-extrabold tracking-wide uppercase">
            <Sparkles size={12} className="animate-spin" />
            Empowered by Explainable AI & Gemini
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.1] max-w-lg">
            SANKALP: Spatial Analytics & Adaptive Land-use Planning.
          </h1>
          <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-md">
            A production-ready decision-support system designed for smart cities, environmental agencies, and policymakers to map, analyze, and mitigate microclimatic heat risks.
          </p>
          <div className="flex gap-4">
            <Link 
              href="/register" 
              className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xl shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              Get Started
              <ArrowRight size={14} />
            </Link>
            <Link 
              href="/login" 
              className="px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              Access Portal
            </Link>
          </div>
        </div>

        {/* Right side teaser mockup */}
        <div className="relative w-full aspect-4/3 glass-panel rounded-2xl border border-slate-200/50 shadow-2xl p-4 flex flex-col justify-between overflow-hidden bg-white/40">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-slate-400 font-bold ml-2">GIS WORKSPACE PREVIEW</span>
            </div>
            <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">EPSG:4326</span>
          </div>

          <div className="flex-1 rounded-xl bg-slate-100 border border-slate-200/60 overflow-hidden relative flex items-center justify-center">
            {/* Visual placeholder representing the Leaflet Map bounds of Ahmedabad */}
            <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
            <div className="z-10 text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold shadow-md shadow-emerald-600/10">
                <MapPin size={12} />
                Ahmedabad Boundary Loaded
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Center: 23.0225° N, 72.5714° E</p>
            </div>
          </div>

          {/* Environmental parameters snippet */}
          <div className="grid grid-cols-3 gap-2 mt-4 text-[10px] font-semibold text-slate-500">
            <div className="bg-white/80 p-2 rounded-lg border border-slate-100">
              <span className="text-[8px] text-slate-400 block font-bold">LST TEMP</span>
              <span className="font-extrabold text-slate-800">37.5°C</span>
            </div>
            <div className="bg-white/80 p-2 rounded-lg border border-slate-100">
              <span className="text-[8px] text-slate-400 block font-bold">NDVI VEG</span>
              <span className="font-extrabold text-slate-800">0.069</span>
            </div>
            <div className="bg-white/80 p-2 rounded-lg border border-slate-100">
              <span className="text-[8px] text-slate-400 block font-bold">HEAT RISK</span>
              <span className="font-extrabold text-rose-600">High Risk</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-slate-200/60">
        <h2 className="text-xs font-extrabold text-emerald-800 uppercase tracking-widest text-center mb-12">
          Platform Architecture & Capabilities
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl w-fit">
              <ThermometerSnowflake size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">UHI Hotspot Intelligence</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Load the trained XGBoost model directly, query satellite indexes (NDVI, NDBI, NDWI) and predict heat zones on the fly.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit">
              <LineChart size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Explainable AI (SHAP)</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Inspect pixel-level drivers of local heat accumulation. View exact SHAP contribution charts for each target coordinate.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-teal-50 text-teal-600 rounded-xl w-fit">
              <Sparkles size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">AI Mitigation Recommendations</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Generate actionable cool roof coatings, Miyawaki forestry, and permeable paver installation guidelines via Google Gemini.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl w-fit">
              <Wind size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Wind Ventilation (CFD-Net)</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Estimate log wind profile street velocities using real DEM slope and roughness lengths to recommend building height offsets.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-sky-50 text-sky-600 rounded-xl w-fit">
              <Droplets size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Groundwater Restoration (Geo-GAN)</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Locate permeability vectors and coordinate optimal drilling locations for artificial deep recharge shafts.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-slate-100 text-slate-700 rounded-xl w-fit">
              <Globe size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Executive Report Export</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Export traceable, reproducible PDF planning briefs with complete timestamps, model versions, and environmental metrics.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-10 text-center border-t border-slate-200/60 text-[10px] font-bold tracking-wider text-slate-400 uppercase max-w-7xl mx-auto px-6">
        <span>© 2026 SANKALP • BISAG-N & Smart Cities Mission • Confidential</span>
      </footer>
    </div>
  );
}
