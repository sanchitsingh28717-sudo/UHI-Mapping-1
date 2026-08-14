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
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: '#a7cecd' }}>
            Data Management &amp; Security Audits
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Geospatial dataset ingestion engine, CRS validation, and security event audits.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Pane (Only for Research Analyst & Admin) */}
        {['ADMIN', 'ANALYST'].includes(role) && (
          <div className="lg:col-span-1 glass-panel p-6 rounded-2xl border border-slate-150 h-fit space-y-5 bg-white">
            <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2" style={{ color: '#a7cecd' }}>
              <Upload size={16} style={{ color: '#a7cecd' }} />
              Ingest New Dataset
            </h3>
            
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[10px] font-semibold text-rose-600 leading-normal flex items-start gap-2">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] font-bold text-emerald-700 leading-normal flex items-start gap-2">
                  <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
                  <span>Dataset uploaded and validated successfully!</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Dataset File</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-emerald-550 file:bg-emerald-600 file:text-white cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Format / Type</label>
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none cursor-pointer"
                >
                  <option value="TIFF">GeoTIFF Raster (.tif)</option>
                  <option value="CSV">CSV Tabular Coordinates (.csv)</option>
                  <option value="GEOJSON">GeoJSON Vectors (.geojson)</option>
                  <option value="SHAPEFILE">Shapefile Archive (.zip)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full py-2 bg-emerald-600 hover:bg-slate-900 hover:text-emerald-400 border border-transparent hover:border-emerald-500 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-md transition-all duration-200 ease-in-out cursor-pointer"
              >
                {uploading ? 'Validating GeoTIFF...' : 'Upload & Validate'}
              </button>
            </form>
          </div>
        )}

        {/* Datasets List Pane */}
        <div className={`lg:col-span-2 space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2" style={{ color: '#a7cecd' }}>
              <Layers size={16} style={{ color: '#a7cecd' }} />
              Active System Layers
            </h3>
            <button onClick={fetchDatasets} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer">
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {datasets.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium italic">No custom user layers ingested.</p>
            ) : (
              datasets.map((dataset) => (
                <div key={dataset.id} className="glass-panel p-4 rounded-xl border border-slate-150 flex items-start justify-between bg-white text-xs">
                  <div className="space-y-1.5 max-w-[70%]">
                    <div className="flex items-center gap-2.5">
                      <span className="font-extrabold text-slate-800 break-all">{dataset.file_name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-100 text-slate-500 uppercase">
                        {dataset.file_type_display}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-500 font-medium">
                      <span>CRS: <code className="bg-slate-100 px-1 py-0.5 rounded text-[9px]">{dataset.crs || 'N/A'}</code></span>
                      {dataset.geometry_type && <span>Geom: {dataset.geometry_type}</span>}
                      <span className="col-span-2">Uploader: {dataset.uploaded_by_username} • {new Date(dataset.created_at).toLocaleDateString()}</span>
                    </div>
                    {dataset.error_message && (
                      <p className="text-[10px] font-semibold text-rose-500">Error: {dataset.error_message}</p>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                    dataset.status === 'VALIDATED' 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                      : 'bg-rose-50 border-rose-100 text-rose-700'
                  }`}>
                    {dataset.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Security Logs Pane (Only for Administrator) */}
      {role === 'ADMIN' && (
        <div className="space-y-4 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2" style={{ color: '#a7cecd' }}>
              <ShieldAlert size={16} style={{ color: '#a7cecd' }} className="animate-pulse" />
              Security Audit logs &amp; Threat Intelligence
            </h3>
            <button onClick={fetchSecurityLogs} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer">
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-[10px] font-extrabold text-slate-300 uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Event Type</th>
                    <th className="p-3">IP Address</th>
                    <th className="p-3">Path</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-medium text-slate-200">
                  {securityLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center italic text-slate-500">No security events recorded.</td>
                    </tr>
                  ) : (
                    securityLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 text-[10px] font-mono text-slate-300 font-bold">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                            log.event_type_display.includes('Success') 
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-700/40' 
                              : 'bg-rose-950/60 text-rose-400 border border-rose-700/40'
                          }`}>
                            {log.event_type_display}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[10px] text-slate-200 font-bold">{log.ip_address || '127.0.0.1'}</td>
                        <td className="p-3 font-mono text-[10px] text-slate-200 font-bold truncate max-w-[120px]" title={log.path}>{log.path}</td>
                        <td className="p-3">
                          <span className={`font-extrabold ${log.status_code >= 400 ? 'text-rose-400' : 'text-emerald-400'}`}>
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
