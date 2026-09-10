'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Lock, Mail, Users } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [role, setRole]           = useState('GUEST');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState(false);

  /* ── cursor refs ── */
  const cursorRef = useRef<HTMLDivElement>(null);
  const glowRef   = useRef<HTMLDivElement>(null);
  const videoRef  = useRef<HTMLVideoElement>(null);

  const mouse      = useRef({ x: 0, y: 0 });
  const glow       = useRef({ x: 0, y: 0 });
  const isHovering = useRef(false);
  const vMX = useRef(0), vMY = useRef(0);
  const vCX = useRef(0), vCY = useRef(0);

  const trailsRef  = useRef<HTMLDivElement[]>([]);
  const trailPos   = useRef<{x:number;y:number}[]>([]);
  const TRAIL_COUNT = 8;

  /* ── back-navigation ── */
  useEffect(() => {
    window.history.replaceState(null, '', '/register');
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) window.location.replace('/home'); };
    const onPopState = () => window.location.replace('/home');
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  /* ── cursor RAF loop ── */
  useEffect(() => {
    mouse.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    glow.current  = { ...mouse.current };
    trailPos.current = Array.from({ length: TRAIL_COUNT }, () => ({ ...mouse.current }));

    const onMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      vMX.current = e.clientX / window.innerWidth  - 0.5;
      vMY.current = e.clientY / window.innerHeight - 0.5;

      if (cursorRef.current) {
        cursorRef.current.style.left = e.clientX + 'px';
        cursorRef.current.style.top  = e.clientY + 'px';
      }

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const wasHovering = isHovering.current;
      isHovering.current = !!el?.closest('button, a, input, select, [data-cursor-hover]');
      if (cursorRef.current && wasHovering !== isHovering.current) {
        cursorRef.current.setAttribute('data-hover', isHovering.current ? '1' : '0');
      }
    };

    window.addEventListener('mousemove', onMove);

    let raf: number;
    const loop = () => {
      glow.current.x += (mouse.current.x - glow.current.x) * 0.06;
      glow.current.y += (mouse.current.y - glow.current.y) * 0.06;
      if (glowRef.current) {
        glowRef.current.style.left = glow.current.x + 'px';
        glowRef.current.style.top  = glow.current.y + 'px';
      }

      trailPos.current[0] = { ...mouse.current };
      for (let i = 1; i < TRAIL_COUNT; i++) {
        trailPos.current[i] = {
          x: trailPos.current[i].x + (trailPos.current[i-1].x - trailPos.current[i].x) * 0.45,
          y: trailPos.current[i].y + (trailPos.current[i-1].y - trailPos.current[i].y) * 0.45,
        };
      }
      trailsRef.current.forEach((el, i) => {
        if (!el) return;
        const t = trailPos.current[i];
        const p  = 1 - i / TRAIL_COUNT;
        const sz = 2 + p * 3;
        el.style.left    = t.x + 'px';
        el.style.top     = t.y + 'px';
        el.style.width   = sz + 'px';
        el.style.height  = sz + 'px';
        el.style.opacity = String(p * 0.45);
      });

      vCX.current += (vMX.current - vCX.current) * 0.04;
      vCY.current += (vMY.current - vCY.current) * 0.04;
      if (videoRef.current) {
        videoRef.current.style.transform =
          `scale(1.08) translate(${-vCX.current * 2}%, ${-vCY.current * 2}%)`;
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) { setError('Username, Email, and Password are required.'); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, first_name: firstName, last_name: lastName, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(Object.values(data).flat().join(' ') || 'Registration failed.');
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const setTrailRef = useCallback((el: HTMLDivElement | null, i: number) => {
    if (el) trailsRef.current[i] = el;
  }, []);

  const inputStyle: React.CSSProperties = {
    width:'100%', paddingLeft:'2.2rem', paddingRight:'0.85rem',
    paddingTop:'0.6rem', paddingBottom:'0.6rem',
    background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)',
    borderRadius:'10px', color:'#fff', fontSize:'0.8rem',
    fontFamily:'"General Sans",sans-serif', outline:'none', transition:'border-color 0.2s',
  };
  const labelStyle: React.CSSProperties = {
    display:'block', fontFamily:'"JetBrains Mono",monospace',
    fontSize:'0.62rem', letterSpacing:'0.15em', textTransform:'uppercase',
    color:'rgba(255,255,255,0.45)', marginBottom:'0.4rem',
  };
  const iconWrap: React.CSSProperties = {
    position:'absolute', left:'0.65rem', top:'50%', transform:'translateY(-50%)',
    color:'rgba(255,255,255,0.3)', display:'flex', alignItems:'center', pointerEvents:'none',
  };

  return (
    <>
      <style>{`
        .register-root, .register-root * { cursor: none !important; }

        /* arrow / hand toggle */
        .custom-cursor[data-hover="0"] .cursor-arrow { display: block; }
        .custom-cursor[data-hover="0"] .cursor-hand  { display: none;  }
        .custom-cursor[data-hover="1"] .cursor-arrow { display: none;  }
        .custom-cursor[data-hover="1"] .cursor-hand  { display: block; }

        .cursor-glow {
          position: fixed; width: 140px; height: 140px; border-radius: 50%;
          pointer-events: none; z-index: 99996; top: 0; left: 0;
          transform: translate(-50%,-50%);
          background: radial-gradient(circle, rgba(167,206,205,0.07) 0%, transparent 70%);
          filter: blur(10px);
        }
        .cursor-trail {
          position: fixed; border-radius: 50%; pointer-events: none;
          z-index: 99997; top: 0; left: 0;
          transform: translate(-50%,-50%);
          background: rgba(200,230,230,0.55);
        }
      `}</style>

      <div className="register-root" style={{
        position:'fixed', inset:0, width:'100%', height:'100%',
        overflow:'hidden', background:'#000', WebkitFontSmoothing:'antialiased',
      }}>

        {/* BG VIDEO */}
        <video ref={videoRef} autoPlay loop muted playsInline
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', zIndex:0, pointerEvents:'none' }}>
          <source src="/bg.mp4" type="video/mp4" />
        </video>

        {/* DARK OVERLAY */}
        <div style={{
          position:'absolute', inset:0, zIndex:2, pointerEvents:'none',
          background:[
            'linear-gradient(to bottom, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.42) 30%, rgba(0,0,0,0.42) 70%, rgba(0,0,0,0.88) 100%)',
            'radial-gradient(ellipse 95% 95% at 50% 50%, transparent 25%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.92) 100%)',
          ].join(', '),
        }} />

        {/* SCROLLABLE FORM */}
        <div style={{ position:'absolute', inset:0, zIndex:10, overflowY:'auto', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'2rem 1rem' }}>
          <div style={{ width:'100%', maxWidth:'460px', background:'rgba(255,255,255,0.06)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'16px', padding:'2.25rem 2rem', boxShadow:'0 32px 64px rgba(0,0,0,0.6)', margin:'auto' }}>

            {/* Header */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:'1.75rem' }}>
              <div style={{ marginBottom:'0.75rem' }}>
                <svg width="52" height="52" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="28" cy="28" r="27" stroke="#a7cecd" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.6"/>
                  <circle cx="28" cy="28" r="20" stroke="#a7cecd" strokeWidth="1" opacity="0.3"/>
                  <rect x="25" y="12" width="6" height="22" rx="3" fill="#a7cecd" opacity="0.9"/>
                  <circle cx="28" cy="36" r="6" fill="#a7cecd"/>
                  <rect x="26.5" y="22" width="3" height="14" rx="1.5" fill="rgba(0,0,0,0.35)"/>
                  <line x1="31" y1="18" x2="33.5" y2="18" stroke="#a7cecd" strokeWidth="1.2" strokeLinecap="round"/>
                  <line x1="31" y1="22" x2="33.5" y2="22" stroke="#a7cecd" strokeWidth="1.2" strokeLinecap="round"/>
                  <line x1="31" y1="26" x2="34"   y2="26" stroke="#a7cecd" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="31" y1="30" x2="33.5" y2="30" stroke="#a7cecd" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
              <h1 style={{ fontFamily:'"General Sans",sans-serif', fontWeight:600, fontSize:'1.25rem', letterSpacing:'0.04em', color:'#fff', textAlign:'center' }}>Create Account</h1>
              <p style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'0.62rem', letterSpacing:'0.18em', color:'rgba(255,255,255,0.35)', marginTop:'0.3rem', textTransform:'uppercase' }}>SANKALP</p>
            </div>

            {success ? (
              <div style={{ padding:'1rem', background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:'10px', color:'#6ee7b7', fontFamily:'"General Sans",sans-serif', fontSize:'0.8rem', letterSpacing:'0.04em', textAlign:'center' }}>
                Account registered successfully! Redirecting to login…
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                {error && <div style={{ padding:'0.7rem 0.9rem', background:'rgba(244,63,94,0.15)', border:'1px solid rgba(244,63,94,0.3)', borderRadius:'10px', color:'#fda4af', fontSize:'0.75rem', fontFamily:'"General Sans",sans-serif', letterSpacing:'0.04em' }}>{error}</div>}

                {/* First / Last */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                  <div>
                    <label style={labelStyle}>First Name</label>
                    <input type="text" value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="First name"
                      style={{ ...inputStyle, paddingLeft:'0.85rem' }}
                      onFocus={e=>(e.target.style.borderColor='rgba(16,185,129,0.6)')} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,0.12)')}/>
                  </div>
                  <div>
                    <label style={labelStyle}>Last Name</label>
                    <input type="text" value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="Last name"
                      style={{ ...inputStyle, paddingLeft:'0.85rem' }}
                      onFocus={e=>(e.target.style.borderColor='rgba(16,185,129,0.6)')} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,0.12)')}/>
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label style={labelStyle}>Username</label>
                  <div style={{ position:'relative' }}>
                    <span style={iconWrap}><User size={15}/></span>
                    <input type="text" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Choose unique username"
                      style={inputStyle}
                      onFocus={e=>(e.target.style.borderColor='rgba(16,185,129,0.6)')} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,0.12)')}/>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <div style={{ position:'relative' }}>
                    <span style={iconWrap}><Mail size={15}/></span>
                    <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your.email@gov.in"
                      style={inputStyle}
                      onFocus={e=>(e.target.style.borderColor='rgba(16,185,129,0.6)')} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,0.12)')}/>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position:'relative' }}>
                    <span style={iconWrap}><Lock size={15}/></span>
                    <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimum 8 characters"
                      style={inputStyle}
                      onFocus={e=>(e.target.style.borderColor='rgba(16,185,129,0.6)')} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,0.12)')}/>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label style={labelStyle}>Administrative Role</label>
                  <div style={{ position:'relative' }}>
                    <span style={iconWrap}><Users size={15}/></span>
                    <select value={role} onChange={e=>setRole(e.target.value)}
                      style={{ ...inputStyle, appearance:'none', WebkitAppearance:'none' }}
                      onFocus={e=>(e.target.style.borderColor='rgba(16,185,129,0.6)')} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,0.12)')}>
                      <option value="GUEST"   style={{ background:'#111',color:'#fff' }}>Guest Viewer (Read-only)</option>
                      <option value="PLANNER" style={{ background:'#111',color:'#fff' }}>Urban Planner (Mitigation Engine Access)</option>
                      <option value="ANALYST" style={{ background:'#111',color:'#fff' }}>Research Analyst (Dataset Upload + ML)</option>
                      <option value="ADMIN"   style={{ background:'#111',color:'#fff' }}>System Administrator (Full access)</option>
                    </select>
                  </div>
                </div>

                {/* Submit */}
                <button type="submit" disabled={loading}
                  style={{ width:'100%', padding:'0.8rem', marginTop:'0.25rem', background: loading ? 'rgba(167,206,205,0.4)' : '#a7cecd', border:'1px solid transparent', borderRadius:'12px', color:'#0f172a', fontFamily:'"General Sans",sans-serif', fontWeight:700, fontSize:'0.82rem', letterSpacing:'0.03em', transition:'background 0.2s,color 0.2s,border-color 0.2s', boxShadow: loading ? 'none' : '0 8px 24px rgba(167,206,205,0.25)', opacity: loading ? 0.6 : 1 }}
                  onMouseEnter={e=>{ if(!loading){const b=e.currentTarget as HTMLButtonElement;b.style.background='rgba(0,0,0,0.6)';b.style.color='#a7cecd';b.style.borderColor='#a7cecd';}}}
                  onMouseLeave={e=>{ if(!loading){const b=e.currentTarget as HTMLButtonElement;b.style.background='#a7cecd';b.style.color='#0f172a';b.style.borderColor='transparent';}}}>
                  {loading ? 'Registering Account...' : 'Register Profile'}
                </button>
              </form>
            )}

            <div style={{ marginTop:'1.5rem', paddingTop:'1.25rem', borderTop:'1px solid rgba(255,255,255,0.08)', textAlign:'center' }}>
              <p style={{ fontFamily:'"General Sans",sans-serif', fontSize:'0.75rem', color:'rgba(255,255,255,0.35)', letterSpacing:'0.04em' }}>
                Already have an account?{' '}
                <Link href="/login" style={{ color:'rgba(52,211,153,0.9)', textDecoration:'none', fontWeight:600 }}>Sign In</Link>
              </p>
            </div>
          </div>
        </div>

        {/* ════ CURSOR SYSTEM ════ */}

        {/* Glow aura */}
        <div ref={glowRef} className="cursor-glow" />

        {/* Trail comet */}
        {Array.from({ length: TRAIL_COUNT }).map((_,i) => (
          <div key={i} className="cursor-trail" ref={el => setTrailRef(el, i)} />
        ))}

        {/* Arrow / Hand cursor */}
        <div
          ref={cursorRef}
          className="custom-cursor"
          data-hover="0"
          style={{ position:'fixed', top:0, left:0, pointerEvents:'none', zIndex:100000, userSelect:'none' }}
        >
          {/* Normal arrow */}
          <svg className="cursor-arrow" width="22" height="26" viewBox="0 0 22 26" fill="none"
            style={{ display:'block', filter:'drop-shadow(0 1px 4px rgba(0,0,0,0.6))' }}>
            <path d="M2 2L2 20L7.5 14.5L11 22L14 20.5L10.5 13L18 13L2 2Z"
              fill="white" stroke="rgba(0,0,0,0.35)" strokeWidth="1" strokeLinejoin="round"/>
          </svg>
          {/* Hand / pointer */}
          <svg className="cursor-hand" width="22" height="26" viewBox="0 0 22 26" fill="none"
            style={{ display:'none', filter:'drop-shadow(0 1px 4px rgba(0,0,0,0.6))' }}>
            <path d="M4 13V7.5C4 6.67 4.67 6 5.5 6C6.33 6 7 6.67 7 7.5V11
                     C7 10.17 7.67 9.5 8.5 9.5C9.33 9.5 10 10.17 10 11V10.5
                     C10 9.67 10.67 9 11.5 9C12.33 9 13 9.67 13 10.5V11
                     C13 10.17 13.67 9.5 14.5 9.5C15.33 9.5 16 10.17 16 11
                     V17C16 20.31 13.31 23 10 23H9C6.24 23 4 20.76 4 18V13Z"
              fill="white" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8"/>
            <path d="M7 11V7.5C7 6.67 7.67 6 8.5 6C9.33 6 10 6.67 10 7.5V11"
              fill="white" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8"/>
          </svg>
        </div>

      </div>
    </>
  );
}
