'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle, Polyline, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '@/store/useStore';

// Overriding default Leaflet icon paths using unpkg CDN
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapClickHandlerProps {
  onMapClick: (lat: number, lng: number) => void;
}

function MapClickHandler({ onMapClick }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface HeatPoint {
  latitude: number;
  longitude: number;
  lst: number;
  heat_zone: string;
}

const cityCenters: Record<string, [number, number]> = {
  Ahmedabad: [23.0225, 72.5714],
  Gandhinagar: [23.2156, 72.6369],
  Delhi: [28.6139, 77.2090],
  Mumbai_City: [18.9690, 72.8258],
  Mumbai_Suburban: [19.1136, 72.8697],
  Thane: [19.2183, 72.9781],
  Mumbai_Metro: [19.0760, 72.8777]
};

const cityZooms: Record<string, number> = {
  Ahmedabad: 11.5,
  Gandhinagar: 12,
  Delhi: 10.5,
  Mumbai_City: 12,
  Mumbai_Suburban: 11.5,
  Thane: 12,
  Mumbai_Metro: 9.5
};

// Custom hook to set map center and zoom dynamically
function ChangeMapCenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

// Custom hook to force Leaflet to recalculate container bounds on resize / panel collapse
function MapResizeHandler({ panelCollapsed }: { panelCollapsed?: boolean }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const handleResize = () => {
      map.invalidateSize({ animate: true });
    };
    window.addEventListener('resize', handleResize);
    const t1 = setTimeout(handleResize, 100);
    const t2 = setTimeout(handleResize, 350);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map, panelCollapsed]);
  return null;
}

interface MapComponentProps {
  panelCollapsed?: boolean;
}

export default function MapComponent({ panelCollapsed }: MapComponentProps) {
  const { selectedCoords, setSelectedCoords, analysisResult, token, setHoveredWard, activeCity } = useStore();
  const [mapType, setMapType] = useState<'osm' | 'satellite' | 'terrain'>('satellite');
  const [heatPoints, setHeatPoints] = useState<HeatPoint[]>([]);
  const [wardsData, setWardsData] = useState<any>(null);
  const [boundaryData, setBoundaryData] = useState<any>(null);
  const [showWards, setShowWards] = useState(true);
  const [showHeatPoints, setShowHeatPoints] = useState(true);
  const [vulnerabilitySlider, setVulnerabilitySlider] = useState(0);

  const alpha = vulnerabilitySlider / 100;

  // Fetch heat zone grid, wards, and administrative boundary in parallel for optimal speed
  useEffect(() => {
    if (!token) return;

    const fetchAllData = async () => {
      try {
        const [heatRes, wardsRes, boundaryRes] = await Promise.all([
          fetch(`http://127.0.0.1:8000/api/maps/heat-zones/?city=${activeCity}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`http://127.0.0.1:8000/api/maps/wards/?city=${activeCity}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`http://127.0.0.1:8000/api/maps/boundary/?city=${activeCity}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (heatRes.ok) {
          const data = await heatRes.json();
          setHeatPoints(data);
        }
        if (wardsRes.ok) {
          const data = await wardsRes.json();
          setWardsData(data);
        }
        if (boundaryRes.ok) {
          const data = await boundaryRes.json();
          setBoundaryData(data);
        }
      } catch (err) {
        console.error('Failed to load map spatial datasets.', err);
      }
    };

    fetchAllData();
  }, [token, activeCity]);

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedCoords({ lat, lng });
  };

  const layers = {
    osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    terrain: 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}'
  };

  const getHeatColor = (zone: string) => {
    // Muted, semi-transparent palette — visible but not harsh
    if (zone === 'High Heat Zone') return '#d4737a';   // Dusty rose
    if (zone === 'Medium Heat Zone') return '#c9a84c'; // Muted amber
    return '#7ab5b4'; // Muted teal
  };

  // Color code wards based on vulnerability classification
  const getWardStyle = useCallback((feature: any) => {
    const vuln = feature.properties.vulnerability;
    let fillColor = '#a7cecd';
    let strokeColor = 'rgba(167, 206, 205, 0.75)';

    if (alpha === 0) {
      // UHI Risk colour-coding: crisp, distinct fills
      if (vuln === 'Very High Risk')  { fillColor = '#e06c75'; strokeColor = 'rgba(224,108,117,0.9)'; }
      else if (vuln === 'High Risk')  { fillColor = '#e5a550'; strokeColor = 'rgba(229,165,80,0.85)'; }
      else if (vuln === 'Medium Risk'){ fillColor = '#e5c07b'; strokeColor = 'rgba(229,192,123,0.8)'; }
      else                            { fillColor = '#a7cecd'; strokeColor = 'rgba(167,206,205,0.7)'; }
    } else {
      // Demographic vulnerability — sharp purple gradient
      if (vuln === 'Very High Risk')  { fillColor = '#9b59b6'; strokeColor = 'rgba(155,89,182,0.95)'; }
      else if (vuln === 'High Risk')  { fillColor = '#a76fc8'; strokeColor = 'rgba(167,111,200,0.9)'; }
      else if (vuln === 'Medium Risk'){ fillColor = '#c39bd3'; strokeColor = 'rgba(195,155,211,0.85)'; }
      else                            { fillColor = '#d7bde2'; strokeColor = 'rgba(215,189,226,0.75)'; }
    }

    return {
      color: strokeColor,
      fillColor: fillColor,
      fillOpacity: alpha === 0 ? 0.20 : 0.55 * alpha,
      opacity: alpha === 0 ? 0.85 : 0.95,
      weight: alpha === 0 ? 1.5 : 2,
      dashArray: undefined
    };
  }, [alpha]);

  const onEachWardFeature = useCallback((feature: any, layer: any) => {
    const props = feature.properties;
    
    // Bind detailed tooltip for on-hover metadata
    layer.bindTooltip(
      `<div class="p-2.5 space-y-1 font-sans text-slate-100 text-xs leading-normal">
        <p class="font-extrabold border-b border-slate-700 pb-1 mb-1" style="color: #a7cecd">${props.name} Ward</p>
        <p><strong class="text-slate-400">Zone:</strong> ${props.zone}</p>
        <p><strong class="text-slate-400">Avg LST:</strong> ${props.lst_avg_celsius}°C</p>
        <p><strong class="text-slate-400">Avg NDVI:</strong> ${props.ndvi_avg}</p>
        <p><strong class="text-slate-400">Area:</strong> ${props.area_km2} km²</p>
        <p><strong class="text-slate-400">Population:</strong> ${props.population.toLocaleString()}</p>
        <p class="mt-1 pt-1 border-t border-slate-700 font-bold uppercase tracking-wider text-[9px] text-rose-300">
          UHI Risk: ${props.vulnerability}
        </p>
      </div>`,
      { permanent: false, direction: 'auto', opacity: 0.95 }
    );

    // Bind custom popup table
    layer.bindPopup(
      `<div class="p-3 font-sans text-xs text-slate-200 leading-normal min-w-[230px]">
        <h4 class="font-extrabold border-b border-slate-700 pb-1 mb-2 text-sm" style="color: #a7cecd">${props.name} Ward</h4>
        <table class="w-full border-collapse text-left">
          <tbody>
            <tr class="border-b border-slate-800">
              <td class="py-1 pr-2 font-semibold text-slate-400">Slum Density</td>
              <td class="py-1 text-slate-200 font-medium">${props.slum_density ? (props.slum_density * 100).toFixed(1) + '%' : '0.0%'}</td>
            </tr>
            <tr class="border-b border-slate-800">
              <td class="py-1 pr-2 font-semibold text-slate-400">Outdoor Labor Index</td>
              <td class="py-1 text-slate-200 font-medium">${props.outdoor_labor_index ? props.outdoor_labor_index.toFixed(2) : '0.00'}</td>
            </tr>
            <tr class="border-b border-slate-800">
              <td class="py-1 pr-2 font-semibold text-slate-400">Elderly Ratio</td>
              <td class="py-1 text-slate-200 font-medium">${props.elderly_ratio ? (props.elderly_ratio * 100).toFixed(1) + '%' : '0.0%'}</td>
            </tr>
            <tr class="border-b border-slate-800">
              <td class="py-1 pr-2 font-semibold text-slate-400">Child Ratio</td>
              <td class="py-1 text-slate-200 font-medium">${props.child_ratio ? (props.child_ratio * 100).toFixed(1) + '%' : '0.0%'}</td>
            </tr>
            <tr class="border-b border-slate-800">
              <td class="py-1 pr-2 font-semibold text-slate-400">Water Scarcity Index</td>
              <td class="py-1 text-slate-200 font-medium">${props.water_scarcity_index ? props.water_scarcity_index.toFixed(2) : '0.00'}</td>
            </tr>
            <tr class="border-b border-slate-800">
              <td class="py-1 pr-2 font-semibold text-slate-400">Tree Canopy Ratio</td>
              <td class="py-1 text-slate-200 font-medium">${props.tree_canopy_ratio ? (props.tree_canopy_ratio * 100).toFixed(1) + '%' : '0.0%'}</td>
            </tr>
            <tr class="border-b border-slate-800">
              <td class="py-1 pr-2 font-semibold text-slate-400">Public Water Access</td>
              <td class="py-1 text-slate-200 font-medium">${props.public_water_access ? (props.public_water_access * 100).toFixed(1) + '%' : '0.0%'}</td>
            </tr>
            <tr class="border-b border-slate-800">
              <td class="py-1 pr-2 font-semibold text-slate-400">Cool Roofs Ratio</td>
              <td class="py-1 text-slate-200 font-medium">${props.cool_roofs_ratio ? (props.cool_roofs_ratio * 100).toFixed(1) + '%' : '0.0%'}</td>
            </tr>
            <tr>
              <td class="py-1.5 pr-2 font-bold" style="color: #a7cecd">Heat Risk Index</td>
              <td class="py-1.5 font-bold text-rose-300">${props.risk_score ? props.risk_score.toFixed(1) : '0.0'}</td>
            </tr>
          </tbody>
        </table>
        <div class="mt-2 text-[9px] uppercase tracking-wider text-slate-400 font-bold border-t border-slate-800 pt-1.5 flex justify-between">
          <span>Risk Class:</span>
          <span class="text-rose-300 font-extrabold">${props.vulnerability || 'N/A'}</span>
        </div>
      </div>`
    );

    // Hover highlight effects
    layer.on({
      mouseover: (e: any) => {
        const lyr = e.target;
        lyr.setStyle({
          weight: 2,
          color: '#e5c07b',
          fillOpacity: alpha === 0 ? 0.2 : Math.min(0.9, 0.5 * alpha + 0.1)
        });
        lyr.bringToFront();
        setHoveredWard(props);
      },
      mouseout: (e: any) => {
        const lyr = e.target;
        lyr.setStyle(getWardStyle(feature));
        setHoveredWard(null);
      },
      click: (e: any) => {
        handleMapClick(e.latlng.lat, e.latlng.lng);
      }
    });
  }, [alpha, getWardStyle, setHoveredWard]);

  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800/80 bg-slate-950">
      {/* Floating Basemap Selector in Top-Left */}
      <div className="absolute top-4 left-14 z-[1000] flex gap-1 bg-slate-950/85 backdrop-blur-md p-1.5 rounded-2xl shadow-2xl border border-slate-800/80">
        <button
          onClick={() => setMapType('satellite')}
          className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all duration-200 ease-in-out flex items-center gap-1.5 cursor-pointer ${
            mapType === 'satellite'
              ? 'bg-[#a7cecd] text-slate-950 shadow-lg font-extrabold hover:bg-slate-950 hover:text-[#a7cecd] hover:border hover:border-[#a7cecd]/40'
              : 'text-slate-300 hover:bg-[#a7cecd] hover:text-slate-950'
          }`}
        >
          <span className="w-2 h-2 rounded-full inline-block bg-teal-400"></span>
          Satellite
        </button>
        <button
          onClick={() => setMapType('osm')}
          className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all duration-200 ease-in-out flex items-center gap-1.5 cursor-pointer ${
            mapType === 'osm'
              ? 'bg-[#a7cecd] text-slate-950 shadow-lg font-extrabold hover:bg-slate-950 hover:text-[#a7cecd] hover:border hover:border-[#a7cecd]/40'
              : 'text-slate-300 hover:bg-[#a7cecd] hover:text-slate-950'
          }`}
        >
          <span className="w-2 h-2 rounded-full inline-block bg-sky-400"></span>
          Street
        </button>
        <button
          onClick={() => setMapType('terrain')}
          className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all duration-200 ease-in-out flex items-center gap-1.5 cursor-pointer ${
            mapType === 'terrain'
              ? 'bg-[#a7cecd] text-slate-950 shadow-lg font-extrabold hover:bg-slate-950 hover:text-[#a7cecd] hover:border hover:border-[#a7cecd]/40'
              : 'text-slate-300 hover:bg-[#a7cecd] hover:text-slate-950'
          }`}
        >
          <span className="w-2 h-2 rounded-full inline-block bg-amber-400"></span>
          Terrain
        </button>
      </div>

      {/* Floating Layer Toggles & Demographic Slider in Top-Right */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 items-end">
        <div className="flex gap-1.5 bg-slate-950/85 backdrop-blur-md p-1.5 rounded-2xl shadow-2xl border border-slate-800/80">
          <button
            onClick={() => setShowWards(!showWards)}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition-all duration-200 ease-in-out cursor-pointer ${
              showWards
                ? 'bg-slate-800 border hover:bg-[#a7cecd] hover:text-slate-950'
                : 'text-slate-400 hover:bg-[#a7cecd] hover:text-slate-950'
            }`}
            style={{ color: showWards ? '#a7cecd' : undefined, borderColor: showWards ? 'rgba(167, 206, 205, 0.3)' : undefined }}
          >
            Wards Overlay
          </button>
          <button
            onClick={() => setShowHeatPoints(!showHeatPoints)}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition-all duration-200 ease-in-out cursor-pointer ${
              showHeatPoints
                ? 'bg-slate-800 text-rose-300 border border-rose-500/30 hover:bg-rose-400 hover:text-slate-950'
                : 'text-slate-400 hover:bg-slate-200 hover:text-slate-950'
            }`}
          >
            UHI Heat Spots
          </button>
        </div>

        {/* Dark Socio-Thermal Vulnerability Blend Slider */}
        <div className="flex flex-col gap-2 bg-slate-950/90 backdrop-blur-md p-3.5 rounded-2xl shadow-2xl border border-slate-800/80 w-64">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-200">
            <span className="uppercase tracking-wider text-slate-400">Demographic Overlay</span>
            <span className="font-mono font-extrabold" style={{ color: '#a7cecd' }}>{vulnerabilitySlider}%</span>
          </div>
          <input
            id="vulnerability-slider"
            type="range"
            min="0"
            max="100"
            value={vulnerabilitySlider}
            onChange={(e) => setVulnerabilitySlider(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer focus:outline-none"
            style={{ accentColor: '#a7cecd' }}
          />
          <div className="flex justify-between text-[8px] font-semibold text-slate-400">
            <span>0% (Raw LST)</span>
            <span>100% (Vulnerability Overlay)</span>
          </div>
        </div>
      </div>

      <MapContainer
        center={cityCenters[activeCity] || [23.0225, 72.5714]}
        zoom={cityZooms[activeCity] || 11.5}
        scrollWheelZoom={true}
        zoomSnap={0.5}
        zoomDelta={0.5}
        zoomAnimation={true}
        fadeAnimation={true}
        markerZoomAnimation={true}
        preferCanvas={true}
        className="h-full w-full bg-slate-950"
      >
        <MapResizeHandler panelCollapsed={panelCollapsed} />
        <ChangeMapCenter
          center={cityCenters[activeCity] || [23.0225, 72.5714]}
          zoom={cityZooms[activeCity] || 11.5}
        />
        <TileLayer
          attribution='&copy; Google Maps / OpenStreetMap contributors'
          url={layers[mapType]}
          subdomains={mapType === 'osm' ? ['a', 'b', 'c'] : ['mt0', 'mt1', 'mt2', 'mt3']}
          maxNativeZoom={19}
          maxZoom={20}
          keepBuffer={8}
        />
        
        {/* Administrative Boundary tracing */}
        {boundaryData && (
          <GeoJSON
            data={boundaryData}
            style={{
              color: '#a7cecd',
              fillColor: 'transparent',
              weight: 2,
              dashArray: '6, 6',
              interactive: false
            }}
          />
        )}

        {/* Wards GeoJSON boundaries */}
        {showWards && wardsData && (
          <GeoJSON
            data={wardsData}
            style={getWardStyle}
            onEachFeature={onEachWardFeature}
          />
        )}

        {/* UHI Heat Spots — soft two-layer glow: visible but not harsh */}
        {showHeatPoints && heatPoints.map((pt, idx) => {
          const zoneColor = getHeatColor(pt.heat_zone);
          // Outer soft glow — translucent fill, gentle stroke
          const outerFill = pt.heat_zone === 'High Heat Zone' ? 0.18
                          : pt.heat_zone === 'Medium Heat Zone' ? 0.13
                          : 0.09;
          // Inner core — slightly denser but still muted
          const innerFill = pt.heat_zone === 'High Heat Zone' ? 0.30
                          : pt.heat_zone === 'Medium Heat Zone' ? 0.22
                          : 0.14;
          return (
            <React.Fragment key={idx}>
              {/* Outer halo */}
              <Circle
                center={[pt.latitude, pt.longitude]}
                radius={800}
                pathOptions={{
                  color: zoneColor,
                  fillColor: zoneColor,
                  fillOpacity: outerFill * (1 - alpha * 0.4),
                  weight: 1.2,
                  opacity: 0.45
                }}
              />
              {/* Inner core dot */}
              <Circle
                center={[pt.latitude, pt.longitude]}
                radius={320}
                pathOptions={{
                  color: zoneColor,
                  fillColor: zoneColor,
                  fillOpacity: innerFill * (1 - alpha * 0.4),
                  weight: 1.5,
                  opacity: 0.65
                }}
              />
            </React.Fragment>
          );
        })}

        {/* CFD 2D Wind Vectors flow rendering */}
        {analysisResult?.wind_corridor?.wind_vector_grid && (
          analysisResult.wind_corridor.wind_vector_grid.map((vec: any, idx: number) => {
            const start: [number, number] = [vec.latitude, vec.longitude];
            const scale = 0.0003; 
            const end: [number, number] = [
              vec.latitude + vec.u_y * scale, 
              vec.longitude + vec.u_x * scale
            ];
            return (
              <React.Fragment key={`wind-vec-${idx}`}>
                <Polyline
                  positions={[start, end]}
                  pathOptions={{
                    color: '#a7cecd',
                    weight: 1.5,
                    opacity: 0.8
                  }}
                />
                <Circle 
                  center={end} 
                  radius={15} 
                  pathOptions={{ color: '#a7cecd', fillColor: '#a7cecd', fillOpacity: 0.9, weight: 0 }} 
                />
              </React.Fragment>
            );
          })
        )}

        {/* Click inspector click handler */}
        <MapClickHandler onMapClick={handleMapClick} />

        {/* Active Coordinate Marker */}
        {selectedCoords && (
          <Marker position={[selectedCoords.lat, selectedCoords.lng]}>
            <Popup>
              <div className="text-xs font-semibold p-1">
                <p className="font-bold mb-1" style={{ color: '#a7cecd' }}>Target Coordinates</p>
                <p className="text-slate-300">Lat: {selectedCoords.lat.toFixed(5)}</p>
                <p className="text-slate-300">Lng: {selectedCoords.lng.toFixed(5)}</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Dark Aesthetic Bivariate Legend Overlay in Bottom-Right */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-slate-950/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-800/80 w-64 font-sans text-xs">
        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-3 border-b border-slate-800 pb-1 flex items-center justify-between">
          <span>Hazard & Vulnerability Index</span>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#a7cecd' }}></span>
        </h4>
        
        {/* Heat Palette Section */}
        <div className="mb-3.5">
          <div className="flex justify-between items-center mb-1 text-[10px] font-bold text-slate-200">
            <span>UHI Thermal Spots (LST)</span>
            <span className="text-[8px] text-amber-300 font-bold">Yellow to Red</span>
          </div>
          <div className="h-2 rounded bg-gradient-to-r from-[#a7cecd] via-amber-400 to-rose-500 w-full mb-1 border border-slate-800" />
          <div className="flex justify-between text-[8px] font-semibold text-slate-400">
            <span>Low (&lt;32.5°C)</span>
            <span>High (&gt;35.5°C)</span>
          </div>
        </div>
        
        {/* Vulnerability Palette Section */}
        <div>
          <div className="flex justify-between items-center mb-1 text-[10px] font-bold text-slate-200">
            <span>Socio-Demographic Vulnerability</span>
            <span className="text-[8px] text-purple-300 font-bold">Light to Deep Purple</span>
          </div>
          <div className="h-2 rounded bg-gradient-to-r from-[#dcd0ea] via-[#b39bc8] to-[#6b5288] w-full mb-1 border border-slate-800" />
          <div className="flex justify-between text-[8px] font-semibold text-slate-400">
            <span>Low Risk</span>
            <span>Very High Risk</span>
          </div>
        </div>
      </div>
    </div>
  );
}
