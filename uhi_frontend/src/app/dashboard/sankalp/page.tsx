'use client';

import React, { useState } from 'react';
import { Cpu, ExternalLink, RefreshCw, Layers, ShieldAlert, Activity } from 'lucide-react';

export default function SankalpProductionCommandPage() {
  const [activeTab, setActiveTab] = useState<'mission' | 'quantum' | 'tactical'>('mission');
  const [iframeKey, setIframeKey] = useState(0);

  const getUrl = () => {
    switch (activeTab) {
      case 'mission':
        return 'http://127.0.0.1:8000/';
      case 'quantum':
        return 'http://127.0.0.1:8000/inference/';
      case 'tactical':
        return 'http://127.0.0.1:8000/map/';
      default:
        return 'http://127.0.0.1:8000/';
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#030305] text-slate-100 overflow-hidden">
      {/* Top Bar Controls */}
      <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-black/60 backdrop-blur-md border-b border-white/10 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Cpu size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold tracking-wider uppercase text-cyan-300">
                SANKALP Mission Control & Quantum Command
              </h1>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                LIVE PRODUCTION UI/UX
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Direct Tri-Domain LangGraph Engine // Architect: Dhaval Agrawal (BISAG-N)
            </p>
          </div>
        </div>

        {/* Tab Switcher & Action Controls */}
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab('mission')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'mission'
                  ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Mission Control (Radar)
            </button>
            <button
              onClick={() => setActiveTab('quantum')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'quantum'
                  ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Quantum 3D Command
            </button>
            <button
              onClick={() => setActiveTab('tactical')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'tactical'
                  ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Tactical GIS Heatmap
            </button>
          </div>

          <button
            onClick={() => setIframeKey(prev => prev + 1)}
            title="Reload Frame"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw size={15} />
          </button>

          <a
            href={getUrl()}
            target="_blank"
            rel="noreferrer"
            title="Open in Fullscreen Tab"
            className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>Pop Out</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* Main Full-Screen Frame */}
      <div className="flex-1 w-full h-full relative bg-[#030305]">
        <iframe
          key={`${activeTab}-${iframeKey}`}
          src={getUrl()}
          className="w-full h-full border-0 absolute inset-0"
          title="SANKALP Production Interface"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    </div>
  );
}
