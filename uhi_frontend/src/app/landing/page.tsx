'use client';

import { useEffect, useRef, useState } from 'react';
import './landing.css';

export default function LandingPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  /* ── Scroll tracking for parallax + video scrubbing ── */
  useEffect(() => {
    const handleScroll = () => {
      const sy = window.scrollY;
      setScrollY(sy);

      // Scrub video time based on scroll position
      if (videoRef.current) {
        const video = videoRef.current;
        const maxScroll = document.body.scrollHeight - window.innerHeight;
        const progress = Math.min(sy / (maxScroll * 0.6), 1);
        if (video.duration && isFinite(video.duration)) {
          video.currentTime = progress * video.duration;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* ── Subtle mouse parallax on hero ── */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  /* ── Pause video so we scrub manually ── */
  const handleVideoLoaded = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setVideoLoaded(true);
    }
  };

  const videoParallaxY = scrollY * 0.4;
  const heroOpacity = Math.max(0, 1 - scrollY / 500);
  const heroBlur = Math.min(scrollY / 100, 8);
  const heroTranslateY = scrollY * 0.25;

  return (
    <div className="landing-root">

      {/* NAV */}
      <nav className="landing-nav">
        <div className="nav-logo">SANKALP</div>
        <div className="nav-links">
          <a href="#about">About</a>
          <a href="#features">Features</a>
          <a href="/intro" className="nav-cta">Launch App</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="landing-hero" ref={heroRef}>
        <div
          className="video-wrapper"
          style={{
            transform: `translate(${mousePos.x * -10}px, calc(${mousePos.y * -8}px + ${videoParallaxY}px)) scale(1.15)`,
          }}
        >
          <video
            ref={videoRef}
            className="hero-video"
            src="/hero-video.mov"
            playsInline
            muted
            preload="auto"
            onLoadedData={handleVideoLoaded}
            onCanPlayThrough={handleVideoLoaded}
          />
          {!videoLoaded && <div className="video-loading-shimmer" />}
        </div>

        <div className="hero-overlay" />
        <div className="hero-grain" />

        <div
          className="hero-content"
          style={{
            opacity: heroOpacity,
            filter: `blur(${heroBlur}px)`,
            transform: `translateY(${heroTranslateY}px)`,
          }}
        >
          <div className="hero-eyebrow">
            <span className="eyebrow-dot" />
            <span>Urban Heat Intelligence</span>
          </div>

          <h1 className="hero-title">
            <span className="hero-title-line">See the Heat.</span>
            <span className="hero-title-line hero-title-accent">Feel the Future.</span>
          </h1>

          <p className="hero-subtitle">
            AI-powered spatial analytics revealing Urban Heat Islands at the
            intersection of data, science, and design.
          </p>

          <div className="hero-cta-group">
            <a href="/intro" className="cta-primary">
              <span>Explore Platform</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
            <a href="#about" className="cta-ghost">Learn More</a>
          </div>

          <div className="scroll-indicator">
            <div className="scroll-line" />
            <span>Scroll to explore</span>
          </div>
        </div>

        <div className="hero-badge hero-badge-tl">
          <span className="badge-label">Real-time</span>
          <span className="badge-value">Data Analytics</span>
        </div>
        <div className="hero-badge hero-badge-br">
          <span className="badge-label">Powered by</span>
          <span className="badge-value">AI & ML</span>
        </div>
      </section>

      {/* STATS */}
      <section className="stats-strip">
        {[
          { value: '500+', label: 'Cities Monitored' },
          { value: '98%', label: 'Prediction Accuracy' },
          { value: '2.4°C', label: 'Avg Heat Delta Detected' },
          { value: '10M+', label: 'Data Points Processed' },
        ].map((s) => (
          <div className="stat-item" key={s.label}>
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </section>

      {/* ABOUT */}
      <section id="about" className="about-section">
        <div className="about-grid">
          <div className="about-text">
            <span className="section-tag">About SANKALP</span>
            <h2 className="section-title">
              Spatial Intelligence<br />
              <em>Reimagined</em>
            </h2>
            <p className="section-body">
              SANKALP (Spatial Analytics and Neural Knowledge Platform) is a
              next-generation geospatial intelligence platform designed to map,
              model, and mitigate Urban Heat Island effects across metropolitan zones.
            </p>
            <p className="section-body">
              Combining satellite imagery, ground-sensor telemetry, and deep
              learning, SANKALP delivers hyper-local heat predictions with
              unprecedented resolution and accuracy.
            </p>
            <a href="/intro" className="cta-primary inline-cta">
              <span>Start Exploring</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          <div id="features" className="about-cards">
            {[
              { icon: '🌡', title: 'Heat Mapping', desc: 'Granular surface-temperature heatmaps updated in near real-time.' },
              { icon: '🛰', title: 'Satellite Fusion', desc: 'Multi-spectral satellite feeds fused with ground IoT sensors.' },
              { icon: '🧠', title: 'Neural Forecasting', desc: 'Deep learning models predict heat spikes 72 hours in advance.' },
              { icon: '📍', title: 'Land-use Planning', desc: 'Actionable GIS layers for urban planners and policymakers.' },
            ].map((card) => (
              <div className="feature-card" key={card.title}>
                <span className="card-icon">{card.icon}</span>
                <h3 className="card-title">{card.title}</h3>
                <p className="card-desc">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-logo">SANKALP</div>
          <p className="footer-tagline">
            Spatial Analytics and Neural Knowledge Platform for Adaptive Land-use Planning
          </p>
          <div className="footer-divider" />
          <p className="footer-copy">
            © {new Date().getFullYear()} SANKALP. Urban Intelligence Initiative.
          </p>
        </div>
      </footer>

    </div>
  );
}
