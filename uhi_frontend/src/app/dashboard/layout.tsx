'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Map, Wind, Droplets, Database, LogOut, User as UserIcon,
  Sparkles, Cpu
} from 'lucide-react';

// ── Easing curves ─────────────────────────────────────────────────────────────
const backOut = [0.34, 1.56, 0.64, 1] as const;
const powerIn = [0.55, 0,    1,    0.45] as const;
const expoOut = [0.16, 1,    0.3,  1] as const;

// ── Hamburger ↔ X morph ───────────────────────────────────────────────────────
function HamburgerIcon({ isOpen }: { isOpen: boolean }) {
  const ease = [0.4, 0, 0.2, 1] as const;
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <motion.line
        x1="3" y1="6"  x2="17" y2="6"
        stroke="#a7cecd" strokeWidth="1.5" strokeLinecap="round"
        animate={isOpen ? { x1: 5, y1: 5, x2: 15, y2: 15 } : { x1: 3, y1: 6, x2: 17, y2: 6 }}
        transition={{ duration: 0.28, ease }}
      />
      <motion.line
        x1="3" y1="10" x2="17" y2="10"
        stroke="#a7cecd" strokeWidth="1.5" strokeLinecap="round"
        animate={{ opacity: isOpen ? 0 : 1 }}
        transition={{ duration: 0.18 }}
      />
      <motion.line
        x1="3" y1="14" x2="17" y2="14"
        stroke="#a7cecd" strokeWidth="1.5" strokeLinecap="round"
        animate={isOpen ? { x1: 15, y1: 5, x2: 5, y2: 15 } : { x1: 3, y1: 14, x2: 17, y2: 14 }}
        transition={{ duration: 0.28, ease }}
      />
    </svg>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { token, user, fetchProfile, logout } = useStore();

  const [mounted,         setMounted]         = useState(false);
  const [sidebarOpen,     setSidebarOpen]     = useState(false);


  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted) {
      if (!token) router.push('/');
      else if (!user) fetchProfile();
    }
  }, [mounted, token, user, fetchProfile, router]);


  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebarOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleToggle = () => {
    setSidebarOpen(prev => !prev);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 340);
  };

  if (!mounted || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-slate-300 font-medium">
        Verifying authorization...
      </div>
    );
  }

  const role = user?.profile?.role || 'GUEST';

  const menuItems = [
    { name: 'SANKALP Quantum Agent',         path: '/dashboard/sankalp',        icon: Cpu,      roles: ['ADMIN','ANALYST','PLANNER','GUEST'] },
    { name: 'GIS Map Workspace',             path: '/dashboard/map',            icon: Map,      roles: ['ADMIN','ANALYST','PLANNER','GUEST'] },
    { name: 'AI Mitigation Recommendations', path: '/dashboard/recommendations', icon: Sparkles, roles: ['ADMIN','ANALYST','PLANNER'] },
    { name: 'Wind Corridors (CFD)',           path: '/dashboard/wind',           icon: Wind,     roles: ['ADMIN','ANALYST','PLANNER','GUEST'] },
    { name: 'Groundwater Recharge',          path: '/dashboard/groundwater',    icon: Droplets, roles: ['ADMIN','ANALYST','PLANNER','GUEST'] },
    { name: 'Aquifer Oracle',                path: '/dashboard/aquifer',        icon: Droplets, roles: ['ADMIN','PLANNER'] },
    { name: 'Datasets & Auditing',           path: '/dashboard/data',           icon: Database, roles: ['ADMIN','ANALYST'] },
  ];

  const visibleItems = menuItems.filter(item => item.roles.includes(role));
  const handleLogout = () => { logout(); router.push('/'); };

  return (
    <div className="h-screen flex overflow-hidden font-sans text-slate-100 bg-cosmic-animated relative">
      {/* Tint + nebulae */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none z-0" />
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-teal-500/10 blur-[100px] pointer-events-none animate-nebula z-0" />
      <div className="absolute -bottom-40 -right-40 w-[30rem] h-[30rem] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none animate-nebula z-0" style={{ animationDelay: '-8s' }} />

      {/* ══ LEFT SIDEBAR — slim icon strip ════════════════════════════════════ */}
      <div className="hidden md:flex md:flex-shrink-0 relative z-20">
        <div className="flex flex-col w-14 bg-black/30 backdrop-blur-md border-r border-white/10">

          {/* Hamburger toggle */}
          <div className="flex items-center justify-center h-14 border-b border-white/10 flex-shrink-0">
            <button
              onClick={handleToggle}
              aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <HamburgerIcon isOpen={sidebarOpen} />
            </button>
          </div>

          {/* Icon strip — sliding pill */}
          <div className="flex-1 flex flex-col pt-3 pb-4 overflow-y-auto">
            {(() => {
              const ITEM_H = 40; // py-2.5 (10+10) + icon ~18px ≈ 40px
              const GAP    = 4;  // space-y-1 = 4px
              const activeIdx = visibleItems.findIndex(it => it.path === pathname);
              const pillTop   = activeIdx >= 0 ? activeIdx * (ITEM_H + GAP) : 0;
              return (
                <div className="flex-1 px-2 relative flex flex-col" style={{ gap: GAP }}>

                  {/* Sliding teal pill behind icons */}
                  {activeIdx >= 0 && (
                    <motion.div
                      className="absolute left-2 right-2 rounded-xl pointer-events-none z-0"
                      style={{ backgroundColor: '#a7cecd', height: ITEM_H }}
                      animate={{ top: pillTop }}
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}

                  {visibleItems.map((item) => {
                    const active = pathname === item.path;
                    const Icon   = item.icon;
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        title={item.name}
                        className={`relative z-10 flex items-center justify-center rounded-xl
                          transition-colors duration-150 ${
                          active
                            ? 'text-slate-950'
                            : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
                        }`}
                        style={{ height: ITEM_H }}
                      >
                        <Icon size={18} className="flex-shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 flex flex-col items-center border-t border-white/10 p-2.5 gap-2">
            <div className="p-1.5 rounded-lg bg-white/10 border border-white/10">
              <UserIcon size={16} className="text-slate-300" />
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ══ THREE-PANEL OVERLAY (appears left of content, after icon strip) ═══ */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-[30] bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.28 } }}
              exit={{ opacity: 0, transition: { duration: 0.28, delay: 0.18 } }}
              onClick={() => setSidebarOpen(false)}
            />

            {/* Panels column — sits flush against the icon strip (left-14) */}
            <div
              className="fixed top-0 left-14 bottom-0 z-[40]
                flex flex-col gap-2 p-2 pointer-events-none"
              style={{ width: '13rem' }}
            >
              {/* ── Panel 1: Nav links (flex-1, tallest) ── */}
              <motion.div
                key="panel-nav"
                className="flex-1 w-full rounded-2xl border border-white/10
                  bg-black/75 backdrop-blur-2xl shadow-2xl pointer-events-auto
                  flex flex-col overflow-hidden"
                initial={{ x: '-115%' }}
                animate={{ x: '0%', transition: { duration: 0.5, ease: backOut } }}
                exit={{
                  y: '110vh', rotate: -7,
                  transition: { duration: 0.48, ease: powerIn }
                }}
              >
                {/* Logo header */}
                <motion.div
                  className="px-4 pt-4 pb-3 border-b border-white/10 flex-shrink-0"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0, transition: { duration: 0.3, delay: 0.2, ease: expoOut } }}
                  exit={{ opacity: 0 }}
                >
                  <span className="text-xs font-extrabold tracking-tight block" style={{ color: '#a7cecd' }}>
                    ClimateIntel
                  </span>
                  <span className="text-[8px] text-slate-400 font-bold tracking-widest uppercase">
                    Ahmedabad Twin
                  </span>
                </motion.div>

                {/* Nav items with stagger + index-based sliding pill */}
                <div className="flex-1 overflow-y-auto pt-2 pb-3">
                  {/* ITEM_HEIGHT = py-2.5 (10px top + 10px bot) + text line ~18px + gap-0.5 (2px) = ~40px */}
                  {(() => {
                    const ITEM_H = 40; // px — matches py-2.5 + font height
                    const GAP    = 2;  // gap-0.5 = 2px
                    const activeIdx = visibleItems.findIndex(it => it.path === pathname);
                    const pillTop   = activeIdx >= 0 ? activeIdx * (ITEM_H + GAP) : 0;
                    return (
                      <div className="px-2 relative flex flex-col" style={{ gap: GAP }}>

                        {/* Sliding pill — always rendered, animates via spring */}
                        {activeIdx >= 0 && (
                          <motion.div
                            className="absolute left-2 right-2 rounded-xl pointer-events-none z-0"
                            style={{ backgroundColor: '#a7cecd', height: ITEM_H }}
                            animate={{ top: pillTop }}
                            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                          />
                        )}

                        {visibleItems.map((item, i) => {
                          const active = pathname === item.path;
                          const Icon   = item.icon;
                          return (
                            <motion.div
                              key={item.path}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{
                                opacity: 1, x: 0,
                                transition: { duration: 0.42, ease: expoOut, delay: 0.14 + i * 0.05 },
                              }}
                              exit={{ opacity: 0, x: -12, transition: { duration: 0.1 } }}
                              style={{ height: ITEM_H }}
                            >
                              <Link
                                href={item.path}
                                className={`relative z-10 group flex items-center gap-2.5 px-3
                                  text-[11px] font-bold rounded-xl h-full
                                  transition-colors duration-150 ${
                                  active
                                    ? 'text-slate-950 font-extrabold'
                                    : 'text-slate-300 hover:bg-[#a7cecd] hover:text-slate-950'
                                }`}
                              >
                                <Icon
                                  size={15}
                                  className={`flex-shrink-0 transition-colors duration-150 ${
                                    active ? 'text-slate-950' : 'text-slate-400 group-hover:text-slate-950'
                                  }`}
                                />
                                <span className="truncate leading-tight">{item.name}</span>
                              </Link>
                            </motion.div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </motion.div>

              {/* ── Panel 2: User info — teal gradient card ── */}
              <motion.div
                key="panel-user"
                className="w-full rounded-2xl border border-[#a7cecd]/25 shadow-xl
                  pointer-events-auto px-4 py-3 flex items-center gap-3 flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(167,206,205,0.18) 0%, rgba(167,206,205,0.06) 100%)',
                  backdropFilter: 'blur(20px)',
                }}
                initial={{ x: '-115%' }}
                animate={{ x: '0%', transition: { duration: 0.5, ease: backOut, delay: 0.07 } }}
                exit={{
                  y: '110vh', rotate: 6,
                  transition: { duration: 0.48, ease: powerIn, delay: 0.04 }
                }}
              >
                <div className="p-1.5 rounded-lg bg-white/10 border border-white/10 flex-shrink-0">
                  <UserIcon size={15} className="text-[#a7cecd]" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[11px] font-bold text-slate-100 truncate">{user?.username}</span>
                  <span
                    className="text-[8px] font-bold px-1.5 py-0.5 mt-0.5 rounded-full w-fit uppercase border"
                    style={{
                      backgroundColor: 'rgba(167,206,205,0.12)',
                      color: '#a7cecd',
                      borderColor: 'rgba(167,206,205,0.3)',
                    }}
                  >
                    {user?.profile?.role_display}
                  </span>
                </div>
              </motion.div>

              {/* ── Panel 3: Logout bar ── */}
              <motion.div
                key="panel-logout"
                className="w-full rounded-2xl border border-white/10
                  bg-black/55 backdrop-blur-xl shadow-xl pointer-events-auto
                  px-4 py-3 flex items-center justify-between flex-shrink-0"
                initial={{ x: '-115%' }}
                animate={{ x: '0%', transition: { duration: 0.5, ease: backOut, delay: 0.14 } }}
                exit={{
                  y: '110vh', rotate: -5,
                  transition: { duration: 0.48, ease: powerIn, delay: 0.02 }
                }}
              >
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                  Session active
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-[11px] font-bold
                    text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <LogOut size={13} />
                  Logout
                </button>
              </motion.div>

            </div>
          </>
        )}
      </AnimatePresence>

      {/* ══ MAIN CONTENT ══════════════════════════════════════════════════════ */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden relative z-10">

        {/* Mobile topbar */}
        <div className="md:hidden flex items-center justify-between bg-black/30 backdrop-blur-md border-b border-white/10 px-4 h-14">
          <span className="text-sm font-extrabold tracking-tight" style={{ color: '#a7cecd' }}>ClimateIntel</span>
          <div className="flex items-center gap-4">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
              style={{ backgroundColor: 'rgba(167,206,205,0.15)', color: '#a7cecd' }}
            >
              {role}
            </span>
            <button onClick={handleLogout} className="text-slate-400 hover:text-rose-400">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
