'use client';

import React, { useEffect, useRef } from 'react';
import Script from 'next/script';

export default function HomePage() {
  /* ── refs ── */
  const videoRef         = useRef<HTMLVideoElement>(null);
  const videoRevRef      = useRef<HTMLVideoElement>(null);
  const introLogoRef     = useRef<HTMLDivElement>(null);
  const scroll1Ref       = useRef<HTMLDivElement>(null);
  const scroll2Ref       = useRef<HTMLDivElement>(null);
  const subtitleRef      = useRef<HTMLParagraphElement>(null);
  const ctaSlotRef       = useRef<HTMLDivElement>(null);
  const featuresLabelRef = useRef<HTMLParagraphElement>(null);
  const gsapReadyRef     = useRef(false);

  /* ── back-navigation: always reload /home ── */
  useEffect(() => {
    window.history.pushState({ home: true }, '', '/home');
    const onPopState  = () => window.location.replace('/home');
    const onPageShow  = (e: PageTransitionEvent) => { if (e.persisted) window.location.replace('/home'); };
    window.addEventListener('popstate',  onPopState);
    window.addEventListener('pageshow',  onPageShow);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('pageshow', onPageShow);
      gsapReadyRef.current = false;
    };
  }, []);

  /* ── main experience — fires once both GSAP scripts are loaded ── */
  function initScrollExperience() {
    if (gsapReadyRef.current) return;
    gsapReadyRef.current = true;

    const video    = videoRef.current!;
    const videoRev = videoRevRef.current!;
    const introLogo      = introLogoRef.current!;
    const scroll1Content = scroll1Ref.current!;
    const scroll2Content = scroll2Ref.current!;
    const subtitle       = subtitleRef.current!;
    const ctaSlot        = ctaSlotRef.current!;
    const featuresLabel  = featuresLabelRef.current!;
    const cards          = Array.from(document.querySelectorAll<HTMLElement>('.feature-card'));

    /* ── GSAP / SplitText ── */
    const win       = window as any;
    const gsap      = win.gsap;
    const SplitText = win.SplitText;
    gsap.registerPlugin(SplitText);

    const tubeLines     = document.querySelectorAll<HTMLElement>('.tube-line');
    const depth         = -window.innerWidth / 8;
    const transformOrigin = `50% 50% ${depth}px`;
    let splitLines: any[] = [];
    let titleTl: any     = null;

    /* card stagger timers */
    let cardInTimers:  ReturnType<typeof setTimeout>[] = [];
    let cardOutTimers: ReturnType<typeof setTimeout>[] = [];

    function clearCardTimers() {
      cardInTimers.forEach(clearTimeout);
      cardOutTimers.forEach(clearTimeout);
      cardInTimers  = [];
      cardOutTimers = [];
    }

    /* ── SplitText helpers ── */
    function initSplit() {
      splitLines.forEach(s => s.revert?.());
      splitLines = Array.from(tubeLines).map(l =>
        new SplitText(l, { type: 'chars', charsClass: 'char' })
      );
      gsap.set(tubeLines, { perspective: 700, transformStyle: 'preserve-3d' });
    }
    function startTitleAnim() {
      if (titleTl) titleTl.kill();
      initSplit();
      titleTl = gsap.timeline();
      splitLines.forEach((split, i) => {
        titleTl.fromTo(
          split.chars,
          { rotationX: -90, opacity: 0 },
          { rotationX: 0, opacity: 1, stagger: 0.04, duration: 0.7,
            ease: 'power3.out', transformOrigin },
          i * 0.15
        );
      });
    }
    function stopTitleAnim() {
      if (titleTl) { titleTl.kill(); titleTl = null; }
      gsap.set(tubeLines, { clearProps: 'all' });
      splitLines.forEach(s => s.revert?.());
      splitLines = [];
    }

    /* ── Scroll 1 show / hide ── */
    function showScroll1() {
      introLogo.style.opacity            = '0';
      scroll1Content.style.opacity       = '1';
      scroll1Content.style.pointerEvents = 'auto';
      /* hide top-right nav on scroll1 */
      const topNav = document.getElementById('top-nav');
      if (topNav) { topNav.style.opacity = '0'; topNav.style.pointerEvents = 'none'; topNav.style.transition = 'opacity 0.4s ease'; }
      startTitleAnim();
      Object.assign(subtitle.style, {
        opacity: '0', transform: 'translateY(24px)',
        transition: 'opacity 1.2s cubic-bezier(0.16,1,0.3,1) 0.8s, transform 1.2s cubic-bezier(0.16,1,0.3,1) 0.8s',
      });
      requestAnimationFrame(() => { subtitle.style.opacity = '1'; subtitle.style.transform = 'translateY(0)'; });
      Object.assign(ctaSlot.style, {
        opacity: '0', transform: 'translateY(20px)',
        transition: 'opacity 1s cubic-bezier(0.16,1,0.3,1) 1.2s, transform 1s cubic-bezier(0.16,1,0.3,1) 1.2s',
      });
      requestAnimationFrame(() => { ctaSlot.style.opacity = '1'; ctaSlot.style.transform = 'translateY(0)'; });
    }
    function hideScroll1(showLogo = false) {
      scroll1Content.style.opacity       = '0';
      scroll1Content.style.pointerEvents = 'none';
      introLogo.style.opacity = showLogo ? '1' : '0';
      /* restore top-right nav when leaving scroll1 */
      const topNav = document.getElementById('top-nav');
      if (topNav) { topNav.style.opacity = '1'; topNav.style.pointerEvents = 'auto'; topNav.style.transition = 'opacity 0.4s ease'; }
      stopTitleAnim();
      subtitle.style.transition = 'none'; subtitle.style.opacity = '0';
      ctaSlot.style.transition  = 'none'; ctaSlot.style.opacity  = '0';
    }

    /* ── Scroll 2 show / hide with staggered card animations ── */
    function showScroll2() {
      clearCardTimers();
      introLogo.style.opacity            = '0';
      scroll2Content.style.opacity       = '1';
      scroll2Content.style.pointerEvents = 'auto';

      /* label fades in immediately */
      requestAnimationFrame(() => {
        featuresLabel.style.opacity   = '1';
        featuresLabel.style.transform = 'translateY(0)';
      });

      /* cards: 1 → 6, 750ms apart, rise from 60px below */
      cards.forEach((card, i) => {
        /* reset before animating in */
        card.style.transition = 'none';
        card.style.opacity    = '0';
        card.style.transform  = 'translateY(60px)';

        const t = setTimeout(() => {
          requestAnimationFrame(() => {
            card.style.transition = 'opacity 0.65s cubic-bezier(0.16,1,0.3,1), transform 0.65s cubic-bezier(0.16,1,0.3,1)';
            card.style.opacity    = '1';
            card.style.transform  = 'translateY(0)';
            card.classList.add('visible');
          });
        }, i * 750);
        cardInTimers.push(t);
      });
    }

    function hideScroll2(immediate = false) {
      clearCardTimers();
      featuresLabel.style.opacity   = '0';
      featuresLabel.style.transform = 'translateY(16px)';

      if (immediate) {
        /* instant reset — used when jumping forward past scroll2 */
        cards.forEach(card => {
          card.style.transition = 'none';
          card.style.opacity    = '0';
          card.style.transform  = 'translateY(60px)';
          card.classList.remove('visible');
        });
        scroll2Content.style.opacity       = '0';
        scroll2Content.style.pointerEvents = 'none';
        return;
      }

      /* reverse: card 6 → 1, 833ms apart, drop back to 60px */
      const reversed = [...cards].reverse();
      reversed.forEach((card, i) => {
        const t = setTimeout(() => {
          requestAnimationFrame(() => {
            card.style.transition = 'opacity 0.55s cubic-bezier(0.4,0,1,1), transform 0.55s cubic-bezier(0.4,0,1,1)';
            card.style.opacity    = '0';
            card.style.transform  = 'translateY(60px)';
            card.classList.remove('visible');
          });
        }, i * 833);
        cardOutTimers.push(t);
      });

      /* hide the container only after all cards are done (5s total) */
      const finalT = setTimeout(() => {
        scroll2Content.style.opacity       = '0';
        scroll2Content.style.pointerEvents = 'none';
      }, reversed.length * 833 + 600);
      cardOutTimers.push(finalT);
    }

    /* ── Video segment timing ── */
    const FWD: [number, number][] = [[0, 4], [4, 8], [8, 13], [13, 17]];
    const TOTAL = 17.35;
    const REV: [number, number][] = [
      [TOTAL - FWD[1][1], TOTAL - FWD[1][0]],
      [TOTAL - FWD[2][1], TOTAL - FWD[2][0]],
      [TOTAL - FWD[3][1], TOTAL - FWD[3][0]],
    ];

    let current = 0;
    let busy    = false;
    let pending = 0;

    function watchFrame(vid: HTMLVideoElement, end: number, onDone: () => void) {
      function check() {
        if (vid.currentTime >= end - 0.05) {
          vid.pause();
          video.playbackRate    = 1;
          videoRev.playbackRate = 1;
          onDone();
        } else {
          vid.requestVideoFrameCallback(check);
        }
      }
      vid.requestVideoFrameCallback(check);
    }

    /* Autoplay intro 0 → 4s */
    video.style.opacity    = '1';
    videoRev.style.opacity = '0';
    video.currentTime      = 0;
    busy = true;
    video.play().catch(() => {});
    watchFrame(video, 4, () => {
      current = 1; busy = false;
      if (pending !== 0) { const d = pending; pending = 0; if (d > 0) playForward(); else playBackward(); }
    });

    function playForward() {
      if (busy || current > 3) return;
      const [start, end] = FWD[current];
      busy = true;

      /* current = segment index about to play
         1 = 4s→8s   → show scroll1
         2 = 8s→13s  → show scroll2
         3 = 13s→17s → hide both               */
      if (current === 1)      { showScroll1(); hideScroll2(true); }
      else if (current === 2) { hideScroll1(false); showScroll2(); }
      else                    { hideScroll1(false); hideScroll2(true); }

      if (Math.abs(video.currentTime - start) > 0.3) video.currentTime = start;
      video.playbackRate = 1;
      video.play().then(() => { video.playbackRate = 1; }).catch(() => {});
      watchFrame(video, end, () => {
        current++; busy = false;
        if (pending !== 0) { const d = pending; pending = 0; if (d > 0) playForward(); else playBackward(); }
      });
    }

    function playBackward() {
      if (busy || current <= 1) return;
      const [revStart, revEnd] = REV[current - 2];
      busy = true;
      videoRev.playbackRate = 1;
      const fwdLanding = FWD[current - 1][0];

      /* kick off card-out animation immediately when reverse starts from scroll2 */
      if (current === 3) {
        hideScroll2(false);
        hideScroll1(false); // ensure scroll1 is hidden so it fades in cleanly at end
      }
      /* coming back from segment 4 (post-scroll2) — scroll2 is already hidden */
      if (current === 4) {
        hideScroll2(true);
        hideScroll1(false);
      }

      videoRev.currentTime = revStart;
      videoRev.onseeked = () => {
        videoRev.onseeked    = null;
        videoRev.style.opacity = '1';
        video.style.opacity    = '0';
        videoRev.play().catch(() => {});
        video.currentTime = fwdLanding;

        watchFrame(videoRev, revEnd, () => {
          current--;
          /* current now = the segment we've landed on
             1 = intro logo
             2 = scroll1 (title + SIGN IN/UP)
             3 = scroll2 (feature cards)
             4 = after scroll2 (blank)            */
          if (current === 1)      { hideScroll1(true);  hideScroll2(true); }
          else if (current === 2) { showScroll1();       hideScroll2(true); }
          else if (current === 3) { hideScroll1(false);  showScroll2(); }

          videoRev.pause();
          video.currentTime = fwdLanding;
          video.onseeked = () => {
            video.onseeked         = null;
            video.style.opacity    = '1';
            videoRev.style.opacity = '0';
            busy = false;
            if (pending !== 0) { const d = pending; pending = 0; if (d > 0) playForward(); else playBackward(); }
          };
        });
      };
    }

    /* Wheel */
    let wheelAccum     = 0;
    let scrollCooldown = false;
    window.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (scrollCooldown) return;
      wheelAccum += e.deltaY;
      if (wheelAccum >= 150) {
        wheelAccum = 0; scrollCooldown = true;
        setTimeout(() => { scrollCooldown = false; }, 800);
        if (busy) { video.playbackRate = 4; videoRev.playbackRate = 4; pending = 1; }
        else { playForward(); }
      } else if (wheelAccum <= -150) {
        wheelAccum = 0; scrollCooldown = true;
        setTimeout(() => { scrollCooldown = false; }, 800);
        if (busy) { video.playbackRate = 4; videoRev.playbackRate = 4; pending = -1; }
        else { playBackward(); }
      }
    }, { passive: false });

    /* Touch */
    let touchY = 0;
    window.addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
    window.addEventListener('touchend',   e => {
      const dy = touchY - e.changedTouches[0].clientY;
      if (dy > 40) playForward();
      if (dy < -40) playBackward();
    }, { passive: true });
  }

  const scriptsLoadedRef = useRef(0);
  function onScriptLoad() {
    scriptsLoadedRef.current += 1;
    if (scriptsLoadedRef.current === 2) initScrollExperience();
  }

  return (
    <>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"
        strategy="afterInteractive" onLoad={onScriptLoad} />
      <Script src="https://assets.codepen.io/16327/SplitText3.min.js"
        strategy="afterInteractive" onLoad={onScriptLoad} />

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; overflow: hidden; background: #000; -webkit-font-smoothing: antialiased; }

        /* ── Video bg ── */
        .video-bg { position: fixed; inset: 0; z-index: 0; }
        .video-bg video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
        .video-bg::after { content: ''; position: absolute; inset: 0; z-index: 1; background: rgba(0,0,0,0.2); }

        /* ── Intro logo ── */
        .logo-wrap {
          position: fixed; inset: 0; z-index: 2;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 0.6rem; pointer-events: none; transition: opacity 0.8s ease;
        }
        .logo-name {
          font-family: 'Montserrat', sans-serif; font-weight: 300;
          font-size: clamp(4rem, 10vw, 9rem); letter-spacing: 0.35em;
          text-transform: uppercase; color: #fff; line-height: 1;
        }
        .logo-rule { width: clamp(60px, 8vw, 120px); height: 1px; background: rgba(255,255,255,0.5); }
        .logo-sub {
          font-family: 'Montserrat', sans-serif; font-weight: 300;
          font-size: clamp(0.55rem, 1vw, 0.8rem); letter-spacing: 0.4em;
          text-transform: uppercase; color: rgba(255,255,255,0.55);
        }

        /* ── CTA corner-dot button ── */
        .intro-cta-btn {
          position: relative; display: inline-block; padding: 1.2rem 3rem;
          font-family: 'JetBrains Mono', monospace; font-weight: 500;
          font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase;
          cursor: pointer; user-select: none;
        }
        .intro-cta-btn::before {
          content: ""; position: absolute;
          top: -6px; left: -8px; right: -8px; bottom: -6px;
          pointer-events: none;
          background-image:
            linear-gradient(currentColor,currentColor), linear-gradient(currentColor,currentColor),
            linear-gradient(currentColor,currentColor), linear-gradient(currentColor,currentColor);
          background-size: 4px 4px; background-repeat: no-repeat;
          background-position: top left, top right, bottom left, bottom right;
          transition: top 0.3s ease, bottom 0.3s ease, left 0.3s ease, right 0.3s ease;
        }
        .intro-cta-btn:hover::before { top: -4px; left: -4px; right: -4px; bottom: -4px; }

        .intro-cta-btn-mint:hover {
          background: #a7cecd !important;
          color: #0f172a !important;
          border-color: #a7cecd !important;
        }

        /* ── Scroll 1 ── */
        #scroll1-content {
          position: fixed; inset: 0; z-index: 2;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center; padding: 0 clamp(24px,4vw,48px);
          pointer-events: none; opacity: 0;
        }

        /* ── Tube lines ── */
        .tube-wrap { width: 100%; display: flex; align-items: center; justify-content: center; }
        .tube { position: relative; width: 100%; height: 16vw; }
        .tube-line {
          position: absolute; width: 100%; left: 50%; transform: translateX(-50%);
          line-height: 1; margin: 0; letter-spacing: -0.02em;
          font-size: clamp(24px,4.2vw,52px); white-space: nowrap; text-align: center;
          font-family: 'General Sans', sans-serif; font-weight: 300;
          text-transform: uppercase; color: #fff;
          text-shadow: 0 0 40px rgba(255,255,255,0.4);
        }
        #tube-line1 { top: 30%; }
        #tube-line2 { top: 65%; }
        .tube-line div { backface-visibility: hidden; }

        /* ── Scroll 2 container ── */
        #scroll2-content {
          position: fixed; inset: 0; z-index: 2;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 80px 5vw 40px;
          pointer-events: none; opacity: 0;
          transition: opacity 0.5s ease;
        }

        /* ── Features label ── */
        .features-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: clamp(9px,0.85vw,11px); font-weight: 500;
          letter-spacing: 0.3em; text-transform: uppercase; color: #b7e6d4;
          margin-bottom: 3vh; opacity: 0; transform: translateY(16px);
          transition: opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s;
        }

        /* ── Features grid ── */
        .features-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 1.6vh 1.8vw; width: 90%; max-width: 1380px; height: 60vh;
        }

        /* ── Feature card — new mint-green style ── */
        .feature-card {
          opacity: 0;
          transform: translateY(60px);
          /* transition is set dynamically in JS */
          border-radius: 18px;
          border: 1px solid #b7e6d4;
          box-shadow:
            0 0 18px rgba(183, 230, 212, 0.18),
            inset 0 0 24px rgba(183, 230, 212, 0.04);
          padding: 3vh 2.2vw;
          display: flex; flex-direction: column; gap: 1.4vh;
          position: relative; overflow: hidden;
          background: rgba(5, 12, 14, 0.30);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        /* shimmer sweep across top on entrance */
        .feature-card::before {
          content: ''; position: absolute; top: 0; left: -120%;
          width: 70%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(183,230,212,0.75), transparent);
          transition: none;
        }
        .feature-card.visible::before {
          left: 150%;
          transition: left 0.75s ease 0.1s;
        }

        .feature-num {
          font-family: 'JetBrains Mono', monospace;
          font-size: clamp(10px,0.75vw,12px); font-weight: 400;
          letter-spacing: 0.2em; color: rgba(183,230,212,0.45);
        }
        .feature-title {
          font-family: 'General Sans', sans-serif; font-weight: 500;
          font-size: clamp(18px,1.9vw,26px); color: #e8f8f4;
          letter-spacing: 0.01em; line-height: 1.25;
        }
        .feature-desc {
          font-family: 'General Sans', sans-serif; font-weight: 400;
          font-size: clamp(13px,1.25vw,17px); color: rgba(200,230,222,0.72);
          line-height: 1.75; letter-spacing: 0.01em; margin-top: auto;
        }
      `}</style>

      {/* ── FIXED TOP-RIGHT NAV — visible on all 3 scroll states ── */}
      <div id="top-nav" style={{
        position: 'fixed', top: 28, right: 36,
        zIndex: 1000,
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        pointerEvents: 'auto',
        opacity: 1,
        transition: 'opacity 0.4s ease',
      }}>
        {/* SIGN IN */}
        <button
          onClick={() => { window.location.href = '/login'; }}
          style={{
            padding: '0.6rem 1.4rem',
            background: 'transparent',
            border: '1px solid #a7cecd',
            borderRadius: '12px',
            color: '#a7cecd',
            fontFamily: '"General Sans", sans-serif',
            fontWeight: 700,
            fontSize: '0.78rem',
            letterSpacing: '0.04em',
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s, border-color 0.2s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background  = '#a7cecd';
            b.style.color       = '#0f172a';
            b.style.borderColor = '#a7cecd';
          }}
          onMouseLeave={e => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background  = 'transparent';
            b.style.color       = '#a7cecd';
            b.style.borderColor = '#a7cecd';
          }}
        >
          Sign In
        </button>

        {/* SIGN UP */}
        <button
          onClick={() => { window.location.href = '/register'; }}
          style={{
            padding: '0.6rem 1.4rem',
            background: 'transparent',
            border: '1px solid #a7cecd',
            borderRadius: '12px',
            color: '#a7cecd',
            fontFamily: '"General Sans", sans-serif',
            fontWeight: 700,
            fontSize: '0.78rem',
            letterSpacing: '0.04em',
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s, border-color 0.2s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background  = '#a7cecd';
            b.style.color       = '#0f172a';
            b.style.borderColor = '#a7cecd';
          }}
          onMouseLeave={e => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background  = 'transparent';
            b.style.color       = '#a7cecd';
            b.style.borderColor = '#a7cecd';
          }}
        >
          Sign Up
        </button>
      </div>

      {/* ── Video background ── */}
      <div className="video-bg">
        <video ref={videoRef} id="bgVideo" muted playsInline preload="auto" style={{ opacity: 1 }}>
          <source src="/home-video.mp4" type="video/mp4" />
        </video>
        <video ref={videoRevRef} id="bgVideoRev" muted playsInline preload="auto" style={{ opacity: 0 }}>
          <source src="/home-video-reverse.mp4" type="video/mp4" />
        </video>
      </div>

      {/* ── Intro logo (0s → 4s) ── */}
      <div className="logo-wrap" ref={introLogoRef} id="introLogo">
        <h1 className="logo-name">
          SANKAL
          <span style={{ fontFamily:"'Helvetica Neue',Helvetica,Arial,sans-serif", fontWeight:300, display:'inline-block', transform:'scaleX(0.82)', transformOrigin:'left' }}>P</span>
        </h1>
        <div className="logo-rule" />
        <p className="logo-sub">Spatial Analytics &amp; Adaptive Land-Use Planning</p>
      </div>

      {/* ── Scroll 1 (4s → 8s) ── */}
      <div id="scroll1-content" ref={scroll1Ref}>
        <div style={{ position:'absolute', top:36, left:'50%', transform:'translateX(-50%)', pointerEvents:'none', whiteSpace:'nowrap' }}>
          <span style={{ fontFamily:"'General Sans',sans-serif", fontWeight:500, fontSize:36, letterSpacing:'0.45em', color:'#fff', textTransform:'uppercase', paddingRight:'0.45em' }}>SANKALP</span>
        </div>

        <div className="tube-wrap">
          <div className="tube" id="titleTube">
            <h1 className="tube-line" id="tube-line1">SPATIAL ANALYTICS &amp;</h1>
            <h1 className="tube-line" id="tube-line2">ADAPTIVE LAND-USE PLANNING</h1>
          </div>
        </div>

        <p ref={subtitleRef} id="intro-subtitle" style={{
          fontFamily:"'General Sans',sans-serif", fontWeight:400,
          fontSize:'clamp(11px,1.3vw,14px)', textTransform:'uppercase',
          letterSpacing:'0.12em', marginTop:'2rem',
          color:'#e8eaea', lineHeight:1.7, opacity:0, whiteSpace:'pre-line',
        }}>{'A production-ready decision-support system designed for smart cities,\nenvironmental agencies, and policymakers to map, analyze,\nand mitigate microclimatic heat risks.'}</p>

        <div ref={ctaSlotRef} id="intro-cta-slot" style={{ marginTop:'2.75rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'1rem', opacity:0, pointerEvents:'auto' }}>
          <div className="intro-cta-btn intro-cta-btn-mint" style={{ background:'transparent', color:'#a7cecd', border:'1px solid #a7cecd', transition:'background 0.2s, color 0.2s, border-color 0.2s' }}
            onClick={() => { window.location.href = '/login'; }}>SIGN IN</div>
          <div className="intro-cta-btn intro-cta-btn-mint" style={{ background:'transparent', color:'#a7cecd', border:'1px solid #a7cecd', transition:'background 0.2s, color 0.2s, border-color 0.2s' }}
            onClick={() => { window.location.href = '/register'; }}>SIGN UP</div>
        </div>
      </div>

      {/* ── Scroll 2 (8s → 13s) ── */}
      <div id="scroll2-content" ref={scroll2Ref}>
        <div style={{ position:'absolute', top:36, left:'50%', transform:'translateX(-50%)', pointerEvents:'none', whiteSpace:'nowrap' }}>
          <span style={{ fontFamily:"'General Sans',sans-serif", fontWeight:500, fontSize:36, letterSpacing:'0.45em', color:'#fff', textTransform:'uppercase', paddingRight:'0.45em' }}>SANKALP</span>
        </div>

        <p className="features-label" ref={featuresLabelRef} id="features-label">
          Platform Architecture &amp; Capabilities
        </p>

        <div className="features-grid">
          {[
            { num:'01', title:'UHI Hotspot Intelligence',         desc:'Load the trained XGBoost model directly, query satellite indexes (NDVI, NDBI, NDWI) and predict heat zones on the fly.' },
            { num:'02', title:'Explainable AI (SHAP)',             desc:'Inspect pixel-level drivers of local heat accumulation. View exact SHAP contribution charts for each target coordinate.' },
            { num:'03', title:'AI Mitigation Recommendations',    desc:'Generate actionable cool roof coatings, Miyawaki forestry, and permeable paver installation guidelines via Google Gemini.' },
            { num:'04', title:'Wind Ventilation (CFD-Net)',        desc:'Estimate log wind profile street velocities using real DEM slope and roughness lengths to recommend building height offsets.' },
            { num:'05', title:'Groundwater Restoration (Geo-GAN)',desc:'Locate permeability vectors and coordinate optimal drilling locations for artificial deep recharge shafts.' },
            { num:'06', title:'Executive Report Export',          desc:'Export traceable, reproducible PDF planning briefs with complete timestamps, model versions, and environmental metrics.' },
          ].map(f => (
            <div key={f.num} className="feature-card">
              <div className="feature-title">{f.title}</div>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
