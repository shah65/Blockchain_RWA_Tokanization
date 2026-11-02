import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { useAuth } from "../context/AuthContext";
import Spinner from "./Spinner";
import "./RoleSelectionScreen.css";

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, useGSAP);

const video = "https://svhjjphbbxzlpslgppxc.supabase.co/storage/v1/object/public/videos/first_page.mp4";

// ---------------------------------------------------------------------------
// Reveal on scroll (Kept for inner text elements)
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

// ============================================================================
// Main component
// ============================================================================
export default function RoleSelectScreen() {
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { signIn, profile, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [pendingRole, setPendingRole] = useState(null);
  const [adminRevealed, setAdminRevealed] = useState(false);

  const pageRef = useRef(null);
  const sectionsRef = useRef([]);

  // ── GSAP 3D Stacked Scroll Animation ───────────────────────────────────
  useGSAP(() => {
    const sections = sectionsRef.current;

    sections.forEach((section, index) => {
      // Don't pin the very last section (the role selection cards)
      if (index === sections.length - 1) return;

      gsap.to(section, {
        scrollTrigger: {
          trigger: section,
          start: "top top",       // Start when section top hits viewport top
          end: "bottom top",      // End when section bottom hits viewport top
          scrub: 1,               // Smooth scrubbing (1s lag for premium feel)
          pin: true,              // Pin the section in place
          pinSpacing: false,      // Let the next section slide over it
          anticipatePin: 1,
        },
        // The 3D effect: Scale down, blur, and fade out as it gets covered
        scale: 0.9,
        opacity: 0.4,
        filter: "blur(12px)",
        y: -50,
        ease: "none",
      });
    });

    // Staggered entrance for the role cards when they come into view
    gsap.from(".role-card-3d", {
      y: 100,
      opacity: 0,
      duration: 1,
      stagger: 0.15,
      ease: "power3.out",
      scrollTrigger: {
        trigger: "#choose",
        start: "top bottom", // Start when the section enters the screen
        toggleActions: "play none none reverse",
      },
    });
  }, { scope: pageRef });

  // ---- Effect: admin reveal ----
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("admin") === "1") {
      setAdminRevealed(true);
      return;
    }
    let buffer = "";
    function onKey(e) {
      if (e.key.length !== 1) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-5);
      if (buffer === "admin") {
        setAdminRevealed(true);
        buffer = "";
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---- Role handler ----
  async function handleChooseRole(role) {
    setPendingRole(role);

    if (!publicKey) {
      setVisible(true);
      return;
    }

    setBusy(true);
    try {
      const profile = await signIn(role);

      if (role === "admin" || profile?.is_admin || profile?.role === "admin") {
        navigate("/admin", { replace: true });
        return;
      }

      if (profile?.role === "business_owner") {
        if (!profile.full_name) {
          navigate("/complete-profile", { replace: true });
        } else {
          navigate("/owner", { replace: true });
        }
        return;
      }

      if (!profile?.full_name) {
        navigate("/complete-profile", { replace: true });
      } else {
        navigate("/investor", { replace: true });
      }
    } catch (err) {
      console.error("[RoleSelect] failed:", err);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Something went wrong. Please try again.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  // ---- Busy overlay (Framer Motion animated) ----
  if (busy) {
    return (
      <AnimatePresence>
        <motion.div
          className="rs-busy"
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(10px)" }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <video className="rs-busy-video" src={video} autoPlay muted loop playsInline preload="metadata" />
          <div className="rs-busy-overlay" />
          <Spinner
            label={`Setting up your ${pendingRole === "business_owner" ? "business owner" : "investor"} account...`}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="rs-page" ref={pageRef}>
      {/* ============================================================
          FIXED BACKGROUND VIDEO — stays put across all 3 sections.
         ============================================================ */}
      <div className="rs-bg-video-wrap" aria-hidden>
        <video
          className="rs-bg-video"
          src={video}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
        <div className="rs-bg-video-overlay" />
        <div className="rs-aurora">
          <span className="rs-orb rs-orb-1" />
          <span className="rs-orb rs-orb-2" />
          <span className="rs-orb rs-orb-3" />
        </div>
      </div>

      {/* Signed-in banner */}
      {isAuthenticated && profile && (
        <div className="rs-signed-in-banner">
          <span>
            Signed in as{" "}
            <strong>
              {profile.full_name || `${profile.wallet_address.slice(0, 6)}…`}
            </strong>{" "}
            · <span style={{ opacity: 0.8 }}>{profile.role}</span>
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="rs-btn-continue"
              onClick={() =>
                navigate(
                  profile.is_admin
                    ? "/admin"
                    : profile.role === "business_owner"
                      ? "/owner"
                      : "/investor"
                )
              }
            >
              Continue →
            </button>
            <button className="rs-btn-signout" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          SECTION 1 — HERO
         ============================================================ */}
      <section
        className="rs-section rs-hero"
        ref={(el) => (sectionsRef.current[0] = el)}
      >
        <div className="rs-glass-frame rs-hero-frame">
          <div className="rs-hero-inner">
            <Reveal>
              <span className="rs-badge">
                <span className="rs-badge-dot" />
                Sarmayachain · Own a share in real businesses
              </span>
            </Reveal>

            <Reveal delay={200}>
              <h1 className="rs-hero-title">
                Tokenize. Invest. <span className="rs-title-accent">Earn.</span>
              </h1>
            </Reveal>

            <Reveal delay={320}>
              <p className="rs-hero-sub">
                A Solana-native protocol where businesses raise capital and
                investors own verifiable shares — with automatic monthly payouts.
              </p>
            </Reveal>

            <Reveal delay={450}>
              <a href="#choose" className="rs-scroll-cue">
                <span>Scroll to begin</span>
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M12 5v14M6 13l6 6 6-6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2 — HOW IT WORKS
         ============================================================ */}
      <section
        className="rs-section rs-split"
        ref={(el) => (sectionsRef.current[1] = el)}
      >
        <div className="rs-glass-frame rs-split-frame">
          <div className="rs-split-inner">
            <Reveal className="rs-split-copy" delay={120}>
              <span className="rs-eyebrow">How it works</span>
              <h2 className="rs-split-title">
                Two paths. One on-chain protocol.
              </h2>
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
        </div>
      </section>

      {/* ============================================================
          SECTION 3 — CHOOSE YOUR ROLE
         ============================================================ */}
      <section
        id="choose"
        className="rs-section rs-choose"
        ref={(el) => (sectionsRef.current[2] = el)}
      >
        <div className="rs-glass-frame rs-choose-frame">
          <Reveal>
            <div className="rs-choose-header">
              <span className="rs-eyebrow">Get started</span>
              <h2 className="rs-choose-title">Choose your role</h2>
              <p className="rs-choose-sub">
                {adminRevealed
                  ? "Admin access detected. Choose carefully — actions are logged."
                  : "This decision is permanent for this wallet. Pick the path that matches what you're here to do."}
              </p>
            </div>
          </Reveal>

          <div className="rs-cards">
            <Reveal delay={100}>
              <TiltCard
                onClick={() => handleChooseRole("business_owner")}
                disabled={busy}
              >
                <div className="role-card-border" aria-hidden />
                <div className="role-card-glow" aria-hidden />
                <div className="role-card-inner">
                  <div className="role-card-icon role-card-icon-owner">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    >
                      <path
                        d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <h3 className="role-card-title">I'm a Business Owner</h3>
                  <p className="role-card-desc">
                    Tokenize your business, sell shares to investors, and pay out
                    monthly profit — all on-chain.
                  </p>
                  <span className="role-card-cta">
                    Continue
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      width="16"
                      height="16"
                    >
                      <path
                        d="M5 12h14M13 6l6 6-6 6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
              </TiltCard>
            </Reveal>

            <Reveal delay={220}>
              <TiltCard
                onClick={() => handleChooseRole("investor")}
                disabled={busy}
              >
                <div className="role-card-border" aria-hidden />
                <div className="role-card-glow" aria-hidden />
                <div className="role-card-inner">
                  <div className="role-card-icon role-card-icon-investor">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    >
                      <path
                        d="M3 17l6-6 4 4 8-8M14 7h7v7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <h3 className="role-card-title">I'm an Investor</h3>
                  <p className="role-card-desc">
                    Browse tokenized businesses, buy shares in USDC, and track
                    your monthly returns.
                  </p>
                  <span className="role-card-cta">
                    Continue
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      width="16"
                      height="16"
                    >
                      <path
                        d="M5 12h14M13 6l6 6-6 6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
              </TiltCard>
            </Reveal>

            {adminRevealed && (
              <Reveal delay={320}>
                <TiltCard
                  onClick={() => handleChooseRole("admin")}
                  disabled={busy}
                >
                  <div className="role-card-border" aria-hidden />
                  <div className="role-card-glow" aria-hidden />
                  <div className="role-card-inner role-card-inner-admin">
                    <div className="role-card-icon role-card-icon-admin">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      >
                        <path
                          d="M12 3 4 6v6c0 4.5 3.4 8.6 8 9 4.6-.4 8-4.5 8-9V6l-8-3Z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="12" cy="11" r="2" />
                        <path d="M12 13v3M11 15h2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <h3 className="role-card-title">Admin Access</h3>
                    <p className="role-card-desc">
                      Review identity verifications, freeze suspicious accounts,
                      and inspect the owner / investor experiences.
                    </p>
                    <span className="role-card-cta role-card-cta-admin">
                      Authenticate
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        width="16"
                        height="16"
                      >
                        <path
                          d="M5 12h14M13 6l6 6-6 6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </div>
                </TiltCard>
              </Reveal>
            )}
          </div>

          <Reveal delay={320}>
            <p className="rs-footnote">
              Wallet signatures are free — you'll only pay network fees when you
              create a business or make an investment.
            </p>
          </Reveal>
        </div>
      </section>
    </div>
  );
}