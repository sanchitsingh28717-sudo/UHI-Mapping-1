'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, MapPin, AlertCircle, FileText, ArrowRight, Printer } from 'lucide-react';

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

  // Basic HTML parser for markdown format headings and bullet points
  const renderRecommendations = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('###')) {
        return (
          <h3 key={idx} className="text-sm font-extrabold text-emerald-800 mt-6 mb-2.5 uppercase tracking-wide border-b border-emerald-100 pb-1 flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-emerald-600 rounded-sm" />
            {trimmed.replace('###', '').trim()}
          </h3>
        );
      }
      if (trimmed.startsWith('##')) {
        return (
          <h2 key={idx} className="text-base font-black text-slate-900 mt-8 mb-4 border-l-4 border-emerald-600 pl-3">
            {trimmed.replace('##', '').trim()}
          </h2>
        );
      }
      if (trimmed.startsWith('-')) {
        return (
          <li key={idx} className="text-xs text-slate-600 ml-4 pl-1.5 list-disc leading-relaxed mb-2">
            <strong className="text-slate-800">{trimmed.split(':')[0].replace('-', '').trim()}:</strong>
            {trimmed.split(':').slice(1).join(':')}
          </li>
        );
      }
      if (trimmed) {
        return (
          <p key={idx} className="text-xs text-slate-600 leading-relaxed mb-4">
            {trimmed}
          </p>
        );
      }
      return null;
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: '#a7cecd' }}>
            AI Mitigation Recommendations
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Generative AI planning recommendations and urban cooling strategies.
          </p>
        </div>
      </div>

      {!selectedCoords ? (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-start gap-4 shadow-xl">
          <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Inspection Coordinate Required</h3>
            <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
              Before recommendations can be generated, you must select a coordinate on the GIS Map Workspace.
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
          {/* Coordinates Header */}
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                <MapPin size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Inspected Coordinate</span>
                <span 
                  onClick={handleCoordinateClick}
                  className="text-xs font-mono font-bold text-emerald-600 hover:underline cursor-pointer"
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
                className="px-4 py-2 bg-emerald-600 hover:bg-slate-900 hover:text-emerald-400 border border-transparent hover:border-emerald-500 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all duration-200 ease-in-out"
              >
                {generating ? 'Synthesizing...' : 'Generate Recommendations'}
              </button>
            )}
          </div>

          {generating && (
            <div className="glass-panel p-8 rounded-2xl border border-slate-150 text-center space-y-4">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <div>
                <h3 className="text-xs font-bold text-slate-700">Interrogating Climate Knowledgebase</h3>
                <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  Analyzing vegetation indices, built-up density, and surface temperatures to build customized micro-climate guidelines.
                </p>
              </div>
            </div>
          )}

          {/* Recommendations Render */}
          {recommendations && (
            <div className="glass-panel p-8 rounded-2xl border border-slate-200 shadow-md relative bg-white">
              {/* Document Header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-5 mb-6">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-800">MICRO-CLIMATE ADAPTATION PLAN</h2>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    Ahmedabad UHI Target:{' '}
                    <span 
                      onClick={handleCoordinateClick}
                      className="text-emerald-600 hover:underline cursor-pointer font-bold"
                      title="Click to view on Map Workspace"
                    >
                      ({selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)})
                    </span>
                  </p>
                </div>
                <button 
                  onClick={() => window.print()} 
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Print Report"
                >
                  <Printer size={16} />
                </button>
              </div>

              {/* Text Area */}
              <div className="prose prose-sm max-w-none">
                {renderRecommendations(recommendations)}
              </div>

              {/* Document Footer */}
              <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between text-[9px] font-bold text-slate-400 font-mono">
                <span>SYSTEM VERSION: CIP-XGBOOST-V1.0.1</span>
                <span>METADATA STAMP: Landsat 8/9, SRTM, ESA WorldCover</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
