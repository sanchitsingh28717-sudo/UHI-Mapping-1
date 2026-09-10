'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  const dotRef   = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const mx = useRef(0), my = useRef(0);
  const ox = useRef(0), oy = useRef(0);
  const vMX = useRef(0), vMY = useRef(0);
  const vCX = useRef(0), vCY = useRef(0);

  /* ── cursor + parallax loop ── */
  useEffect(() => {
    ox.current = window.innerWidth / 2;
    oy.current = window.innerHeight / 2;

    const onMove = (e: MouseEvent) => {
      mx.current = e.clientX;
      my.current = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.left = e.clientX + 'px';
        dotRef.current.style.top  = e.clientY + 'px';
      }
      vMX.current = e.clientX / window.innerWidth  - 0.5;
      vMY.current = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('mousemove', onMove);

    let raf: number;
    const loop = () => {
      ox.current += (mx.current - ox.current) * 0.12;
      oy.current += (my.current - oy.current) * 0.12;
      if (orbitRef.current) {
        orbitRef.current.style.left = ox.current + 'px';
        orbitRef.current.style.top  = oy.current + 'px';
      }
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
    if (!username || !email || !password) {
      setError('Username, Email, and Password are required.');
      return;
    }
    setLoading(true);
    setError(null);
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

  /* ── shared input style ── */
  const inputStyle: React.CSSProperties = {
    width: '100%',
    paddingLeft: '2.2rem', paddingRight: '0.85rem',
    paddingTop: '0.6rem', paddingBottom: '0.6rem',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '0.8rem',
    fontFamily: '"General Sans", sans-serif',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.62rem',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.45)',
    marginBottom: '0.4rem',
  };

  const iconWrap: React.CSSProperties = {
    position: 'absolute', left: '0.65rem', top: '50%',
    transform: 'translateY(-50%)',
    color: 'rgba(255,255,255,0.3)',
    display: 'flex', alignItems: 'center',
    pointerEvents: 'none',
  };

  return (
    <>
      <style>{`
        .register-root, .register-root * { cursor: none !important; }
        @keyframes orbit-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      <div className="register-root" style={{
        position: 'fixed', inset: 0,
        width: '100%', height: '100%',
        overflow: 'hidden', background: '#000',
        WebkitFontSmoothing: 'antialiased',
      }}>

        {/* ── BG VIDEO ── */}
        <video
          ref={videoRef}
          autoPlay loop muted playsInline
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', zIndex: 0,
            pointerEvents: 'none',
          }}
        >
          <source src="/bg.mp4" type="video/mp4" />
        </video>

        {/* ── DARK GRADIENT OVERLAY ── */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          background: [
            'linear-gradient(to bottom, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.42) 30%, rgba(0,0,0,0.42) 70%, rgba(0,0,0,0.88) 100%)',
            'radial-gradient(ellipse 95% 95% at 50% 50%, transparent 25%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.92) 100%)',
          ].join(', '),
        }} />

        {/* ── SCROLLABLE FORM AREA ── */}
        <div style={{
          position: 'absolute', inset: 0,
          zIndex: 10,
          overflowY: 'auto',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '2rem 1rem',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '460px',
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '16px',
            padding: '2.25rem 2rem',
            boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
            margin: 'auto',
          }}>

            {/* Header */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.75rem' }}>
              {/* SANKALP SVG Logo — same as login */}
              <div style={{ marginBottom: '0.75rem' }}>
                <svg width="52" height="52" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="28" cy="28" r="27" stroke="#a7cecd" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.6"/>
                  <circle cx="28" cy="28" r="20" stroke="#a7cecd" strokeWidth="1" opacity="0.3"/>
                  <rect x="25" y="12" width="6" height="22" rx="3" fill="#a7cecd" opacity="0.9"/>
                  <circle cx="28" cy="36" r="6" fill="#a7cecd"/>
                  <rect x="26.5" y="22" width="3" height="14" rx="1.5" fill="rgba(0,0,0,0.35)"/>
                  <line x1="31" y1="18" x2="33.5" y2="18" stroke="#a7cecd" strokeWidth="1.2" strokeLinecap="round"/>
                  <line x1="31" y1="22" x2="33.5" y2="22" stroke="#a7cecd" strokeWidth="1.2" strokeLinecap="round"/>
                  <line x1="31" y1="26" x2="34" y2="26" stroke="#a7cecd" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="31" y1="30" x2="33.5" y2="30" stroke="#a7cecd" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
              <h1 style={{
                fontFamily: '"General Sans", sans-serif',
                fontWeight: 600,
                fontSize: '1.25rem',
                letterSpacing: '0.04em',
                color: '#fff',
                textAlign: 'center',
              }}>Create Account</h1>
              <p style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.62rem',
                letterSpacing: '0.18em',
                color: 'rgba(255,255,255,0.35)',
                marginTop: '0.3rem',
                textTransform: 'uppercase',
              }}>SANKALP</p>
            </div>

            {/* Success banner */}
            {success ? (
              <div style={{
                padding: '1rem',
                background: 'rgba(16,185,129,0.15)',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: '10px',
                color: '#6ee7b7',
                fontFamily: '"General Sans", sans-serif',
                fontSize: '0.8rem',
                letterSpacing: '0.04em',
                textAlign: 'center',
              }}>
                Account registered successfully! Redirecting to login…
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {error && (
                  <div style={{
                    padding: '0.7rem 0.9rem',
                    background: 'rgba(244,63,94,0.15)',
                    border: '1px solid rgba(244,63,94,0.3)',
                    borderRadius: '10px',
                    color: '#fda4af',
                    fontSize: '0.75rem',
                    fontFamily: '"General Sans", sans-serif',
                    letterSpacing: '0.04em',
                  }}>{error}</div>
                )}

                {/* First / Last name row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>First Name</label>
                    <input
                      type="text" value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="First name"
                      style={{ ...inputStyle, paddingLeft: '0.85rem' }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.6)')}
                      onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Last Name</label>
                    <input
                      type="text" value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="Last name"
                      style={{ ...inputStyle, paddingLeft: '0.85rem' }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.6)')}
                      onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label style={labelStyle}>Username</label>
                  <div style={{ position: 'relative' }}>
                    <span style={iconWrap}><User size={15} /></span>
                    <input
                      type="text" value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="Choose unique username"
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.6)')}
                      onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <span style={iconWrap}><Mail size={15} /></span>
                    <input
                      type="email" value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your.email@gov.in"
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.6)')}
                      onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <span style={iconWrap}><Lock size={15} /></span>
                    <input
                      type="password" value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.6)')}
                      onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                    />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label style={labelStyle}>Administrative Role</label>
                  <div style={{ position: 'relative' }}>
                    <span style={iconWrap}><Users size={15} /></span>
                    <select
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      style={{
                        ...inputStyle,
                        appearance: 'none',
                        WebkitAppearance: 'none',
                      }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.6)')}
                      onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                    >
                      <option value="GUEST"   style={{ background: '#111', color: '#fff' }}>Guest Viewer (Read-only)</option>
                      <option value="PLANNER" style={{ background: '#111', color: '#fff' }}>Urban Planner (Mitigation Engine Access)</option>
                      <option value="ANALYST" style={{ background: '#111', color: '#fff' }}>Research Analyst (Dataset Upload + ML)</option>
                      <option value="ADMIN"   style={{ background: '#111', color: '#fff' }}>System Administrator (Full access)</option>
                    </select>
                  </div>
                </div>

                {/* Submit — matches aquifer page button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    marginTop: '0.25rem',
                    background: loading ? 'rgba(167,206,205,0.4)' : '#a7cecd',
                    border: '1px solid transparent',
                    borderRadius: '12px',
                    color: '#0f172a',
                    fontFamily: '"General Sans", sans-serif',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    letterSpacing: '0.03em',
                    transition: 'background 0.2s, color 0.2s, border-color 0.2s',
                    boxShadow: loading ? 'none' : '0 8px 24px rgba(167,206,205,0.25)',
                    opacity: loading ? 0.6 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!loading) {
                      const b = e.currentTarget as HTMLButtonElement;
                      b.style.background = 'rgba(0,0,0,0.6)';
                      b.style.color = '#a7cecd';
                      b.style.borderColor = '#a7cecd';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!loading) {
                      const b = e.currentTarget as HTMLButtonElement;
                      b.style.background = '#a7cecd';
                      b.style.color = '#0f172a';
                      b.style.borderColor = 'transparent';
                    }
                  }}
                >
                  {loading ? 'Registering Account...' : 'Register Profile'}
                </button>
              </form>
            )}

            {/* Footer link */}
            <div style={{
              marginTop: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              textAlign: 'center',
            }}>
              <p style={{
                fontFamily: '"General Sans", sans-serif',
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.35)',
                letterSpacing: '0.04em',
              }}>
                Already have an account?{' '}
                <Link href="/login" style={{ color: 'rgba(52,211,153,0.9)', textDecoration: 'none', fontWeight: 600 }}>
                  Sign In
                </Link>
              </p>
            </div>

          </div>
        </div>

        {/* ── CUSTOM CURSOR DOT ── */}
        <div ref={dotRef} style={{
          position: 'fixed',
          width: 5, height: 5,
          background: '#fff',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 100000,
          transform: 'translate(-50%,-50%)',
          mixBlendMode: 'difference',
          top: 0, left: 0,
        }} />

        {/* ── CUSTOM CURSOR ORBIT ── */}
        <div ref={orbitRef} style={{
          position: 'fixed',
          top: 0, left: 0,
          width: 80, height: 80,
          pointerEvents: 'none',
          zIndex: 99999,
          transform: 'translate(-50%,-50%)',
        }}>
          <svg width="80" height="80" viewBox="0 0 80 80" style={{
            display: 'block',
            mixBlendMode: 'difference',
            animation: 'orbit-spin 6s linear infinite',
          }}>
            <circle cx="40" cy="40" r="38"
              fill="none"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="1"
              strokeLinecap="round"
              strokeDasharray="90 30" />
          </svg>
        </div>

      </div>
    </>
  );
}
