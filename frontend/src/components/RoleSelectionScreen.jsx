// ============================================================================
// src/components/RoleSelectionScreen.jsx
// ============================================================================
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import Spinner from "./Spinner";
import video from "../assets/first_page.mp4";

// ---------------------------------------------------------------------------
// Reveal on scroll
// ---------------------------------------------------------------------------
function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          obs.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={{ "--reveal-delay": `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tilt + cursor-tracked glow card
// ---------------------------------------------------------------------------
function TiltCard({ children, onClick, disabled }) {
  const ref = useRef(null);
  const raf = useRef(0);

  const onMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--rx", `${(0.5 - y) * 10}deg`);
      el.style.setProperty("--ry", `${(x - 0.5) * 10}deg`);
      el.style.setProperty("--mx", `${x * 100}%`);
      el.style.setProperty("--my", `${y * 100}%`);
    });
  }, []);

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }, []);

  return (
    <button
      ref={ref}
      className="role-card-3d"
      onClick={onClick}
      disabled={disabled}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </button>
  );
}

export default function RoleSelectScreen() {
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [pendingRole, setPendingRole] = useState(null);

  // Smooth hero scroll progress — interpolated via rAF so it never jitters
  const [heroProgress, setHeroProgress] = useState(0);
  const [pageProgress, setPageProgress] = useState(0);
  const targetRef = useRef(0);
  const currentRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    function onScroll() {
      const h = window.innerHeight;
      targetRef.current = Math.min(1, window.scrollY / h);
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setPageProgress(max > 0 ? window.scrollY / max : 0);
    }
    function tick() {
      // Critically-damped interpolation → buttery smooth
      currentRef.current += (targetRef.current - currentRef.current) * 0.12;
      setHeroProgress(currentRef.current);
      rafRef.current = requestAnimationFrame(tick);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  async function handleChooseRole(role) {
    setPendingRole(role);
    if (!publicKey) {
      setVisible(true);
      return;
    }
    setBusy(true);
    try {
      const profile = await signIn(role);
      navigate(profile?.full_name ? "/" : "/complete-profile");
    } catch (err) {
      console.error("[RoleSelect] failed:", err);
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <div className="rs-busy">
        <video className="rs-busy-video" src={video} autoPlay muted loop playsInline />
        <div className="rs-busy-overlay" />
        <Spinner
          label={`Setting up your ${pendingRole === "business_owner" ? "business owner" : "investor"
            } account...`}
        />
      </div>
    );
  }

  return (
    <div className="rs-page">
      {/* Top scroll progress bar */}
      <div className="rs-progress" aria-hidden>
        <div className="rs-progress-bar" style={{ transform: `scaleX(${pageProgress})` }} />
      </div>

      <section className="rs-hero">
        {/* Aurora background blobs (lightning layer) */}
        <div className="rs-aurora" aria-hidden>
          <span className="rs-orb rs-orb-1" />
          <span className="rs-orb rs-orb-2" />
          <span className="rs-orb rs-orb-3" />
        </div>

        <video
          className="rs-hero-video"
          src={video}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          style={{
            transform: `scale(${1 + heroProgress * 0.08})`,
            opacity: 1 - heroProgress * 0.5,
          }}
        />
        <div className="rs-hero-video-overlay" />

        <div
          className="rs-hero-inner"
          style={{
            opacity: 1 - heroProgress * 1.15,
            transform: `translateY(${heroProgress * -70}px) scale(${1 - heroProgress * 0.02})`,
          }}
        >
          <Reveal>
            <span className="rs-badge">
              <span className="rs-badge-dot" />
              RWA Tokenization Platform
            </span>
          </Reveal>

          <Reveal delay={280}>
            <a href="#choose" className="rs-scroll-cue">
              <span>Scroll to begin</span>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M6 13l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </Reveal>
        </div>

        {/* Bottom fade into next section */}
        <div className="rs-hero-fade" aria-hidden />
      </section>

      {/* ============================================================
          SECTION 2 — HOW IT WORKS
          ============================================================ */}
      <section className="rs-split">
        <div className="rs-split-inner">
          <Reveal className="rs-split-copy" delay={120}>
            <span className="rs-eyebrow">How it works</span>
            <h2 className="rs-split-title">Two paths. One on-chain protocol.</h2>
            <p className="rs-split-text">
              Every business gets its own escrow vault and share token. Every
              investor gets a PDA recording exactly what they own. All money
              movements are verifiable on Solana.
            </p>

            <ul className="rs-feature-list">
              <li>
                <span className="rs-feature-dot rs-dot-violet" />
                Businesses issue shares in USDC, priced per token
              </li>
              <li>
                <span className="rs-feature-dot rs-dot-cyan" />
                Investors buy and hold shares directly on-chain
              </li>
              <li>
                <span className="rs-feature-dot rs-dot-blue" />
                Monthly profit deposits flow to holders automatically
              </li>
            </ul>
          </Reveal>

          <Reveal className="rs-split-panel" delay={200}>
            <div className="rs-stat-card">
              <span className="rs-stat-label">Escrow vaults</span>
              <span className="rs-stat-value">On-chain</span>
            </div>
            <div className="rs-stat-card">
              <span className="rs-stat-label">Share ownership</span>
              <span className="rs-stat-value">Verifiable</span>
            </div>
            <div className="rs-stat-card">
              <span className="rs-stat-label">Monthly payouts</span>
              <span className="rs-stat-value">Automatic</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          SECTION 3 — CHOOSE YOUR ROLE
          ============================================================ */}
      <section id="choose" className="rs-choose">
        <Reveal>
          <div className="rs-choose-header">
            <span className="rs-eyebrow">Get started</span>
            <h2 className="rs-choose-title">Choose your role</h2>
            <p className="rs-choose-sub">
              This decision is permanent for this wallet. Pick the path that
              matches what you're here to do.
            </p>
          </div>
        </Reveal>

        <div className="rs-cards">
          <Reveal delay={100}>
            <TiltCard onClick={() => handleChooseRole("business_owner")} disabled={busy}>
              <div className="role-card-border" aria-hidden />
              <div className="role-card-glow" aria-hidden />
              <div className="role-card-inner">
                <div className="role-card-icon role-card-icon-owner">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="role-card-title">I'm a Business Owner</h3>
                <p className="role-card-desc">
                  Tokenize your business, sell shares to investors, and pay out
                  monthly profit — all on-chain.
                </p>
                <span className="role-card-cta">
                  Continue
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </TiltCard>
          </Reveal>

          <Reveal delay={220}>
            <TiltCard onClick={() => handleChooseRole("investor")} disabled={busy}>
              <div className="role-card-border" aria-hidden />
              <div className="role-card-glow" aria-hidden />
              <div className="role-card-inner">
                <div className="role-card-icon role-card-icon-investor">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M3 17l6-6 4 4 8-8M14 7h7v7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="role-card-title">I'm an Investor</h3>
                <p className="role-card-desc">
                  Browse tokenized businesses, buy shares in USDC, and track
                  your monthly returns.
                </p>
                <span className="role-card-cta">
                  Continue
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </TiltCard>
          </Reveal>
        </div>

        <Reveal delay={320}>
          <p className="rs-footnote">
            Wallet signatures are free — you'll only pay network fees when you
            create a business or make an investment.
          </p>
        </Reveal>
      </section>
    </div>
  );
}