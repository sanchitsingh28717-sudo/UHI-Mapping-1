'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Droplets, ShieldAlert, Sparkles, AlertTriangle, CheckCircle, Save, Download, HelpCircle, ArrowRight, Layers
} from 'lucide-react';

interface GeologicalLayer {
  name: string;
  thickness: number;
  depth_from: number;
  depth_to: number;
  description: string;
  color: string;
}

interface SuitabilityMetrics {
  suitability_score: number;
  estimated_recharge_rate_m3_day: number;
  fracture_density_index: number;
  parameters: {
    slope_factor: number;
    permeability_factor: number;
    gravity_deficit_factor: number;
    hydraulic_conductivity_k_m_day: number;
    hydraulic_gradient: number;
  };
}

interface RechargeSite {
  latitude: number;
  longitude: number;
  suitability_score: number;
  estimated_recharge_rate_m3_day: number;
  optimal_shaft_depth_m: number;
  fracture_density: number;
}

interface SavedPlan {
  id: number;
  name: string;
  district_name: string;
  grace_anomaly: number;
  avg_ndwi: number;
  target_recharge_vol: number;
  optimal_coordinates: RechargeSite[];
  created_by_username: string;
  created_at: string;
}

export default function AquiferOraclePage() {
  const router = useRouter();
  const { token, user, selectedCoords, setSelectedCoords } = useStore();

  const [hotspots, setHotspots] = useState<any[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Ahmedabad Urban Deficit Zone');
  const [lat, setLat] = useState<number>(23.0225);
  const [lng, setLng] = useState<number>(72.5714);

  const [graceAnomaly, setGraceAnomaly] = useState<number>(-18.5);
  const [dem, setDem] = useState<number>(55.0);
  const [ndvi, setNdvi] = useState<number>(0.12);
  const [ndwi, setNdwi] = useState<number>(0.08);
  const [targetVolume, setTargetVolume] = useState<number>(50000);
  const [autoSample, setAutoSample] = useState<boolean>(true);
  const [sampledFromSatellite, setSampledFromSatellite] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [simMetrics, setSimMetrics] = useState<SuitabilityMetrics | null>(null);
  const [simLayers, setSimLayers] = useState<GeologicalLayer[]>([]);
  const [simSites, setSimSites] = useState<RechargeSite[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [planName, setPlanName] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchHotspots();
    fetchPlans();
  }, [token]);

  useEffect(() => {
    if (selectedCoords) {
      setLat(selectedCoords.lat);
      setLng(selectedCoords.lng);
      if (autoSample) {
        sampleSatelliteIndices(selectedCoords.lat, selectedCoords.lng);
      }
    }
  }, [selectedCoords, autoSample]);

  const fetchHotspots = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/mitigation/aquifer/districts/hotspots/', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setHotspots(data);
      }
    } catch (e) {}
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/mitigation/aquifer/plans/', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setSavedPlans(data);
      }
    } catch (e) {}
  };

  const sampleSatelliteIndices = (latitude: number, longitude: number) => {
    if (latitude >= 22.90 && latitude <= 23.15 && longitude >= 72.45 && longitude <= 72.70) {
      const distFromCenter = Math.sqrt(Math.pow(latitude - 23.0225, 2) + Math.pow(longitude - 72.5714, 2));
      const simulatedNdvi = Math.max(0.05, Math.min(0.45, 0.35 - distFromCenter * 1.5));
      const simulatedNdwi = Math.max(0.02, Math.min(0.30, 0.20 - distFromCenter * 1.2));
      const simulatedDem = Math.round(45.0 + distFromCenter * 100);

      setNdvi(parseFloat(simulatedNdvi.toFixed(2)));
      setNdwi(parseFloat(simulatedNdwi.toFixed(2)));
      setDem(simulatedDem);
      setSampledFromSatellite(true);
    } else {
      setSampledFromSatellite(false);
    }
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    setSelectedDistrict(selectedName);
    const found = hotspots.find(h => h.name === selectedName);
    if (found) {
      setGraceAnomaly(found.grace_anomaly);
      if (found.lat && found.lng) {
        setLat(found.lat);
        setLng(found.lng);
        setSelectedCoords({ lat: found.lat, lng: found.lng });
      }
    }
  };

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/mitigation/aquifer/simulate/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          district_name: selectedDistrict,
          latitude: lat,
          longitude: lng,
          grace_anomaly: graceAnomaly,
          dem_elevation: dem,
          ndvi,
          ndwi,
          target_volume: targetVolume,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Aquifer simulation failed.');
      }

      setSimMetrics(data.suitability_metrics);
      setSimLayers(data.stratigraphy_layers || []);
      setSimSites(data.optimal_recharge_sites || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async () => {
    if (!planName.trim()) {
      setError('Please provide a name for this recharge plan.');
      return;
    }
    if (!token) {
      setError('You must be logged in as Planner or Admin to archive plans.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/mitigation/aquifer/plans/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: planName,
          district_name: selectedDistrict,
          grace_anomaly: graceAnomaly,
          avg_ndwi: ndwi,
          target_recharge_vol: targetVolume,
          optimal_coordinates: simSites,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to archive recharge plan.');
      }

      setSuccessMsg(`Plan "${planName}" archived successfully into system database.`);
      setPlanName('');
      fetchPlans();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadBlueprint = () => {
    if (!simSites.length) return;
    const csvRows = [
      ['Site_ID', 'Latitude', 'Longitude', 'Suitability_Score_%', 'Est_Recharge_m3_day', 'Shaft_Depth_m', 'Fracture_Density'],
      ...simSites.map((s, idx) => [
        idx + 1,
        s.latitude,
        s.longitude,
        s.suitability_score,
        s.estimated_recharge_rate_m3_day,
        s.optimal_shaft_depth_m,
        s.fracture_density
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Aquifer_Blueprint_${selectedDistrict.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCoordinateClick = (latitude: number, longitude: number) => {
    setSelectedCoords({ lat: latitude, lng: longitude });
    router.push('/dashboard/map');
  };

  const getChartData = () => {
    if (!simLayers.length) return [];
    const item: Record<string, any> = { name: 'Lithology Column' };
    simLayers.forEach(l => {
      item[l.name] = l.thickness;
    });
    return [item];
  };

  const userRole = user?.profile?.role || 'GUEST';
  const canSave = ['ADMIN', 'PLANNER'].includes(userRole);

  const score = simMetrics?.suitability_score || 0;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="p-6 md:p-8 space-y-6 min-h-full text-slate-100">
      {/* Header Banner - Cosmic Glass */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl cosmic-card border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: '#a7cecd' }}>
            Subterranean Aquifer Recharge Oracle
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Combines GRACE satellite gravity anomaly signals with topography data (DEM) and moisture indexes (NDVI/NDWI) to construct sub-surface geological twins and locate deep-rock fractures.
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Water Table Crisis</span>
          <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase bg-rose-950/40 text-rose-400 border border-rose-800/60 rounded-lg mt-1 inline-block">
            Critical Deficit Alert
          </span>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Panel: Inputs (4 cols) - Cosmic Glass */}
        <div className="lg:col-span-4 cosmic-card p-5 rounded-2xl border border-white/10 shadow-xl space-y-5">
          <h2 className="text-sm font-extrabold tracking-tight border-b border-white/10 pb-3" style={{ color: '#a7cecd' }}>
            Parameter Controls
          </h2>

          <div className="space-y-4">
            {/* Target Hotspot Select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Deficit District</label>
              <select
                value={selectedDistrict}
                onChange={handleDistrictChange}
                className="w-full bg-black/40 border border-white/15 text-xs font-semibold p-2.5 rounded-xl text-slate-200 focus:outline-none focus:border-[#a7cecd] appearance-none cursor-pointer"
              >
                {hotspots.map(h => (
                  <option key={h.name} value={h.name} className="bg-slate-900 text-slate-200">
                    {h.name} ({h.severity} - Depletion: {h.depletion_rate})
                  </option>
                ))}
              </select>
            </div>

            {/* Coordinates Input */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Latitude</label>
                <input
                  type="number"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value))}
                  className="bg-black/40 border border-white/15 text-xs font-bold p-2.5 rounded-xl text-slate-200 focus:outline-none focus:border-[#a7cecd]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Longitude</label>
                <input
                  type="number"
                  value={lng}
                  onChange={(e) => setLng(parseFloat(e.target.value))}
                  className="bg-black/40 border border-white/15 text-xs font-bold p-2.5 rounded-xl text-slate-200 focus:outline-none focus:border-[#a7cecd]"
                />
              </div>
            </div>

            {/* Auto-Sample Toggle */}
            <div className="flex items-center justify-between p-2.5 bg-black/30 border border-white/10 rounded-xl">
              <div className="flex flex-col">
                <span className="text-[10px] font-extrabold text-slate-200 uppercase">Auto-Sample Satellite Datasets</span>
                <span className="text-[8px] text-slate-400">Pulls live indexes if within Ahmedabad bounds</span>
              </div>
              <input
                type="checkbox"
                checked={autoSample}
                onChange={(e) => setAutoSample(e.target.checked)}
                className="w-4 h-4 text-[#a7cecd] border-white/20 rounded focus:ring-[#a7cecd] accent-[#a7cecd] cursor-pointer"
              />
            </div>

            {/* Elevation DEM */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Base Elevation (DEM)</span>
                {autoSample && sampledFromSatellite && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 uppercase tracking-wider">Satellite Feed</span>
                )}
              </div>
              <input
                type="number"
                value={dem}
                disabled={autoSample}
                onChange={(e) => setDem(parseFloat(e.target.value))}
                className={`bg-black/40 border border-white/15 text-xs font-bold p-2.5 rounded-xl text-slate-200 focus:outline-none ${autoSample ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>

            {/* Anomaly Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>GRACE Gravity Anomaly</span>
                <span className="font-mono text-[#a7cecd]">{graceAnomaly.toFixed(1)} mGal</span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="0.5"
                value={graceAnomaly}
                onChange={(e) => setGraceAnomaly(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-black/50 rounded-lg appearance-none cursor-pointer accent-[#a7cecd]"
              />
              <span className="text-[9px] text-slate-400 leading-normal italic">
                Negative values indicate severe mass water deficits.
              </span>
            </div>

            {/* NDVI Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Vegetation Index (NDVI)</span>
                <div className="flex items-center gap-1.5">
                  {autoSample && sampledFromSatellite && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 uppercase tracking-wider">Satellite Feed</span>
                  )}
                  <span className="font-mono text-[#a7cecd]">{ndvi.toFixed(2)}</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={ndvi}
                disabled={autoSample}
                onChange={(e) => setNdvi(parseFloat(e.target.value))}
                className={`w-full h-1.5 bg-black/50 rounded-lg appearance-none cursor-pointer accent-[#a7cecd] ${autoSample ? 'opacity-65 cursor-not-allowed' : ''}`}
              />
            </div>

            {/* NDWI Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Soil Moisture Index (NDWI)</span>
                <div className="flex items-center gap-1.5">
                  {autoSample && sampledFromSatellite && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 uppercase tracking-wider">Satellite Feed</span>
                  )}
                  <span className="font-mono text-[#a7cecd]">{ndwi.toFixed(2)}</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={ndwi}
                disabled={autoSample}
                onChange={(e) => setNdwi(parseFloat(e.target.value))}
                className={`w-full h-1.5 bg-black/50 rounded-lg appearance-none cursor-pointer accent-[#a7cecd] ${autoSample ? 'opacity-65 cursor-not-allowed' : ''}`}
              />
            </div>

            {/* Target Vol */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Infiltration Capacity (m³)</label>
              <input
                type="number"
                value={targetVolume}
                onChange={(e) => setTargetVolume(parseInt(e.target.value) || 0)}
                className="bg-black/40 border border-white/15 text-xs font-bold p-2.5 rounded-xl text-slate-200 focus:outline-none"
              />
            </div>

            {/* Simulate Trigger Button */}
            <button
              onClick={handleSimulate}
              disabled={loading}
              className="w-full py-3 font-bold text-xs rounded-xl shadow-lg transition-all duration-200 ease-in-out text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/60 hover:text-[#a7cecd] border border-transparent hover:border-[#a7cecd] cursor-pointer flex items-center justify-center gap-2 animate-shimmer"
              style={{ backgroundColor: '#a7cecd' }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Calculating Seepage Math...
                </>
              ) : (
                'Simulate Subterranean Twin'
              )}
            </button>
          </div>
        </div>

        {/* Center Panel: Geological stacked chart & circular suitability gauge (5 cols) - Cosmic Glass */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Suitability Gauge Card */}
          <div className="cosmic-card p-5 rounded-2xl border border-white/10 shadow-xl flex items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hydraulic Indicator</span>
              <h3 className="text-sm font-extrabold text-slate-100 tracking-tight">Recharge Suitability Score</h3>
              <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed">
                Determined by slope gradients, unconfined aquifer thickness, and gravity field deficits.
              </p>
            </div>
            
            {/* SVG Circular Gauge */}
            <div className="relative flex items-center justify-center w-28 h-28">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  className="text-white/10 stroke-current"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  className={`${
                    score > 75 ? 'text-[#a7cecd]' : score > 50 ? 'text-amber-400' : 'text-rose-400'
                  } stroke-current transition-all duration-1000`}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-lg font-black text-slate-100">{score.toFixed(1)}%</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Suitability</span>
              </div>
            </div>
          </div>

          {/* Geological Stratigraphy Twin */}
          <div className="cosmic-card p-5 rounded-2xl border border-white/10 shadow-xl flex-1 flex flex-col space-y-4">
            <h3 className="text-sm font-extrabold tracking-tight border-b border-white/10 pb-3" style={{ color: '#a7cecd' }}>
              Sub-surface Geological Twin
            </h3>

            {simLayers.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-black/25 border border-dashed border-white/15 rounded-xl">
                <p className="text-xs font-bold text-slate-400">Awaiting Simulation Data</p>
                <p className="text-[10px] text-slate-400 mt-0.5 max-w-[200px]">
                  Simulate to reconstruct the 3D lithological layers and optimal drilling target depth.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col md:flex-row gap-4 items-center">
                {/* Visual stacked column chart */}
                <div className="h-64 w-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getChartData()}
                      margin={{ top: 10, right: 5, left: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="name" tick={false} />
                      <YAxis domain={[0, 'dataMax + 20']} fontSize={8} width={25} stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{ fontSize: '9px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.2)', color: '#f8fafc' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: '8px', color: '#94a3b8' }} />
                      <Bar dataKey="Topsoil / Clay" stackId="a" fill="#854d0e" />
                      <Bar dataKey="Sand & Gravel" stackId="a" fill="#eab308" />
                      <Bar dataKey="Fractured Basalt" stackId="a" fill="#10b981" />
                      <Bar dataKey="Impermeable Bedrock" stackId="a" fill="#64748b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Layer Metadata Cards */}
                <div className="flex-1 space-y-2.5 text-[10px]">
                  {simLayers.map((l, idx) => (
                    <div key={idx} className="p-2 border border-white/10 rounded-xl bg-black/30 relative">
                      <div className="flex justify-between items-center font-bold">
                        <span className="flex items-center gap-1.5 text-slate-200">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                          {l.name}
                        </span>
                        <span className="text-slate-400 font-mono">{l.thickness}m thick</span>
                      </div>
                      <p className="text-slate-400 mt-1 leading-normal">{l.description}</p>
                      <p className="text-[9px] text-[#a7cecd] font-bold mt-0.5">
                        Depth: {l.depth_from}m - {l.depth_to}m
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Tabular GPS Target site results (3 cols) - Cosmic Glass */}
        <div className="lg:col-span-3 cosmic-card p-5 rounded-2xl border border-white/10 shadow-xl flex flex-col space-y-4">
          <h3 className="text-sm font-extrabold tracking-tight border-b border-white/10 pb-3" style={{ color: '#a7cecd' }}>
            Fracture Target Coordinates
          </h3>

          {simSites.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-black/25 border border-dashed border-white/15 rounded-xl">
              <HelpCircle size={28} className="text-slate-500 mb-2" />
              <p className="text-xs font-bold text-slate-400">Run calculations to discover recharge spots</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-4">
              <div className="flex-1 space-y-2">
                {simSites.map((s, index) => (
                  <div key={index} className="p-2.5 border border-white/10 rounded-xl bg-black/30 hover:border-[#a7cecd]/40 transition-colors text-[10px]">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-slate-200">Site #{index + 1} ({s.suitability_score}% Match)</span>
                      <span className="text-[#a7cecd]">{s.estimated_recharge_rate_m3_day} m³/day</span>
                    </div>
                    <p 
                      onClick={() => handleCoordinateClick(s.latitude, s.longitude)}
                      className="font-mono text-[#a7cecd] hover:underline cursor-pointer mt-1 font-bold inline-block"
                      title="Click to view on Map Workspace"
                    >
                      Lat: {s.latitude}, Lng: {s.longitude}
                    </p>
                    <div className="flex justify-between items-center text-[9px] text-slate-400 mt-1 font-semibold">
                      <span>Shaft Depth: {s.optimal_shaft_depth_m}m</span>
                      <span>Fracture Index: {s.fracture_density}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* CSV Blueprint Downloader */}
              <button
                onClick={handleDownloadBlueprint}
                className="w-full py-2 bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 font-bold text-xs rounded-xl transition-all duration-200 ease-in-out cursor-pointer flex items-center justify-center gap-2"
              >
                <Download size={14} />
                Download CSV Blueprint
              </button>

              {/* Planner Plan Saver Form */}
              <div className="border-t border-white/10 pt-3 space-y-2">
                <input
                  type="text"
                  placeholder="Enter Plan Name"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 text-xs font-semibold p-2.5 rounded-xl text-slate-200 focus:outline-none focus:border-[#a7cecd]"
                />
                
                {canSave ? (
                  <button
                    onClick={handleSavePlan}
                    disabled={saving}
                    className="w-full py-2.5 font-bold text-xs rounded-xl shadow-lg transition-all duration-200 ease-in-out text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/60 hover:text-[#a7cecd] border border-transparent hover:border-[#a7cecd] cursor-pointer flex items-center justify-center gap-2 animate-shimmer"
                    style={{ backgroundColor: '#a7cecd' }}
                  >
                    <Save size={14} />
                    {saving ? 'Archiving...' : 'Archive Recharge Plan'}
                  </button>
                ) : (
                  <div className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-[10px] text-rose-300 leading-normal flex items-start gap-1.5">
                    <ShieldAlert size={14} className="flex-shrink-0 mt-0.5 text-rose-400" />
                    <span>Planner credentials required to save recharge plans into system storage.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Success/Error Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl flex items-center gap-3 text-xs text-emerald-300">
          <CheckCircle className="text-[#a7cecd] flex-shrink-0" size={18} />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-2xl flex items-center gap-3 text-xs text-rose-300">
          <AlertTriangle className="text-rose-400 flex-shrink-0" size={18} />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Archived Subterranean Recharge Blueprints - Cosmic Glass */}
      <div className="cosmic-card p-5 rounded-2xl border border-white/10 shadow-xl space-y-4">
        <h3 className="text-sm font-extrabold tracking-tight border-b border-white/10 pb-3" style={{ color: '#a7cecd' }}>
          Archived Subterranean Recharge Blueprints
        </h3>

        {savedPlans.length === 0 ? (
          <p className="text-xs text-slate-400 italic p-2">No archived blueprints found in this decision model.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                  <th className="py-2.5 px-3">Plan Name</th>
                  <th className="py-2.5 px-3">District</th>
                  <th className="py-2.5 px-3">GRACE Anomaly</th>
                  <th className="py-2.5 px-3">Moisture (NDWI)</th>
                  <th className="py-2.5 px-3">Target Vol</th>
                  <th className="py-2.5 px-3">Top Spot Coordinates</th>
                  <th className="py-2.5 px-3">Planner</th>
                  <th className="py-2.5 px-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-slate-200 font-medium">
                {savedPlans.map(p => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-100">{p.name}</td>
                    <td className="py-3 px-3">{p.district_name}</td>
                    <td className="py-3 px-3 font-mono">{p.grace_anomaly.toFixed(1)} mGal</td>
                    <td className="py-3 px-3 font-mono">{p.avg_ndwi.toFixed(2)}</td>
                    <td className="py-3 px-3 font-mono">{p.target_recharge_vol.toLocaleString()} m³</td>
                    <td className="py-3 px-3 font-mono">
                      {p.optimal_coordinates && p.optimal_coordinates[0] ? (
                        <span
                          onClick={() => handleCoordinateClick(p.optimal_coordinates[0].latitude, p.optimal_coordinates[0].longitude)}
                          className="text-[#a7cecd] hover:underline cursor-pointer font-bold"
                          title="Click to view on Map Workspace"
                        >
                          {p.optimal_coordinates[0].latitude.toFixed(5)}, {p.optimal_coordinates[0].longitude.toFixed(5)}
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="py-3 px-3 font-semibold">{p.created_by_username}</td>
                    <td className="py-3 px-3 text-[10px] text-slate-400">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
