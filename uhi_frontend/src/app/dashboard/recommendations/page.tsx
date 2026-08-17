'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, MapPin, AlertCircle, ArrowRight, Printer, ShieldCheck } from 'lucide-react';

export default function RecommendationsPage() {
  const { selectedCoords, analysisResult, recommendations, fetchRecommendations, loading } = useStore();
  const [generating, setGenerating] = useState(false);
  const router = useRouter();

  const handleCoordinateClick = () => {
    router.push('/dashboard/map');
  };

  const handleGenerate = async () => {
    if (!selectedCoords) return;
    setGenerating(true);
    await fetchRecommendations(selectedCoords.lat, selectedCoords.lng);
    setGenerating(false);
  };

  // HTML parser for markdown format headings and bullet points styled for cosmic dark glassmorphism
  const renderRecommendations = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('###')) {
        return (
          <h3 key={idx} className="text-sm font-extrabold text-[#a7cecd] mt-6 mb-2.5 uppercase tracking-wide border-b border-white/10 pb-1.5 flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-[#a7cecd] rounded-sm shadow-[0_0_8px_rgba(167,206,205,0.6)]" />
            {trimmed.replace('###', '').trim()}
          </h3>
        );
      }
      if (trimmed.startsWith('##')) {
        return (
          <h2 key={idx} className="text-base font-black text-slate-100 mt-8 mb-4 border-l-4 border-[#a7cecd] pl-3 flex items-center gap-2">
            <Sparkles size={16} className="text-[#a7cecd]" />
            {trimmed.replace('##', '').trim()}
          </h2>
        );
      }
      if (trimmed.startsWith('-')) {
        return (
          <li key={idx} className="text-xs text-slate-200 ml-4 pl-1.5 list-disc leading-relaxed mb-2 marker:text-[#a7cecd]">
            <strong className="text-slate-100">{trimmed.split(':')[0].replace('-', '').trim()}:</strong>
            {trimmed.split(':').slice(1).join(':')}
          </li>
        );
      }
      if (trimmed) {
        return (
          <p key={idx} className="text-xs text-slate-200 leading-relaxed mb-4">
            {trimmed}
          </p>
        );
      }
      return null;
    });
  };

  return (
    <div 
      className="min-h-full w-full bg-cover bg-center bg-no-repeat bg-fixed relative flex flex-col"
      style={{
        backgroundImage: "url('/milkyway-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
      }}
    >
      {/* Subtle global dark overlay allowing stars to shine through */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* Content Container */}
      <div className="relative z-10 p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6 flex-1">
        {/* Page Header Box - Seamless Blended Glass */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-black/25 backdrop-blur-sm border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] transition-colors hover:border-white/20">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-black/35 border border-[#a7cecd]/40 text-[#a7cecd] shadow-[0_0_15px_rgba(167,206,205,0.25)]">
              <Sparkles size={22} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white drop-shadow-sm" style={{ color: '#a7cecd' }}>
                AI Mitigation Recommendations
              </h1>
              <p className="text-xs text-slate-300 font-medium mt-0.5 drop-shadow-sm">
                Generative AI planning recommendations and urban cooling strategies.
              </p>
            </div>
          </div>
        </div>

        {!selectedCoords ? (
          /* Inspection Coordinate Required Box - Seamless Blended Glass */
          <div className="bg-black/25 backdrop-blur-sm border border-amber-500/30 p-6 rounded-2xl flex items-start gap-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] transition-colors hover:border-amber-500/40">
            <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5 drop-shadow" size={22} />
            <div>
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Inspection Coordinate Required</h3>
              <p className="text-[11px] text-slate-200 mt-1.5 leading-relaxed drop-shadow-sm">
                Before recommendations can be generated, you must select a coordinate on the GIS Map Workspace.
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
            {/* Coordinates Header Box - Seamless Blended Glass */}
            <div className="bg-black/25 backdrop-blur-sm border border-white/10 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-black/35 text-[#a7cecd] border border-[#a7cecd]/30 rounded-lg shadow-inner">
                  <MapPin size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Inspected Coordinate</span>
                  <span 
                    onClick={handleCoordinateClick}
                    className="text-xs font-mono font-bold text-[#a7cecd] hover:underline cursor-pointer hover:text-teal-200 transition-colors"
                    title="Click to view on Map Workspace"
                  >
                    Lat: {selectedCoords.lat.toFixed(5)}, Lng: {selectedCoords.lng.toFixed(5)}
                  </span>
                </div>
              </div>
              {!recommendations && (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="px-5 py-2.5 font-bold text-xs rounded-xl shadow-lg transition-all duration-200 ease-in-out text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/60 hover:text-[#a7cecd] border border-transparent hover:border-[#a7cecd] cursor-pointer"
                  style={{ backgroundColor: '#a7cecd' }}
                >
                  {generating ? 'Synthesizing...' : 'Generate Recommendations'}
                </button>
              )}
            </div>

            {generating && (
              <div className="bg-black/30 backdrop-blur-sm p-8 rounded-2xl border border-white/10 text-center space-y-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
                <div className="w-10 h-10 border-4 border-[#a7cecd] border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_15px_rgba(167,206,205,0.4)]" />
                <div>
                  <h3 className="text-xs font-bold text-slate-100">Interrogating Climate Knowledgebase</h3>
                  <p className="text-[11px] text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
                    Analyzing vegetation indices, built-up density, and surface temperatures to build customized micro-climate guidelines.
                  </p>
                </div>
              </div>
            )}

            {/* Recommendations Render Box - Seamless Blended Glass */}
            {recommendations && (
              <div className="bg-black/35 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] relative text-slate-100">
                {/* Document Header */}
                <div className="flex justify-between items-start border-b border-white/10 pb-5 mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-[#a7cecd]" />
                      <h2 className="text-sm font-extrabold tracking-wider uppercase" style={{ color: '#a7cecd' }}>
                        Micro-Climate Adaptation Plan
                      </h2>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                      Ahmedabad UHI Target:{' '}
                      <span 
                        onClick={handleCoordinateClick}
                        className="text-[#a7cecd] hover:underline cursor-pointer font-bold"
                        title="Click to view on Map Workspace"
                      >
                        ({selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)})
                      </span>
                    </p>
                  </div>
                  <button 
                    onClick={() => window.print()} 
                    className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-white/10 cursor-pointer"
                    title="Print Report"
                  >
                    <Printer size={16} />
                  </button>
                </div>

                {/* Text Area */}
                <div className="prose prose-invert prose-sm max-w-none">
                  {renderRecommendations(recommendations)}
                </div>

                {/* Document Footer */}
                <div className="mt-8 pt-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[9px] font-bold text-slate-400 font-mono">
                  <span>SYSTEM VERSION: CIP-XGBOOST-V1.0.1</span>
                  <span>METADATA STAMP: Landsat 8/9, SRTM, ESA WorldCover</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
