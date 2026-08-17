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
  optimal_shaft_depth_m: number;
  estimated_recharge_rate_m3_day: number;
  fracture_density: number;
  elevation_m: number;
}

interface AquiferPlan {
  id: number;
  name: string;
  district_name: string;
  grace_anomaly: number;
  avg_ndvi: number;
  avg_ndwi: number;
  target_recharge_vol: number;
  optimal_coordinates: RechargeSite[];
  created_by_username: string;
  created_by_email: string;
  created_at: string;
}

interface DistrictHotspot {
  name: string;
  latitude: number;
  longitude: number;
  dem: number;
  ndvi: number;
  ndwi: number;
  grace_anomaly: number;
  depletion_rate: string;
  severity: string;
}

export default function AquiferOracle() {
  const { token, user, setSelectedCoords, runAnalysis, fetchRecommendations } = useStore();
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

  const [hotspots, setHotspots] = useState<DistrictHotspot[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Ahmedabad');
  
  // Simulation Inputs
  const [lat, setLat] = useState<number>(23.0225);
  const [lng, setLng] = useState<number>(72.5714);
  const [dem, setDem] = useState<number>(55.0);
  const [graceAnomaly, setGraceAnomaly] = useState<number>(-22.5);
  const [ndvi, setNdvi] = useState<number>(0.15);
  const [ndwi, setNdwi] = useState<number>(0.08);
  const [targetVolume, setTargetVolume] = useState<number>(120000);
  const [autoSample, setAutoSample] = useState<boolean>(true);
  const [sampledFromSatellite, setSampledFromSatellite] = useState<boolean>(false);
  const [planName, setPlanName] = useState<string>('Ahmedabad Central Recharge Shaft');

  // Simulation Outputs
  const [simLayers, setSimLayers] = useState<GeologicalLayer[]>([]);
  const [simMetrics, setSimMetrics] = useState<SuitabilityMetrics | null>(null);
  const [simSites, setSimSites] = useState<RechargeSite[]>([]);

  // Saved Plans
  const [savedPlans, setSavedPlans] = useState<AquiferPlan[]>([]);

  // UI States
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const canSave = user?.profile?.role === 'ADMIN' || user?.profile?.role === 'PLANNER';

  // Load Seed Hotspots and Saved Plans
  useEffect(() => {
    if (!token) return;

    const loadHotspots = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/mitigation/aquifer/districts/hotspots/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setHotspots(data);
          // Auto-seed Ahmedabad details
          const ahm = data.find((h: DistrictHotspot) => h.name === 'Ahmedabad');
          if (ahm) seedDistrictData(ahm);
        }
      } catch (err) {
        console.error('Failed to load hotspots.', err);
      }
    };

    const loadPlans = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/mitigation/aquifer/plans/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSavedPlans(data);
        }
      } catch (err) {
        console.error('Failed to load plans.', err);
      }
    };

    loadHotspots();
    loadPlans();
  }, [token]);

  const seedDistrictData = (dist: DistrictHotspot) => {
    setSelectedDistrict(dist.name);
    setLat(dist.latitude);
    setLng(dist.longitude);
    setDem(dist.dem);
    setGraceAnomaly(dist.grace_anomaly);
    setNdvi(dist.ndvi);
    setNdwi(dist.ndwi);
    setSampledFromSatellite(false);
    setPlanName(`${dist.name} Subterranean Infiltration Project`);
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    const dist = hotspots.find(h => h.name === name);
    if (dist) seedDistrictData(dist);
  };

  const handleSimulate = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/mitigation/aquifer/simulate/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          district_name: selectedDistrict,
          latitude: lat,
          longitude: lng,
          grace_anomaly: graceAnomaly,
          ndvi,
          ndwi,
          dem,
          auto_sample: autoSample
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Simulation calculation failed.');

      setSimLayers(data.reconstructed_layers);
      setSimMetrics(data.suitability_metrics);
      setSimSites(data.optimal_recharge_sites);

      if (data.environmental_indicators) {
        setSampledFromSatellite(data.environmental_indicators.sampled_from_satellite);
        if (data.environmental_indicators.sampled_from_satellite) {
          setNdvi(data.environmental_indicators.ndvi);
          setNdwi(data.environmental_indicators.ndwi);
          setDem(data.environmental_indicators.dem);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async () => {
    if (!token || !simMetrics || simSites.length === 0) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/mitigation/aquifer/plans/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: planName,
          district_name: selectedDistrict,
          grace_anomaly: graceAnomaly,
          avg_ndvi: ndvi,
          avg_ndwi: ndwi,
          target_recharge_vol: targetVolume,
          optimal_coordinates: simSites
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));

      setSuccessMsg('Aquifer Recharge Plan successfully archived in decision system.');
      setSavedPlans(prev => [data, ...prev]);
    } catch (err: any) {
      setError('Failed to save plan. Make sure you possess Planner authorization.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadBlueprint = () => {
    if (simSites.length === 0) return;

    // Generate CSV contents
    const csvRows = [
      ['Rank', 'Latitude', 'Longitude', 'Suitability Score (%)', 'Optimal Shaft Depth (meters)', 'Est. Recharge Rate (m3/day)', 'Fracture Density Index', 'Elevation (m)'],
      ...simSites.map((s, index) => [
        index + 1,
        s.latitude,
        s.longitude,
        s.suitability_score,
        s.optimal_shaft_depth_m,
        s.estimated_recharge_rate_m3_day,
        s.fracture_density,
        s.elevation_m
      ])
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + csvRows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Aquifer_Oracle_Blueprint_${selectedDistrict.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Recharts Stacked Geological Data Formatter
  const getChartData = () => {
    if (simLayers.length === 0) return [];
    return [
      {
        name: 'Stratigraphic Column',
        'Topsoil / Clay': simLayers[0].thickness,
        'Sand & Gravel': simLayers[1].thickness,
        'Fractured Basalt': simLayers[2].thickness,
        'Impermeable Bedrock': simLayers[3].thickness
      }
    ];
  };

  // Suitability gauge circular parameters
  const score = simMetrics?.suitability_score || 0;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="p-6 md:p-8 space-y-6 min-h-full text-slate-100">
      {/* Header Banner — icon removed from title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Subterranean Aquifer Recharge Oracle
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Combines GRACE satellite gravity anomaly signals with topography data (DEM) and moisture indexes (NDVI/NDWI) to construct sub-surface geological twins and locate deep-rock fractures.
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Water Table Crisis</span>
          <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase bg-rose-50 text-rose-600 border border-rose-100 rounded-lg mt-1 inline-block">
            Critical Deficit Alert
          </span>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Panel: Inputs (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-5">
          <h2 className="text-sm font-extrabold text-slate-800 tracking-tight border-b border-slate-100 pb-3">
            Parameter Controls
          </h2>

          <div className="space-y-4">
            {/* Target Hotspot Select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Deficit District</label>
              <select
                value={selectedDistrict}
                onChange={handleDistrictChange}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold p-2.5 rounded-xl text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                {hotspots.map(h => (
                  <option key={h.name} value={h.name}>
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
                  className="bg-slate-50 border border-slate-200 text-xs font-bold p-2.5 rounded-xl text-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Longitude</label>
                <input
                  type="number"
                  value={lng}
                  onChange={(e) => setLng(parseFloat(e.target.value))}
                  className="bg-slate-50 border border-slate-200 text-xs font-bold p-2.5 rounded-xl text-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Auto-Sample Toggle */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/50 rounded-xl">
              <div className="flex flex-col">
                <span className="text-[10px] font-extrabold text-slate-700 uppercase">Auto-Sample Satellite Datasets</span>
                <span className="text-[8px] text-slate-400">Pulls live indexes if within Ahmedabad bounds</span>
              </div>
              <input
                type="checkbox"
                checked={autoSample}
                onChange={(e) => setAutoSample(e.target.checked)}
                className="w-4 h-4 text-emerald-600 border-slate-200 rounded focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
              />
            </div>

            {/* Elevation DEM */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Base Elevation (DEM)</span>
                {autoSample && sampledFromSatellite && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wider">Satellite Feed</span>
                )}
              </div>
              <input
                type="number"
                value={dem}
                disabled={autoSample}
                onChange={(e) => setDem(parseFloat(e.target.value))}
                className={`bg-slate-50 border border-slate-200 text-xs font-bold p-2.5 rounded-xl text-slate-700 focus:outline-none ${autoSample ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>

            {/* Anomaly Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>GRACE Gravity Anomaly</span>
                <span className="font-mono text-emerald-600">{graceAnomaly.toFixed(1)} mGal</span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="0.5"
                value={graceAnomaly}
                onChange={(e) => setGraceAnomaly(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
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
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wider">Satellite Feed</span>
                  )}
                  <span className="font-mono text-emerald-600">{ndvi.toFixed(2)}</span>
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
                className={`w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600 ${autoSample ? 'opacity-65 cursor-not-allowed' : ''}`}
              />
            </div>

            {/* NDWI Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Soil Moisture Index (NDWI)</span>
                <div className="flex items-center gap-1.5">
                  {autoSample && sampledFromSatellite && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wider">Satellite Feed</span>
                  )}
                  <span className="font-mono text-emerald-600">{ndwi.toFixed(2)}</span>
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
                className={`w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600 ${autoSample ? 'opacity-65 cursor-not-allowed' : ''}`}
              />
            </div>

            {/* Target Vol */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Infiltration Capacity (m³)</label>
              <input
                type="number"
                value={targetVolume}
                onChange={(e) => setTargetVolume(parseInt(e.target.value) || 0)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold p-2.5 rounded-xl text-slate-700 focus:outline-none"
              />
            </div>

            {/* Simulate Trigger — icon removed, text only */}
            <button
              onClick={handleSimulate}
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-slate-900 hover:text-emerald-400 border border-transparent hover:border-emerald-500 disabled:bg-emerald-400 text-white font-bold text-xs rounded-xl shadow-md transition-all duration-200 ease-in-out cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Calculating Seepage Math...
                </>
              ) : (
                'Simulate Subterranean Twin'
              )}
            </button>
          </div>
        </div>

        {/* Center Panel: Geological stacked chart & circular suitability gauge (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Suitability Gauge Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hydraulic Indicator</span>
              <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Recharge Suitability Score</h3>
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
                  className="text-slate-100 stroke-current"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  className={`${
                    score > 75 ? 'text-emerald-500' : score > 50 ? 'text-orange-400' : 'text-rose-500'
                  } stroke-current transition-all duration-1000`}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-lg font-black text-slate-800">{score.toFixed(1)}%</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Suitability</span>
              </div>
            </div>
          </div>

          {/* Geological Stratigraphy Twin — icon removed */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex-1 flex flex-col space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 tracking-tight border-b border-slate-100 pb-3">
              Sub-surface Geological Twin
            </h3>

            {simLayers.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50 border border-dashed border-slate-100 rounded-xl">
                <Layers size={32} className="text-slate-400 mb-2" />
                <p className="text-xs font-bold text-slate-500">Awaiting Simulation Data</p>
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
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={false} />
                      <YAxis domain={[0, 'dataMax + 20']} fontSize={8} width={25} />
                      <Tooltip
                        contentStyle={{ fontSize: '9px', borderRadius: '6px' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: '8px' }} />
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
                    <div key={idx} className="p-2 border border-slate-200/60 rounded-xl bg-slate-50/50 relative">
                      <div className="flex justify-between items-center font-bold">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                          {l.name}
                        </span>
                        <span className="text-slate-500 font-mono">{l.thickness}m thick</span>
                      </div>
                      <p className="text-slate-500 mt-1 leading-normal">{l.description}</p>
                      <p className="text-[9px] text-emerald-700 font-bold mt-0.5">
                        Depth: {l.depth_from}m - {l.depth_to}m
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Tabular GPS Target site results (3 cols) — icon removed */}
        <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col space-y-4">
          <h3 className="text-sm font-extrabold text-slate-800 tracking-tight border-b border-slate-100 pb-3">
            Fracture Target Coordinates
          </h3>

          {simSites.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-slate-50 border border-dashed border-slate-100 rounded-xl">
              <HelpCircle size={28} className="text-slate-400 mb-2" />
              <p className="text-xs font-bold text-slate-500">Run calculations to discover recharge spots</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-4">
              <div className="flex-1 space-y-2">
                {simSites.map((s, index) => (
                  <div key={index} className="p-2.5 border border-slate-200/80 rounded-xl hover:bg-slate-50 transition-colors text-[10px]">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-slate-900">Site #{index + 1} ({s.suitability_score}% Match)</span>
                      <span className="text-emerald-700">{s.estimated_recharge_rate_m3_day} m³/day</span>
                    </div>
                    <p 
                      onClick={() => handleCoordinateClick(s.latitude, s.longitude)}
                      className="font-mono text-emerald-600 hover:underline cursor-pointer mt-1 font-bold inline-block"
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
                className="w-full py-2 bg-slate-100 hover:bg-slate-900 hover:text-slate-100 border border-slate-200 hover:border-slate-700 font-bold text-xs rounded-xl transition-all duration-200 ease-in-out cursor-pointer flex items-center justify-center gap-2"
              >
                <Download size={14} />
                Download CSV Blueprint
              </button>

              {/* Planner Plan Saver Form */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <input
                  type="text"
                  placeholder="Enter Plan Name"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold p-2.5 rounded-xl text-slate-700 focus:outline-none"
                />
                
                {canSave ? (
                  <button
                    onClick={handleSavePlan}
                    disabled={saving}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-slate-900 hover:text-emerald-400 border border-transparent hover:border-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all duration-200 ease-in-out cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Save size={14} />
                    {saving ? 'Archiving...' : 'Archive Recharge Plan'}
                  </button>
                ) : (
                  <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-[10px] text-rose-600 leading-normal flex items-start gap-1.5">
                    <ShieldAlert size={14} className="flex-shrink-0 mt-0.5" />
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
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-xs text-emerald-800">
          <CheckCircle className="text-emerald-500 flex-shrink-0" size={18} />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-xs text-rose-800">
          <AlertTriangle className="text-rose-500 flex-shrink-0" size={18} />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Archived Subterranean Recharge Blueprints — icon removed */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-slate-800 tracking-tight border-b border-slate-100 pb-3">
          Archived Subterranean Recharge Blueprints
        </h3>

        {savedPlans.length === 0 ? (
          <p className="text-xs text-slate-400 italic p-2">No archived blueprints found in this decision model.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
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
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {savedPlans.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-bold text-slate-900">{p.name}</td>
                    <td className="py-3 px-3">{p.district_name}</td>
                    <td className="py-3 px-3 font-mono">{p.grace_anomaly.toFixed(1)} mGal</td>
                    <td className="py-3 px-3 font-mono">{p.avg_ndwi.toFixed(2)}</td>
                    <td className="py-3 px-3 font-mono">{p.target_recharge_vol.toLocaleString()} m³</td>
                    <td className="py-3 px-3 font-mono">
                      {p.optimal_coordinates && p.optimal_coordinates[0] ? (
                        <span
                          onClick={() => handleCoordinateClick(p.optimal_coordinates[0].latitude, p.optimal_coordinates[0].longitude)}
                          className="text-emerald-600 hover:underline cursor-pointer font-bold"
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
