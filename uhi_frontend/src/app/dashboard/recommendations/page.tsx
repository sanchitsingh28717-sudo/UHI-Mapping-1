'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, MapPin, AlertCircle, ArrowRight, Printer, ShieldCheck, 
  Download, Cpu, Wind, Sun, Building, Zap, CheckCircle2, ChevronDown, ChevronUp, Radio
} from 'lucide-react';

const BACKEND_URL = 'http://127.0.0.1:8000';

export default function RecommendationsPage() {
  const { selectedCoords, recommendations, sankalpData, fetchRecommendations } = useStore();
  const [generating, setGenerating] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
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

  const handleDownloadDossier = () => {
    if (!sankalpData?.dossier_file) return;
    const url = `${BACKEND_URL}/api/vault/download/${sankalpData.dossier_file}/`;
    window.open(url, '_blank');
  };

  // HTML parser for markdown format headings and bullet points
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

  const opt = sankalpData?.optimization;
  const act = sankalpData?.actuation?.hardware_triggers;

  return (
    <div className="min-h-full w-full flex flex-col text-slate-100">
      <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6 flex-1">
        {/* Page Header Box */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl cosmic-card border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] transition-all">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-black/35 border border-[#a7cecd]/40 text-[#a7cecd] shadow-[0_0_15px_rgba(167,206,205,0.25)] glow-active">
              <Cpu size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-white drop-shadow-sm" style={{ color: '#a7cecd' }}>
                  SANKALP Autonomous Mitigation Agent
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#a7cecd]/20 text-[#a7cecd] border border-[#a7cecd]/30">
                  ONNX Quad-Suite v4
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5 drop-shadow-sm">
                Generative multi-physics microclimate co-optimization, IoT swarm actuation, and policy directives.
              </p>
            </div>
          </div>
        </div>

        {!selectedCoords ? (
          <div className="cosmic-card border border-amber-500/30 p-6 rounded-2xl flex items-start gap-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] transition-all">
            <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5 drop-shadow animate-pulse" size={22} />
            <div>
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Inspection Coordinate Required</h3>
              <p className="text-[11px] text-slate-200 mt-1.5 leading-relaxed drop-shadow-sm">
                Before autonomous mitigation can be generated, select a coordinate on the GIS Map Workspace.
              </p>
              <Link 
                href="/dashboard/map" 
                className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 text-slate-950 font-extrabold text-[11px] rounded-xl shadow-lg transition-all duration-200 ease-in-out hover:bg-black/60 hover:text-[#a7cecd] border border-transparent hover:border-[#a7cecd] cursor-pointer animate-shimmer"
                style={{ backgroundColor: '#a7cecd' }}
              >
                Go to Map Workspace
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Coordinates Header Box */}
            <div className="cosmic-card border border-white/10 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-black/35 text-[#a7cecd] border border-[#a7cecd]/30 rounded-lg shadow-inner">
                  <MapPin size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Target Inspection Coordinate</span>
                  <span 
                    onClick={handleCoordinateClick}
                    className="text-xs font-mono font-bold text-[#a7cecd] hover:underline cursor-pointer hover:text-teal-200 transition-colors"
                    title="Click to view on Map Workspace"
                  >
                    Lat: {selectedCoords.lat.toFixed(5)}, Lng: {selectedCoords.lng.toFixed(5)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {sankalpData?.dossier_file && (
                  <button
                    onClick={handleDownloadDossier}
                    className="px-3.5 py-2 font-bold text-xs rounded-xl shadow-lg transition-all duration-200 text-white bg-white/10 hover:bg-white/20 border border-white/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={14} className="text-[#a7cecd]" />
                    <span>Official Dossier (PDF)</span>
                  </button>
                )}
                
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="px-5 py-2 font-bold text-xs rounded-xl shadow-lg transition-all duration-200 ease-in-out text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/60 hover:text-[#a7cecd] border border-transparent hover:border-[#a7cecd] cursor-pointer animate-shimmer flex items-center gap-2"
                  style={{ backgroundColor: '#a7cecd' }}
                >
                  <Sparkles size={14} />
                  {generating ? 'Executing LangGraph Agent...' : (recommendations ? 'Re-Run Optimization' : 'Execute SANKALP Agent')}
                </button>
              </div>
            </div>

            {generating && (
              <div className="bg-black/30 backdrop-blur-sm p-8 rounded-2xl border border-white/10 text-center space-y-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
                <div className="w-10 h-10 border-4 border-[#a7cecd] border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_15px_rgba(167,206,205,0.4)]" />
                <div>
                  <h3 className="text-xs font-bold text-slate-100">Executing SANKALP 7-Node Omni-Sentinel Graph</h3>
                  <p className="text-[11px] text-slate-300 mt-1 max-w-md mx-auto leading-relaxed">
                    Zero-Trust Verification ➔ Vision Telemetry Intake ➔ ONNX Multi-Physics Co-Optimization ➔ IoT Actuation Synthesis ➔ Cryptographic PDF Generation
                  </p>
                </div>
              </div>
            )}

            {/* SANKALP Rich Generative Matrix Dashboard */}
            {opt && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* LST Reduction Card */}
                <div className="cosmic-card border border-rose-500/30 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-rose-300">
                      <Sun size={14} /> Surface Temp (LST)
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
                      -{opt.lst_delta || (opt.initial_lst - opt.final_lst).toFixed(1)}°C
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Baseline</span>
                      <span className="text-sm font-mono text-slate-300 line-through">{opt.initial_lst}°C</span>
                    </div>
                    <ArrowRight size={14} className="text-rose-400" />
                    <div className="text-right">
                      <span className="text-[10px] text-emerald-400 font-bold block">Optimized</span>
                      <span className="text-lg font-mono font-black text-emerald-300">{opt.final_lst}°C</span>
                    </div>
                  </div>
                </div>

                {/* Building Morphology Card */}
                <div className="cosmic-card border border-blue-500/30 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#a7cecd' }}>
                      <Building size={14} style={{ color: '#a7cecd' }} /> Canyon Height
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono border" style={{ backgroundColor: 'rgba(167, 206, 205, 0.15)', color: '#a7cecd', borderColor: 'rgba(167, 206, 205, 0.3)' }}>
                      Z-Axis
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Initial</span>
                      <span className="text-sm font-mono text-slate-300">{opt.initial_height}m</span>
                    </div>
                    <ArrowRight size={14} style={{ color: '#a7cecd' }} />
                    <div className="text-right">
                      <span className="text-[10px] text-[#a7cecd] font-bold block">Enforced Target</span>
                      <span className="text-lg font-mono font-black text-[#a7cecd]">{opt.final_height}m</span>
                    </div>
                  </div>
                </div>

                {/* Surface Albedo Card */}
                <div className="cosmic-card border border-amber-500/30 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#a7cecd' }}>
                      <Sparkles size={14} style={{ color: '#a7cecd' }} /> Cool-Roof Albedo
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono border" style={{ backgroundColor: 'rgba(167, 206, 205, 0.15)', color: '#a7cecd', borderColor: 'rgba(167, 206, 205, 0.3)' }}>
                      Reflectivity
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Current</span>
                      <span className="text-sm font-mono text-slate-300">{opt.initial_albedo}</span>
                    </div>
                    <ArrowRight size={14} style={{ color: '#a7cecd' }} />
                    <div className="text-right">
                      <span className="text-[10px] font-bold block" style={{ color: '#a7cecd' }}>Mandated</span>
                      <span className="text-lg font-mono font-black" style={{ color: '#a7cecd' }}>{opt.final_albedo}</span>
                    </div>
                  </div>
                </div>

                {/* Energy Economics HVAC Savings Card */}
                <div className="cosmic-card border border-emerald-500/30 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-emerald-300">
                      <Zap size={14} /> Peak HVAC Saving
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                      Daily Peak
                    </span>
                  </div>
                  <div className="pt-1">
                    <span className="text-2xl font-mono font-black text-emerald-300 block">
                      {opt.hvac_savings_mwh} <span className="text-xs font-normal text-emerald-400">MWh</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Substation Grid Load Suppressed</span>
                  </div>
                </div>
              </div>
            )}

            {/* IoT Swarm Actuation Control Matrix */}
            {act && (
              <div className="cosmic-card border border-[#a7cecd]/30 p-5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio size={16} style={{ color: '#a7cecd' }} className="animate-pulse" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider" style={{ color: '#a7cecd' }}>
                      Edge Hardware Actuation Matrix (MQTT Protocol QOS-2)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Target Zone: ({sankalpData?.actuation?.target_zone_lat.toFixed(4)}, {sankalpData?.actuation?.target_zone_lng.toFixed(4)})</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="bg-black/40 border border-[#a7cecd]/25 hover:border-[#a7cecd]/60 hover:scale-[1.02] hover:shadow-[0_4px_16px_0_rgba(167,206,205,0.18)] transition-transform duration-500 ease-in-out p-3 rounded-xl cursor-default">
                    <span className="text-[10px] uppercase font-bold block" style={{ color: '#a7cecd' }}>Misting Grid Pulse</span>
                    <span className="text-base font-mono font-bold mt-1 block" style={{ color: '#a7cecd' }}>
                      {act.misting_grid_pulse_ms} ms
                    </span>
                    <span className="text-[9px] text-slate-400">Micro-droplet evaporative cooling</span>
                  </div>
                  
                  <div className="bg-black/40 border border-[#a7cecd]/25 hover:border-[#a7cecd]/60 hover:scale-[1.02] hover:shadow-[0_4px_16px_0_rgba(167,206,205,0.18)] transition-transform duration-500 ease-in-out p-3 rounded-xl cursor-default">
                    <span className="text-[10px] uppercase font-bold block" style={{ color: '#a7cecd' }}>Louver Servo Vector</span>
                    <span className="text-base font-mono font-bold mt-1 block" style={{ color: '#a7cecd' }}>
                      {act.louver_servo_angle_deg}° Angle
                    </span>
                    <span className="text-[9px] text-slate-400">Dynamic ventilation redirection</span>
                  </div>

                  <div className="bg-black/40 border border-[#a7cecd]/25 hover:border-[#a7cecd]/60 hover:scale-[1.02] hover:shadow-[0_4px_16px_0_rgba(167,206,205,0.18)] transition-transform duration-500 ease-in-out p-3 rounded-xl cursor-default">
                    <span className="text-[10px] uppercase font-bold block" style={{ color: '#a7cecd' }}>Smart Glass Opacity</span>
                    <span className="text-base font-mono font-bold mt-1 block" style={{ color: '#a7cecd' }}>
                      {act.smart_glass_opacity_pct}%
                    </span>
                    <span className="text-[9px] text-slate-400">Electrochromic radiation attenuation</span>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendations Render Box */}
            {recommendations && (
              <div className="cosmic-card p-8 rounded-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] relative text-slate-100 space-y-6">
                {/* Document Header */}
                <div className="flex justify-between items-start border-b border-white/10 pb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={18} className="text-[#a7cecd]" />
                      <h2 className="text-base font-extrabold tracking-wider uppercase" style={{ color: '#a7cecd' }}>
                        SANKALP Autonomous Intervention Mandate & Policy Draft
                      </h2>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                      UHI Target Coordinates:{' '}
                      <span 
                        onClick={handleCoordinateClick}
                        className="text-[#a7cecd] hover:underline cursor-pointer font-bold"
                        title="Click to view on Map Workspace"
                      >
                        ({selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)})
                      </span>
                      {sankalpData?.state_hash && (
                        <span className="ml-3 text-slate-400 font-mono">
                          Digital Fingerprint: <span className="text-slate-300 font-mono">{sankalpData.state_hash.slice(0, 16)}...</span>
                        </span>
                      )}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {sankalpData?.dossier_file && (
                      <button 
                        onClick={handleDownloadDossier} 
                        className="px-3 py-1.5 text-xs text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/10 cursor-pointer flex items-center gap-1.5"
                        title="Download Cryptographic PDF Dossier"
                      >
                        <Download size={14} className="text-[#a7cecd]" />
                        <span>PDF</span>
                      </button>
                    )}
                    <button 
                      onClick={() => window.print()} 
                      className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-white/10 cursor-pointer"
                      title="Print Report"
                    >
                      <Printer size={16} />
                    </button>
                  </div>
                </div>

                {/* Text Area */}
                <div className="prose prose-invert prose-sm max-w-none">
                  {renderRecommendations(recommendations)}
                </div>

                {/* Audit Logs Accordion */}
                {sankalpData?.logs && sankalpData.logs.length > 0 && (
                  <div className="border-t border-white/10 pt-4">
                    <button
                      onClick={() => setShowLogs(!showLogs)}
                      className="flex items-center justify-between w-full text-[11px] font-mono text-slate-400 hover:text-slate-200 transition-colors py-1"
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        <span>LangGraph 7-Node Execution Audit Trail ({sankalpData.logs.length} events logged)</span>
                      </span>
                      {showLogs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {showLogs && (
                      <div className="mt-3 p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-[10px] space-y-1 text-slate-300 max-h-48 overflow-y-auto">
                        {sankalpData.logs.map((log, i) => (
                          <div key={i} className="flex gap-2">
                            <span className="text-[#a7cecd] font-bold">[{i+1}]</span>
                            <span>{log}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Document Footer */}
                <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[9px] font-bold text-slate-400 font-mono">
                  <span>ARCHITECTURE: SANKALP Tri-Domain LangGraph + ONNX Quad-Suite</span>
                  <span>FORENSIC VAULT: Secure Cryptographic Hash SHA-256 Validated</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
