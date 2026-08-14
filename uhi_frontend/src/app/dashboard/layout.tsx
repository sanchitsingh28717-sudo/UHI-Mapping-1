'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { 
  Map, Wind, Droplets, Database, LogOut, User as UserIcon, 
  Sparkles, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, user, fetchProfile, logout } = useStore();
  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [indicatorTop, setIndicatorTop] = useState(0);
  const [indicatorHeight, setIndicatorHeight] = useState(0);
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted) {
      if (!token) router.push('/login');
      else if (!user) fetchProfile();
    }
  }, [mounted, token, user, fetchProfile, router]);

  // Update sliding indicator position whenever active route changes
  useEffect(() => {
    const activeEl = itemRefs.current[pathname];
    const navEl = navRef.current;
    if (activeEl && navEl) {
      const navRect = navEl.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      setIndicatorTop(elRect.top - navRect.top + navEl.scrollTop);
      setIndicatorHeight(elRect.height);
    }
  }, [pathname, sidebarCollapsed]);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
    setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 300);
  };

  if (!mounted || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300 font-medium">
        Verifying authorization...
      </div>
    );
  }

  const role = user?.profile?.role || 'GUEST';

  const menuItems = [
    { name: 'GIS Map Workspace',            path: '/dashboard/map',             icon: Map,      roles: ['ADMIN', 'ANALYST', 'PLANNER', 'GUEST'] },
    { name: 'AI Mitigation Recommendations',path: '/dashboard/recommendations',  icon: Sparkles, roles: ['ADMIN', 'ANALYST', 'PLANNER'] },
    { name: 'Wind Corridors (CFD)',          path: '/dashboard/wind',             icon: Wind,     roles: ['ADMIN', 'ANALYST', 'PLANNER', 'GUEST'] },
    { name: 'Groundwater Recharge',         path: '/dashboard/groundwater',      icon: Droplets, roles: ['ADMIN', 'ANALYST', 'PLANNER', 'GUEST'] },
    { name: 'Aquifer Oracle',               path: '/dashboard/aquifer',          icon: Droplets, roles: ['ADMIN', 'PLANNER'] },
    { name: 'Datasets & Auditing',          path: '/dashboard/data',             icon: Database, roles: ['ADMIN', 'ANALYST'] },
  ];

  const visibleItems = menuItems.filter(item => item.roles.includes(role));

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="h-screen flex overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* ── Sidebar ── */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div
          className={`flex flex-col bg-slate-950 border-r border-slate-800/80 relative overflow-hidden
            transition-[width] duration-300 ease-in-out ${sidebarCollapsed ? 'w-16' : 'w-56'}`}
        >
          {/* Logo header */}
          <div className="flex items-center justify-between px-3.5 h-14 border-b border-slate-800 bg-slate-900/40 flex-shrink-0">
            <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
              {/* No icon — just wordmark text */}
              {!sidebarCollapsed && (
                <div className="flex flex-col whitespace-nowrap">
                  <span className="text-xs font-extrabold tracking-tight" style={{ color: '#a7cecd' }}>ClimateIntel</span>
                  <span className="text-[9px] text-slate-500 font-bold tracking-wider uppercase">Ahmedabad Twin</span>
                </div>
              )}
            </div>

            {/* Collapse/Expand Toggle */}
            <button
              onClick={toggleSidebar}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer flex-shrink-0"
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 flex flex-col pt-3 pb-4 overflow-y-auto">
            {/* Sliding indicator track */}
            <div ref={navRef} className="flex-1 px-2 space-y-1 relative">
              {/* Animated active pill — slides behind links */}
              {indicatorHeight > 0 && (
                <div
                  className="absolute left-2 right-2 rounded-xl pointer-events-none z-0"
                  style={{
                    top: `${indicatorTop}px`,
                    height: `${indicatorHeight}px`,
                    backgroundColor: '#a7cecd',
                    transition: 'top 0.28s cubic-bezier(0.4,0,0.2,1), height 0.2s ease',
                  }}
                />
              )}

              {visibleItems.map((item) => {
                const active = pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    ref={el => { itemRefs.current[item.path] = el; }}
                    title={sidebarCollapsed ? item.name : undefined}
                    className={`relative z-10 group flex items-center py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ease-in-out ${
                      sidebarCollapsed ? 'justify-center px-0' : 'px-3 gap-3'
                    } ${
                      active
                        ? 'text-slate-950 font-extrabold hover:bg-slate-950 hover:text-[#a7cecd] hover:border hover:border-[#a7cecd]/50'
                        : 'text-slate-400 hover:bg-[#a7cecd] hover:text-slate-950'
                    }`}
                  >
                    <Icon
                      size={18}
                      className={`flex-shrink-0 transition-colors duration-200 ease-in-out ${
                        active ? 'text-slate-950 group-hover:text-[#a7cecd]' : 'text-slate-500 group-hover:text-slate-950'
                      }`}
                    />
                    {!sidebarCollapsed && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Profile footer */}
          <div className="flex-shrink-0 flex border-t border-slate-800/80 p-2.5 bg-slate-900/40">
            <div className={`flex items-center w-full ${sidebarCollapsed ? 'justify-center flex-col gap-2' : 'gap-2.5'}`}>
              <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300 flex-shrink-0">
                <UserIcon size={16} />
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[11px] font-bold text-slate-200 truncate">{user?.username}</span>
                  <span
                    className="text-[8px] font-bold px-1.5 py-0.5 mt-0.5 rounded-full w-fit uppercase border"
                    style={{ backgroundColor: 'rgba(167, 206, 205, 0.12)', color: '#a7cecd', borderColor: 'rgba(167, 206, 205, 0.3)' }}
                  >
                    {user?.profile?.role_display}
                  </span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                title="Logout"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between bg-slate-950 border-b border-slate-800 px-4 h-14">
          <span className="text-sm font-extrabold tracking-tight" style={{ color: '#a7cecd' }}>ClimateIntel</span>
          <div className="flex items-center gap-4">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
              style={{ backgroundColor: 'rgba(167, 206, 205, 0.15)', color: '#a7cecd' }}
            >
              {role}
            </span>
            <button onClick={handleLogout} className="text-slate-400 hover:text-rose-400">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
