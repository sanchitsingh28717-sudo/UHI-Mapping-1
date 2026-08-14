'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useStore } from '@/store/useStore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import { 
  Sparkles, Wind, Droplets, Download, 
  MapPin, HelpCircle, AlertTriangle, BarChart3, RefreshCw,
  PanelRightClose, PanelRightOpen
} from 'lucide-react';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

export default function MapWorkspace() {
  const { 
    selectedCoords, setSelectedCoords, analysisResult, setAnalysisResult, 
    setRecommendations, runAnalysis, loading, error, token, fetchRecommendations,
    hoveredWard, activeCity, setActiveCity
  } = useStore();
  
  const [downloading, setDownloading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [includeWind, setIncludeWind] = useState(true);
  const [includeGroundwater, setIncludeGroundwater] = useState(true);
  const [includeAquifer, setIncludeAquifer] = useState(true);
  const [includeSocioThermal, setIncludeSocioThermal] = useState(true);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const handleExecuteAnalysis = async () => {
    if (!selectedCoords) return;
    const success = await runAnalysis(selectedCoords.lat, selectedCoords.lng);
    if (success) {
      fetchRecommendations(selectedCoords.lat, selectedCoords.lng);
    }
  };

  const handleReset = () => {
    setSelectedCoords(null);
    setAnalysisResult(null);
    setRecommendations(null);
    setIncludeWind(true);
    setIncludeGroundwater(true);
    setIncludeAquifer(true);
    setIncludeSocioThermal(true);
  };

  const handleExportPDF = async () => {
    if (!selectedCoords || !token) return;
    setDownloading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/reports/export/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          latitude: selectedCoords.lat, 
          longitude: selectedCoords.lng,
          include_wind: includeWind,
          include_groundwater: includeGroundwater,
          include_aquifer: includeAquifer,
          include_socio_thermal: includeSocioThermal
        })
      });
      
      if (!res.ok) throw new Error('PDF generation failed.');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ClimateIntel_Report_${selectedCoords.lat.toFixed(4)}_${selectedCoords.lng.toFixed(4)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setShowExportModal(false);
    } catch (err) {
      alert('Failed to export report.');
    } finally {
      setDownloading(false);
    }
  };

  const getShapData = () => {
    if (!analysisResult?.explainability?.shap_summary) return [];
    return Object.entries(analysisResult.explainability.shap_summary).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(4)),
    }));
  };

  const shapData = getShapData();

  const getLulcName = (code: number) => {
    const categories: Record<number, string> = {
      10: 'Trees / Forest',
      20: 'Shrubland',
      30: 'Grassland',
      40: 'Cropland',
      50: 'Built-up (Urban)',
      60: 'Bare / Sparse vegetation',
      70: 'Snow / Ice',
      80: 'Water bodies',
      90: 'Wetland',
      95: 'Mangroves'
    };
    return categories[code] || `LULC Code ${code}`;
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen overflow-hidden bg-slate-950 relative">
      {/* Map Area */}
      <div className="flex-1 relative h-full p-3 min-w-0">
        <MapComponent panelCollapsed={panelCollapsed} />
      </div>

      {/* Collapse/Expand Toggle Button */}
      <button
        onClick={() => setPanelCollapsed(!panelCollapsed)}
        className="absolute top-1/2 -translate-y-1/2 z-[2000] bg-slate-900 border border-slate-700 text-slate-400 hover:bg-slate-800 transition-all p-2 rounded-l-xl shadow-xl cursor-pointer"
        style={{ right: panelCollapsed ? 0 : '320px', color: panelCollapsed ? undefined : '#a7cecd' }}
        title={panelCollapsed ? 'Expand Panel' : 'Collapse Panel'}
      >
        {panelCollapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
      </button>

      {/* Analysis Sidebar Panel — Dark Theme */}
      <div
        className={`border-l border-slate-800 bg-slate-950 flex flex-col h-full transition-all duration-300 ease-in-out flex-shrink-0 ${
          panelCollapsed ? 'w-0 overflow-hidden opacity-0' : 'w-80 opacity-100'
        }`}
      >
        {/* Panel Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 flex-shrink-0">
          <h2 className="text-xs font-extrabold tracking-tight" style={{ color: '#a7cecd' }}>
            Decision Support Panel
          </h2>
          <div className="flex items-center gap-1.5">
            {analysisResult && (
              <>
                <button
                  onClick={() => setShowExportModal(true)}
                  disabled={downloading}
                  className="p-1.5 text-slate-500 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  style={{ color: downloading ? '#a7cecd' : undefined }}
                  title="Export Executive PDF Report"
                >
                  <Download size={14} className={downloading ? 'animate-bounce' : ''} />
                </button>
                <button
                  onClick={handleReset}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Inspect New Coordinate"
                >
                  <RefreshCw size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="p-4 flex-1 space-y-4 overflow-y-auto">
          {/* Region Selection Card */}
          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
              Active Regional Scope
            </label>
            <select
              value={activeCity}
              onChange={(e) => setActiveCity(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-[11px] font-semibold p-2 rounded-lg text-slate-200 focus:outline-none cursor-pointer"
              style={{ borderColor: 'rgba(167, 206, 205, 0.3)' }}
            >
              <option value="Ahmedabad">Ahmedabad (AMC Limits)</option>
              <option value="Gandhinagar">Gandhinagar (District)</option>
              <option value="Delhi">Delhi (NCT Area)</option>
              <option value="Mumbai_City">Mumbai City District</option>
              <option value="Mumbai_Suburban">Mumbai Suburban District</option>
              <option value="Thane">Thane Sub-district</option>
              <option value="Mumbai_Metro">Mumbai Metropolitan Region (MMR)</option>
            </select>
          </div>

          {/* Coordinates Inspection Section */}
          {!selectedCoords ? (
            <div className="space-y-3">
              {hoveredWard ? (
                <div 
                  className="p-4 rounded-xl border space-y-3"
                  style={{ backgroundColor: 'rgba(167, 206, 205, 0.05)', borderColor: 'rgba(167, 206, 205, 0.2)' }}
                >
                  <div className="flex items-center gap-2 font-extrabold text-xs border-b border-slate-800 pb-2" style={{ color: '#a7cecd' }}>
                    <Sparkles size={14} style={{ color: '#a7cecd' }} />
                    {hoveredWard.name} Ward Profile
                  </div>
                  
                  <div className="space-y-2 text-[11px] text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Zone Location</span>
                      <span className="font-bold text-slate-200">{hoveredWard.zone} Zone</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Avg Surface Temp</span>
                      <span className="font-bold text-amber-300">{hoveredWard.lst_avg_celsius}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Avg Vegetation (NDVI)</span>
                      <span className="font-bold" style={{ color: '#a7cecd' }}>{hoveredWard.ndvi_avg}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Municipal Area</span>
                      <span className="font-bold text-slate-200">{hoveredWard.area_km2} km²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Est. Population</span>
                      <span className="font-bold text-slate-200">{hoveredWard.population.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Pop. Density</span>
                      <span className="font-bold text-slate-200">{hoveredWard.density_per_km2} / km²</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">UHI Vulnerability</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase ${
                      hoveredWard.vulnerability === 'Very High Risk' || hoveredWard.vulnerability === 'High Risk'
                        ? 'bg-rose-900/50 text-rose-300 border border-rose-800/50'
                        : hoveredWard.vulnerability === 'Medium Risk'
                        ? 'bg-amber-900/50 text-amber-300 border border-amber-800/50'
                        : 'bg-slate-800 text-[#a7cecd] border border-[#a7cecd]/30'
                    }`}>
                      {hoveredWard.vulnerability}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-center p-5 bg-slate-900/60 border border-dashed border-slate-700 rounded-xl">
                  <MapPin size={28} className="text-slate-600 mb-2 animate-bounce" />
                  <h3 className="text-xs font-bold text-slate-400">No Coordinates Inspected</h3>
                  <p className="text-[10px] text-slate-600 mt-1 max-w-[180px] leading-relaxed">
                    Click anywhere inside the dashed administrative boundary on the map.
                  </p>
                </div>
              )}
            </div>

          ) : (
            <div className="space-y-4">
              {/* Selected Coordinates */}
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Inspected Coordinates</h4>
                  <p className="text-[11px] font-mono font-bold mt-0.5" style={{ color: '#a7cecd' }}>
                    {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
                  </p>
                </div>
                {analysisResult ? (
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-[#a7cecd] hover:text-slate-950 text-slate-300 font-bold text-[10px] rounded-lg transition-all duration-200 ease-in-out cursor-pointer border border-slate-700 hover:border-[#a7cecd]"
                  >
                    Reset
                  </button>
                ) : !loading ? (
                  <button
                    onClick={handleExecuteAnalysis}
                    className="px-3 py-1.5 text-slate-950 font-extrabold text-[10px] rounded-lg shadow-lg cursor-pointer transition-all duration-200 ease-in-out hover:bg-slate-950 hover:text-[#a7cecd] border border-transparent hover:border-[#a7cecd]"
                    style={{ backgroundColor: '#a7cecd' }}
                  >
                    Analyze
                  </button>
                ) : null}
              </div>

              {hoveredWard && (
                <div 
                  className="p-3 rounded-xl border space-y-1.5 text-[10px]"
                  style={{ backgroundColor: 'rgba(167, 206, 205, 0.04)', borderColor: 'rgba(167, 206, 205, 0.2)' }}
                >
                  <div className="flex items-center gap-1.5 font-bold" style={{ color: '#a7cecd' }}>
                    <Sparkles size={11} style={{ color: '#a7cecd' }} />
                    Hovered: {hoveredWard.name} Ward ({hoveredWard.zone} Zone)
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-400">
                    <p><span className="text-slate-500">Temp:</span> <span className="text-amber-300 font-bold">{hoveredWard.lst_avg_celsius}°C</span></p>
                    <p><span className="text-slate-500">NDVI:</span> <span className="font-bold" style={{ color: '#a7cecd' }}>{hoveredWard.ndvi_avg}</span></p>
                    <p><span className="text-slate-500">Area:</span> {hoveredWard.area_km2} km²</p>
                    <p><span className="text-slate-500">Pop:</span> {hoveredWard.population.toLocaleString()}</p>
                  </div>
                  <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[9px]">
                    <span className="font-semibold text-slate-500">Vulnerability:</span>
                    <span className="font-extrabold text-amber-300 uppercase tracking-wider">{hoveredWard.vulnerability}</span>
                  </div>
                </div>
              )}

              {loading && (
                <div className="p-5 text-center space-y-2 flex flex-col items-center justify-center bg-slate-900 rounded-xl border border-slate-800">
                  <div className="w-7 h-7 border-[3px] border-t-transparent rounded-full animate-spin" style={{ borderColor: '#a7cecd', borderTopColor: 'transparent' }} />
                  <p className="text-[10px] font-bold text-slate-500">Extracting spatial indices and running ML booster...</p>
                </div>
              )}

              {error && (
                <div className="p-3.5 bg-rose-950/40 border border-rose-900/50 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="text-rose-400 flex-shrink-0 mt-0.5" size={14} />
                  <div className="flex-1">
                    <h5 className="text-[10px] font-bold text-rose-400">Spatial Validation Failed</h5>
                    <p className="text-[9px] text-rose-500/80 mt-1 leading-relaxed">{error}</p>
                    <button
                      onClick={handleReset}
                      className="mt-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[9px] font-bold transition-all cursor-pointer"
                    >
                      Clear Coordinate
                    </button>
                  </div>
                </div>
              )}

              {analysisResult && (
                <div className="space-y-4">
                  {/* Heat Classification Output */}
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Model Prediction</h4>
                        <p className="text-sm font-extrabold text-slate-100 mt-0.5">
                          {analysisResult.prediction.heat_zone}
                        </p>
                        <p className="text-[9px] text-slate-500 mt-0.5">
                          Confidence: {(analysisResult.prediction.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-[9px] font-extrabold rounded-lg uppercase tracking-wider border ${
                        analysisResult.prediction.heat_zone === 'High Heat Zone'
                          ? 'bg-rose-900/50 border-rose-800/50 text-rose-300 animate-pulse'
                          : analysisResult.prediction.heat_zone === 'Medium Heat Zone'
                          ? 'bg-amber-900/50 border-amber-800/50 text-amber-300'
                          : 'bg-slate-800 text-[#a7cecd] border border-[#a7cecd]/30'
                      }`}>
                        {analysisResult.prediction.heat_zone.split(' ')[0]}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                      <div>
                        <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Heat Risk Index</h4>
                        <p className="text-lg font-black text-slate-100 mt-0.5">
                          {analysisResult.risk_index.risk_score} <span className="text-xs text-slate-600 font-semibold">/ 100</span>
                        </p>
                        <p className="text-[9px] text-slate-500 mt-0.5">
                          {analysisResult.risk_index.risk_category}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 text-[9px] font-extrabold rounded-lg uppercase tracking-wider ${
                        analysisResult.risk_index.risk_category.includes('Very High') || analysisResult.risk_index.risk_category.includes('High')
                          ? 'bg-rose-900/80 text-rose-200 border border-rose-700'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {analysisResult.risk_index.risk_category}
                      </span>
                    </div>
                  </div>

                  {/* Environmental Indicators */}
                  <div>
                    <h3 className="text-[9px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Environmental Variables</h3>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[8px] font-bold text-slate-600 block uppercase">Temp (LST)</span>
                        <span className="font-extrabold text-amber-300">{analysisResult.environmental_indicators.lst.toFixed(1)} °C</span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[8px] font-bold text-slate-600 block uppercase">Vegetation (NDVI)</span>
                        <span className="font-extrabold" style={{ color: '#a7cecd' }}>{analysisResult.environmental_indicators.ndvi.toFixed(3)}</span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[8px] font-bold text-slate-600 block uppercase">Built-Up (NDBI)</span>
                        <span className="font-extrabold text-amber-400">{analysisResult.environmental_indicators.ndbi.toFixed(3)}</span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[8px] font-bold text-slate-600 block uppercase">Water (NDWI)</span>
                        <span className="font-extrabold text-sky-400">{analysisResult.environmental_indicators.ndwi.toFixed(3)}</span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[8px] font-bold text-slate-600 block uppercase">Elevation (DEM)</span>
                        <span className="font-extrabold text-slate-300">{analysisResult.environmental_indicators.dem} m</span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 col-span-2">
                        <span className="text-[8px] font-bold text-slate-600 block uppercase">Land Use (LULC)</span>
                        <span className="font-extrabold text-slate-300">{getLulcName(analysisResult.environmental_indicators.lulc)}</span>
                      </div>
                    </div>
                  </div>

                  {/* SHAP Feature Importance */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">SHAP Local Contributions</h3>
                      <span title="Positive SHAP values drive UHI hotspot prediction; negative ones reduce risk.">
                        <HelpCircle size={12} className="text-slate-600 cursor-help" />
                      </span>
                    </div>
                    <div className="h-40 w-full bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                           data={shapData}
                           layout="vertical"
                           margin={{ top: 2, right: 8, left: 16, bottom: 2 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis type="number" fontSize={7} stroke="#475569" tick={{ fill: '#475569' }} />
                          <YAxis dataKey="name" type="category" fontSize={7} stroke="#475569" width={32} tick={{ fill: '#475569' }} />
                          <Tooltip 
                            contentStyle={{ fontSize: '9px', backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
                            labelStyle={{ fontWeight: 'bold', color: '#94a3b8' }}
                          />
                          <ReferenceLine x={0} stroke="#334155" />
                          <Bar dataKey="value">
                            {shapData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.value > 0 ? '#e06c75' : '#a7cecd'} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Wind / Groundwater recharge summaries */}
                  <div className="space-y-2">
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wind style={{ color: '#a7cecd' }} size={14} />
                        <div>
                          <span className="text-[8px] font-bold text-slate-500 block uppercase">Wind Ventilation</span>
                          <span className="text-[10px] font-bold text-slate-200">{analysisResult.wind_corridor.ventilation_efficiency_pct}% Efficiency</span>
                        </div>
                      </div>
                      <span className="text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-lg bg-slate-800 border" style={{ color: '#a7cecd', borderColor: 'rgba(167, 206, 205, 0.3)' }}>
                        {analysisResult.wind_corridor.obstruction_status.split(' ')[0]}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Droplets className="text-sky-400" size={14} />
                        <div>
                          <span className="text-[8px] font-bold text-slate-500 block uppercase">Groundwater Recharge</span>
                          <span className="text-[10px] font-bold text-slate-200">{analysisResult.groundwater_recharge.recharge_suitability_score} Suitability</span>
                        </div>
                      </div>
                      <span className="text-[8px] font-extrabold text-sky-400 uppercase px-2 py-0.5 rounded-lg bg-sky-950/50 border border-sky-900/40">
                        {analysisResult.groundwater_recharge.recharge_category.split(' ')[0]}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PDF Export Customization Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-800/60 p-4 border-b border-slate-800 flex items-center gap-3">
              <div className="p-2 rounded-xl border" style={{ backgroundColor: 'rgba(167, 206, 205, 0.1)', borderColor: 'rgba(167, 206, 205, 0.2)' }}>
                <Download size={18} style={{ color: '#a7cecd' }} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-100">Customize Export Report</h3>
                <p className="text-[10px] text-slate-500 font-medium">Select components to bundle in your PDF</p>
              </div>
            </div>

            {/* Modal Body / Checklist */}
            <div className="p-5 space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 cursor-not-allowed opacity-70">
                <input type="checkbox" checked={true} disabled={true} className="mt-0.5 w-4 h-4 rounded" style={{ accentColor: '#a7cecd' }} />
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Baseline UHI Heat Index Analysis</span>
                  <span className="text-[10px] text-slate-500">Includes LST, NDVI, NDBI, NDWI, population density & SHAP insights</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-700 hover:bg-slate-800/40 cursor-pointer transition-all">
                <input type="checkbox" checked={includeWind} onChange={(e) => setIncludeWind(e.target.checked)} className="mt-0.5 w-4 h-4 rounded cursor-pointer" style={{ accentColor: '#a7cecd' }} />
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Wind Corridor (CFD) Analysis</span>
                  <span className="text-[10px] text-slate-500">Surface roughness, reference/street speeds, vent efficiency</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-700 hover:bg-slate-800/40 cursor-pointer transition-all">
                <input type="checkbox" checked={includeGroundwater} onChange={(e) => setIncludeGroundwater(e.target.checked)} className="mt-0.5 w-4 h-4 rounded cursor-pointer" style={{ accentColor: '#a7cecd' }} />
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Groundwater Recharge Suitability</span>
                  <span className="text-[10px] text-slate-500">Sealing/permeability indexes, slope %, site recommendations</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-700 hover:bg-slate-800/40 cursor-pointer transition-all">
                <input type="checkbox" checked={includeAquifer} onChange={(e) => setIncludeAquifer(e.target.checked)} className="mt-0.5 w-4 h-4 rounded cursor-pointer" style={{ accentColor: '#a7cecd' }} />
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Subterranean Aquifer Oracle Blueprint</span>
                  <span className="text-[10px] text-slate-500">Stratigraphy column tables & optimal drilling locations</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-700 hover:bg-slate-800/40 cursor-pointer transition-all">
                <input type="checkbox" checked={includeSocioThermal} onChange={(e) => setIncludeSocioThermal(e.target.checked)} className="mt-0.5 w-4 h-4 rounded cursor-pointer" style={{ accentColor: '#a7cecd' }} />
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Socio-Thermal & Slum-UHI Vulnerability Matrix</span>
                  <span className="text-[10px] text-slate-500">Roof materials SRI tables & epidemiological case studies</span>
                </div>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-800/40 p-4 border-t border-slate-800 flex justify-end gap-2.5">
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setIncludeWind(true);
                  setIncludeGroundwater(true);
                  setIncludeAquifer(true);
                  setIncludeSocioThermal(true);
                }}
                disabled={downloading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExportPDF}
                disabled={downloading}
                className="px-5 py-2 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: '#a7cecd' }}
              >
                {downloading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    Compiling...
                  </>
                ) : (
                  <>
                    <Download size={13} />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
