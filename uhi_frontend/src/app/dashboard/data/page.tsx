'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Database, Upload, AlertTriangle, CheckCircle2, ShieldAlert, Clock, RefreshCw, Layers } from 'lucide-react';

interface Dataset {
  id: number;
  file_name: string;
  file_type_display: string;
  uploaded_by_username: string;
  status: string;
  crs: string;
  geometry_type: string;
  error_message: string;
  metadata: Record<string, any>;
  created_at: string;
}

interface SecurityLog {
  id: number;
  event_type_display: string;
  user_username: string;
  ip_address: string;
  path: string;
  status_code: number;
  details: string;
  timestamp: string;
}

export default function DataAndAuditingPage() {
  const { token, user } = useStore();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState('TIFF');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fetchDatasets = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://127.0.0.1:8000/api/data/upload/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDatasets(data);
      }
    } catch (err) {}
  };

  const fetchSecurityLogs = async () => {
    if (!token || user?.profile?.role !== 'ADMIN') return;
    try {
      const res = await fetch('http://127.0.0.1:8000/api/security/logs/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSecurityLogs(data);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchDatasets();
    fetchSecurityLogs();
  }, [token, user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadError(null);
      setUploadSuccess(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadError('Please select a file to upload.');
      return;
    }
    
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);
    
    try {
      const res = await fetch('http://127.0.0.1:8000/api/data/upload/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error_message || data.error || 'Validation failed. Dataset rejected.');
      }
      
      setUploadSuccess(true);
      setFile(null);
      fetchDatasets();
      fetchSecurityLogs();
    } catch (err: any) {
      setUploadError(err.message);
      fetchDatasets();
      fetchSecurityLogs();
    } finally {
      setUploading(false);
    }
  };

  const role = user?.profile?.role || 'GUEST';

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 min-h-full">
      {/* Page Header Box - Seamless Blended Glass */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-black/25 backdrop-blur-sm border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] transition-colors hover:border-white/20">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-black/35 border border-[#a7cecd]/40 text-[#a7cecd] shadow-[0_0_15px_rgba(167,206,205,0.25)]">
            <Database size={22} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white drop-shadow-sm" style={{ color: '#a7cecd' }}>
              Data Management &amp; Security Audits
            </h1>
            <p className="text-xs text-slate-300 font-medium mt-0.5 drop-shadow-sm">
              Geospatial dataset ingestion engine, CRS validation, and security event audits.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Pane - Blended Glass */}
        {['ADMIN', 'ANALYST'].includes(role) && (
          <div className="lg:col-span-1 p-6 rounded-2xl border border-white/10 bg-black/25 backdrop-blur-sm h-fit space-y-5 shadow-xl text-slate-100">
            <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2" style={{ color: '#a7cecd' }}>
              <Upload size={16} style={{ color: '#a7cecd' }} />
              Ingest New Dataset
            </h3>
            
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {uploadError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-[10px] font-semibold text-rose-300 leading-normal flex items-start gap-2">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5 text-rose-400" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-[10px] font-bold text-emerald-300 leading-normal flex items-start gap-2">
                  <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5 text-[#a7cecd]" />
                  <span>Dataset uploaded and validated successfully!</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Dataset File</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-slate-200 file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-[#a7cecd] file:text-slate-950 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Format / Type</label>
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-[#a7cecd]/30 focus:border-[#a7cecd] appearance-none cursor-pointer"
                >
                  <option value="TIFF" className="bg-slate-900 text-slate-200">GeoTIFF Raster (.tif)</option>
                  <option value="CSV" className="bg-slate-900 text-slate-200">CSV Tabular Coordinates (.csv)</option>
                  <option value="GEOJSON" className="bg-slate-900 text-slate-200">GeoJSON Vectors (.geojson)</option>
                  <option value="SHAPEFILE" className="bg-slate-900 text-slate-200">Shapefile Archive (.zip)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full py-2.5 font-bold text-xs rounded-xl shadow-lg transition-all duration-200 ease-in-out text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/60 hover:text-[#a7cecd] border border-transparent hover:border-[#a7cecd] cursor-pointer"
                style={{ backgroundColor: '#a7cecd' }}
              >
                {uploading ? 'Validating GeoTIFF...' : 'Upload & Validate'}
              </button>
            </form>
          </div>
        )}

        {/* Datasets List Pane - Blended Glass */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2" style={{ color: '#a7cecd' }}>
              <Layers size={16} style={{ color: '#a7cecd' }} />
              Active System Layers
            </h3>
            <button onClick={fetchDatasets} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-100 cursor-pointer transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {datasets.length === 0 ? (
              <div className="p-6 rounded-2xl border border-white/10 bg-black/25 backdrop-blur-sm text-center">
                <p className="text-xs text-slate-400 font-medium italic">No custom user layers ingested.</p>
              </div>
            ) : (
              datasets.map((dataset) => (
                <div key={dataset.id} className="p-4 rounded-xl border border-white/10 bg-black/25 backdrop-blur-sm flex items-start justify-between text-xs text-slate-100 shadow-md">
                  <div className="space-y-1.5 max-w-[70%]">
                    <div className="flex items-center gap-2.5">
                      <span className="font-extrabold text-slate-100 break-all">{dataset.file_name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-black/40 border border-white/10 text-slate-300 uppercase">
                        {dataset.file_type_display}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-400 font-medium">
                      <span>CRS: <code className="bg-black/50 px-1 py-0.5 rounded text-[9px] text-[#a7cecd]">{dataset.crs || 'N/A'}</code></span>
                      {dataset.geometry_type && <span>Geom: {dataset.geometry_type}</span>}
                      <span className="col-span-2">Uploader: {dataset.uploaded_by_username} • {new Date(dataset.created_at).toLocaleDateString()}</span>
                    </div>
                    {dataset.error_message && (
                      <p className="text-[10px] font-semibold text-rose-400">Error: {dataset.error_message}</p>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                    dataset.status === 'VALIDATED' 
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' 
                      : 'bg-rose-950/40 border-rose-800/60 text-rose-400'
                  }`}>
                    {dataset.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Security Logs Pane - Blended Glass */}
      {role === 'ADMIN' && (
        <div className="space-y-4 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2" style={{ color: '#a7cecd' }}>
              <ShieldAlert size={16} style={{ color: '#a7cecd' }} className="animate-pulse" />
              Security Audit logs &amp; Threat Intelligence
            </h3>
            <button onClick={fetchSecurityLogs} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-100 cursor-pointer transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="bg-black/35 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-black/70 backdrop-blur-md border-b border-white/10 text-[10px] font-extrabold text-slate-300 uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Event Type</th>
                    <th className="p-3">IP Address</th>
                    <th className="p-3">Path</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 font-medium text-slate-200">
                  {securityLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center italic text-slate-400">No security events recorded.</td>
                    </tr>
                  ) : (
                    securityLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 text-[10px] font-mono text-slate-300 font-bold">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                            log.event_type_display.includes('Success') 
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/40' 
                              : 'bg-rose-950/60 text-rose-300 border border-rose-700/40'
                          }`}>
                            {log.event_type_display}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[10px] text-slate-200 font-bold">{log.ip_address || '127.0.0.1'}</td>
                        <td className="p-3 font-mono text-[10px] text-slate-200 font-bold truncate max-w-[120px]" title={log.path}>{log.path}</td>
                        <td className="p-3">
                          <span className={`font-extrabold ${log.status_code >= 400 ? 'text-rose-400' : 'text-emerald-300'}`}>
                            {log.status_code}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300 truncate max-w-[200px]" title={log.details}>{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
