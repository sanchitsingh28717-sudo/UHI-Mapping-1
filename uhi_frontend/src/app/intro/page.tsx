'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const TITLE_LINE1 = 'SPATIAL ANALYTICS &';
const TITLE_LINE2 = 'ADAPTIVE LAND-USE PLANNING';
const LOGO        = 'SANKALP';
const SUBTITLE    = 'A production-ready decision-support system designed for smart cities,\nenvironmental agencies, and policymakers to map, analyze,\nand mitigate microclimatic heat risks.';

export default function IntroPage() {
  const router = useRouter();

  const [pct,         setPct]         = useState(0);
  const [curtainOpen, setCurtainOpen] = useState(false);
  const [splashDone,  setSplashDone]  = useState(false);
  const [uiVisible,   setUiVisible]   = useState(false);
  const [clicked,     setClicked]     = useState(false);

  const dotRef   = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const mx = useRef(0), my = useRef(0);
  const ox = useRef(0), oy = useRef(0);
  const vMX = useRef(0), vMY = useRef(0);
  const vCX = useRef(0), vCY = useRef(0);
  const charsAnimated = useRef(false);
  const splashStarted = useRef(false);

  /* ── cursor + parallax loop ── */
  useEffect(() => {
    ox.current = window.innerWidth / 2;
    oy.current = window.innerHeight / 2;

    const onMove = (e: MouseEvent) => {
      mx.current = e.clientX; my.current = e.clientY;
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

  /* ── splash counter ── */
  const startSplash = () => {
    if (splashStarted.current) return;
    splashStarted.current = true;
    let cur = 0;
    const tick = setInterval(() => {
      cur = Math.min(cur + Math.floor(Math.random() * 12) + 3, 100);
      setPct(cur);
      if (cur >= 100) {
        clearInterval(tick);
        setTimeout(() => {
          setCurtainOpen(true);
          setTimeout(() => {
            setSplashDone(true);
            setUiVisible(true);
          }, 1800);
        }, 400);
      }
    }, 60);
  };

  /* ── video load ── */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.addEventListener('canplaythrough', () => { vid.play().catch(() => {}); startSplash(); }, { once: true });
    vid.addEventListener('error', startSplash, { once: true });
    const t = setTimeout(startSplash, 4000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── char animation ── */
  useEffect(() => {
    if (!uiVisible || charsAnimated.current) return;
    charsAnimated.current = true;

    document.querySelectorAll<HTMLElement>('.intro-char').forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(60px)';
      el.style.transition = `opacity 1.1s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.03}s,
                              transform 1.1s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.03}s`;
      requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
    });

    const sub = document.getElementById('intro-subtitle');
    if (sub) {
      Object.assign(sub.style, { opacity:'0', transform:'translateY(24px)',
        transition:'opacity 1.2s cubic-bezier(0.16,1,0.3,1) 1.4s, transform 1.2s cubic-bezier(0.16,1,0.3,1) 1.4s' });
      requestAnimationFrame(() => { sub.style.opacity = '1'; sub.style.transform = 'translateY(0)'; });
    }

    const cta = document.getElementById('intro-cta-slot');
    if (cta) {
      Object.assign(cta.style, { opacity:'0', transform:'translateY(20px)',
        transition:'opacity 1s cubic-bezier(0.16,1,0.3,1) 1.8s, transform 1s cubic-bezier(0.16,1,0.3,1) 1.8s' });
      requestAnimationFrame(() => { cta.style.opacity = '1'; cta.style.transform = 'translateY(0)'; });
    }
  }, [uiVisible]);

  /* ── CTA click → go to current landing page ── */
  const handleCta = () => {
    if (clicked) return;
    setClicked(true);
    setTimeout(() => router.push('/home'), 1600);
  };

  /* ── build title chars ── */
  const buildLine = (text: string) =>
    text.split('').map((ch, i) =>
      ch === ' '
        ? <span key={i} style={{ display:'inline-block', width:'0.25em' }} />
        : <span key={i} className="intro-char" style={{ display:'inline-block', opacity:0 }}>{ch}</span>
    );

  const pStr = String(pct).padStart(3, '0');

  return (
    <>
      <style>{`
        .intro-page *,
        .intro-page *::before,
        .intro-page *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .intro-page { cursor: none; }
        @keyframes intro-orbit-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes intro-cta-blink {
          0%{opacity:1}14%{opacity:0}28%{opacity:1}42%{opacity:0}56%{opacity:1}72%{opacity:0}100%{opacity:0}
        }
        .intro-cta-blink { animation: intro-cta-blink 0.2s steps(1,end) forwards; }
        .intro-cta-btn::before {
          content: "";
          position: absolute;
          top: -6px; left: -8px; right: -8px; bottom: -6px;
          pointer-events: none;
          background-image:
            linear-gradient(#fff,#fff),
            linear-gradient(#fff,#fff),
            linear-gradient(#fff,#fff),
            linear-gradient(#fff,#fff);
          background-size: 4px 4px;
          background-repeat: no-repeat;
          background-position: top left, top right, bottom left, bottom right;
          transition: top 0.3s ease, bottom 0.3s ease, left 0.3s ease, right 0.3s ease;
        }
        .intro-cta-btn:hover::before {
          top: -4px; left: -4px; right: -4px; bottom: -4px;
        }
      `}</style>

      <div
        className="intro-page"
        style={{
          position: 'fixed', inset: 0, width: '100%', height: '100%',
          overflow: 'hidden', background: '#000',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        {/* bg video */}
        <video
          ref={videoRef}
          autoPlay loop muted playsInline
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', zIndex: 0, pointerEvents: 'none',
          }}
        >
          <source src="/bg.mp4" type="video/mp4" />
        </video>

        {/* dark gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          background: [
            'linear-gradient(to bottom, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.42) 30%, rgba(0,0,0,0.42) 70%, rgba(0,0,0,0.88) 100%)',
            'radial-gradient(ellipse 95% 95% at 50% 50%, transparent 25%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.92) 100%)',
          ].join(', '),
        }} />

        {/* ── SPLASH ── */}
        {!splashDone && (
          <div style={{ position:'absolute', inset:0, zIndex:1000, overflow:'hidden', pointerEvents:'none' }}>
            {/* curtain top */}
            <div style={{
              position:'absolute', left:0, width:'100%', height:'50%', top:0,
              background:'#000', zIndex:3,
              transform: curtainOpen ? 'translateY(-100%)' : 'translateY(0)',
              transition: curtainOpen ? 'transform 1600ms cubic-bezier(0.65,0,0.35,1)' : 'none',
            }} />
            {/* curtain bottom */}
            <div style={{
              position:'absolute', left:0, width:'100%', height:'50%', bottom:0,
              background:'#000', zIndex:3,
              transform: curtainOpen ? 'translateY(100%)' : 'translateY(0)',
              transition: curtainOpen ? 'transform 1600ms cubic-bezier(0.65,0,0.35,1)' : 'none',
            }} />
            {/* logo */}
            <div style={{
              position:'absolute', top:'50%', left:'50%', zIndex:4,
              transform: curtainOpen ? 'translate(-50%,-60%)' : 'translate(-50%,-50%)',
              opacity: curtainOpen ? 0 : 1,
              transition:'opacity 0.6s ease, transform 0.6s ease',
              textAlign:'center',
            }}>
              <div style={{
                fontFamily:'"General Sans",sans-serif', fontWeight:500,
                fontSize:'clamp(36px,7vw,64px)', letterSpacing:'0.3em',
                color:'#fff', textTransform:'uppercase', paddingRight:'0.3em',
              }}>{LOGO}</div>
            </div>
            {/* counter */}
            <div style={{
              position:'absolute', top:'60%', left:'50%',
              transform:'translateX(-50%)',
              display:'flex', alignItems:'center',
              color:'#fff', fontFamily:'"JetBrains Mono",monospace',
              fontSize:'0.75rem', letterSpacing:'0.15em', opacity:0.7, zIndex:4,
            }}>
              {[pStr[0], pStr[1], pStr[2]].map((d, i) => (
                <span key={i} style={{ display:'inline-block', width:'1ch', height:'1.35em', overflow:'hidden' }}>
                  <span style={{ display:'block', textAlign:'center', lineHeight:'1.35em' }}>{d}</span>
                </span>
              ))}
              <span style={{ display:'inline-block', lineHeight:'1.35em', marginLeft:'0.15em' }}>%</span>
            </div>
          </div>
        )}

        {/* ── TOP LOGO ── */}
        <div style={{
          position:'absolute', top:36, left:'50%', transform:'translateX(-50%)',
          zIndex:500, pointerEvents:'none',
          opacity: uiVisible ? 1 : 0,
          transition:'opacity 1s ease',
        }}>
          <span style={{
            fontFamily:'"General Sans",sans-serif', fontWeight:500,
            fontSize:36, letterSpacing:'0.45em', color:'#fff',
            textTransform:'uppercase', paddingRight:'0.45em', whiteSpace:'nowrap',
          }}>{LOGO}</span>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{
          position:'absolute', top:'50%', left:'50%',
          transform:'translate(-50%,-50%)',
          textAlign:'center', zIndex:400,
          width:'100%', maxWidth:1100,
          padding:'0 clamp(24px,4vw,48px)',
          opacity: uiVisible ? 1 : 0,
          filter: clicked ? 'blur(14px)' : 'none',
          transition: uiVisible
            ? (clicked
                ? 'opacity 1.4s cubic-bezier(0.4,0,0.2,1), filter 1.4s cubic-bezier(0.4,0,0.2,1)'
                : 'opacity 3s ease 0.3s')
            : 'none',
          pointerEvents: uiVisible && !clicked ? 'auto' : 'none',
        }}>
          <h1 style={{
            fontFamily:'"General Sans",sans-serif', fontWeight:300,
            fontSize:'clamp(24px,4.2vw,52px)', lineHeight:1.1,
            textTransform:'uppercase', letterSpacing:'0.06em', color:'#fff',
            whiteSpace:'nowrap',
          }}>
            <div style={{ display:'block' }}>{buildLine(TITLE_LINE1)}</div>
            <div style={{ display:'block' }}>{buildLine(TITLE_LINE2)}</div>
          </h1>

          <p id="intro-subtitle" style={{
            fontFamily:'"General Sans",sans-serif', fontWeight:400,
            fontSize:'clamp(11px,1.3vw,14px)', textTransform:'uppercase',
            letterSpacing:'0.12em', marginTop:'2rem', color:'#C4C7C7',
            lineHeight:1.7, opacity:0, whiteSpace:'pre-line',
          }}>
            {SUBTITLE}
          </p>

          <div id="intro-cta-slot" style={{
            marginTop:'2.75rem', display:'flex',
            alignItems:'center', justifyContent:'center', opacity:0,
          }}>
            <div
              className={`intro-cta-btn${clicked ? ' intro-cta-blink' : ''}`}
              onClick={handleCta}
              style={{
                position:'relative', display:'inline-block',
                padding:'1.2rem 3rem', color:'#000',
                fontFamily:'"JetBrains Mono",monospace', fontWeight:500,
                fontSize:'0.75rem', letterSpacing:'0.1em',
                backgroundColor:'#fff', cursor:'none', userSelect:'none',
              }}
            >
              INITIATE SYSTEM
            </div>
          </div>
        </div>

        {/* ── HEADPHONES HINT ── */}
        <div style={{
          position:'absolute', bottom:40, left:0, right:0,
          display:'flex', flexDirection:'column', alignItems:'center',
          zIndex:400, pointerEvents:'none',
          opacity: uiVisible ? 1 : 0,
          filter: clicked ? 'blur(14px)' : 'none',
          transition: uiVisible
            ? (clicked
                ? 'opacity 1.4s cubic-bezier(0.4,0,0.2,1), filter 1.4s cubic-bezier(0.4,0,0.2,1)'
                : 'opacity 3s ease 0.3s')
            : 'none',
        }}>
          <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"
            style={{ display:'block', width:40, height:40, fill:'#C4C7C7', marginBottom:14 }}>
            <path d="M39.5,18.1c0.4-0.6,0.5-1.5,0.2-2.5l0-0.2c-0.9-3.8-3.6-15.2-19.6-15.3v0c0,0,0,0,0,0s0,0,0,0v0C4,0.2,1.3,11.7,0.4,15.4l0,0.2c-0.3,1.1-0.2,1.9,0.2,2.5c0.1,0.1,0.1,0.1,0.2,0.2c-0.7,5.9,0.7,11.7,0.8,12l0.1,0c1.3,5,2.8,7.9,4.7,9c0.7,0.4,1.4,0.5,2,0.5c0.3,0,0.6,0,0.9-0.1c0.4,0.1,0.9,0.1,1.4,0.1c1.3,0,2.9-0.3,4.4-1.2c2.1-1.5,3-4.7,2.3-8.6c-0.7-3.8-3.1-8.3-6.8-9.1c-2.8-0.6-4.9,0.6-6,1.5l-0.3-3.4c0,0,0.1,0,0.1-0.1c0.1-0.1,0.2-0.3,0.3-0.5C5.2,12.5,8.4,5.2,20,5.2c11.6,0,14.8,7.3,15.5,13.3c0,0.2,0.1,0.3,0.3,0.5c0,0,0.1,0,0.1,0.1l-0.3,3.4c-1.1-0.9-3.2-2.1-6-1.5c-3.6,0.8-6.1,5.3-6.8,9.1c-0.7,3.9,0.1,7.1,2.3,8.6c1.4,1,3.1,1.2,4.4,1.2c0.5,0,1,0,1.4-0.1c0.3,0,0.6,0.1,0.9,0.1c0.7,0,1.3-0.1,2-0.5c1.9-1.1,3.4-4,4.7-9l0.1,0c0.1-0.2,1.5-6.1,0.8-12C39.4,18.3,39.4,18.2,39.5,18.1z"/>
          </svg>
          <div style={{
            fontFamily:'"General Sans",sans-serif', fontWeight:400,
            fontSize:'clamp(11px,1.2vw,14px)', textTransform:'uppercase',
            letterSpacing:'0.12em', color:'#C4C7C7', opacity:0.8,
          }}>
            Experience with headphones
          </div>
        </div>

        {/* ── CUSTOM CURSOR ── */}
        <div ref={dotRef} style={{
          position:'fixed', width:5, height:5, background:'#fff',
          borderRadius:'50%', pointerEvents:'none', zIndex:100000,
          transform:'translate(-50%,-50%)', mixBlendMode:'difference',
        }} />
        <div ref={orbitRef} style={{
          position:'fixed', top:0, left:0, width:80, height:80,
          pointerEvents:'none', zIndex:99999,
          transform:'translate(-50%,-50%)',
        }}>
          <svg width="80" height="80" viewBox="0 0 80 80" style={{
            display:'block', mixBlendMode:'difference',
            animation:'intro-orbit-spin 6s linear infinite',
          }}>
            <circle cx="40" cy="40" r="38" fill="none"
              stroke="rgba(255,255,255,0.8)" strokeWidth="1"
              strokeLinecap="round" strokeDasharray="90 30"/>
          </svg>
        </div>
      </div>
    </>
  );
}
