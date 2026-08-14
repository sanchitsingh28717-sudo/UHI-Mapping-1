'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { Shield, Lock, User, ThermometerSnowflake } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, token, loading, error, setError } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (token) {
      router.push('/dashboard/map');
    }
    setError(null);
  }, [token, router, setError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }
    const success = await login(username, password);
    if (success) {
      router.push('/dashboard/map');
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-slate-50 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-50 blur-3xl opacity-70 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-teal-50 blur-3xl opacity-70 pointer-events-none" />

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-emerald-600 rounded-xl text-white mb-3 shadow-md">
            <ThermometerSnowflake size={32} className="animate-pulse" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight text-center">
            SANKALP
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Smart Cities Mission & BISAG-N</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-semibold leading-relaxed">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <User size={18} />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock size={18} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-700/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col items-center gap-2.5">
          <p className="text-xs text-slate-400">
            Demo credentials for testing:
          </p>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-mono w-full text-center">
            <div className="bg-slate-100 p-1.5 rounded">admin / admin12345</div>
            <div className="bg-slate-100 p-1.5 rounded">analyst / analyst12345</div>
            <div className="bg-slate-100 p-1.5 rounded">planner / planner12345</div>
            <div className="bg-slate-100 p-1.5 rounded">guest / guest12345</div>
          </div>
          <p className="text-xs text-slate-500 mt-2 font-medium">
            New planner or analyst?{' '}
            <Link href="/register" className="text-emerald-600 hover:underline font-bold">
              Register Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
