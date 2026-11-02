import { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { api } from "../../config/api";
import toast from "react-hot-toast";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
 
const owner_vdo = "https://svhjjphbbxzlpslgppxc.supabase.co/storage/v1/object/public/videos/owner_vdo.mp4";

import KYCBadge from "../../components/KYCBadge";
import { useAuthContext } from "../../context/AuthContext";
import "../KYC.css";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function Icon({ name, size = 18 }) {
  const p = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.8,
    strokeLinecap: "round", strokeLinejoin: "round",
  };
  switch (name) {
    case "grid":
      return <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
    case "coins":
      return <svg {...p}><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" /><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></svg>;
    case "trend":
      return <svg {...p}><path d="M3 17l6-6 4 4 8-8M14 7h7v7" /></svg>;
    case "plus":
      return <svg {...p}><path d="M12 5v14M5 12h14" /></svg>;
    case "copy":
      return <svg {...p}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>;
    case "check":
      return <svg {...p}><path d="m20 6-11 11L4 12" /></svg>;
    case "arrow":
      return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
    case "deposit":
      return <svg {...p}><path d="M12 3v13M6 10l6 6 6-6M4 21h16" /></svg>;
    case "spark":
      return <svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Animated counter
// ---------------------------------------------------------------------------
function Counter({ value, duration = 1200, format = (n) => Math.round(n).toLocaleString() }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const to = Number(value) || 0;

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <>{format(display)}</>;
}

// ---------------------------------------------------------------------------
// 3D Tilt Stat Tile with GSAP
// ---------------------------------------------------------------------------
function StatTile({ icon, label, value, suffix, prefix, accent = "violet", index = 0 }) {
  const tileRef = useRef(null);
  const iconRef = useRef(null);
  const valueRef = useRef(null);

  useEffect(() => {
    const el = tileRef.current;
    if (!el) return;

    // GSAP entrance
    gsap.fromTo(
      el,
      { opacity: 0, y: 40, rotateX: -15, scale: 0.9 },
      {
        opacity: 1,
        y: 0,
        rotateX: 0,
        scale: 1,
        duration: 0.9,
        delay: index * 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          toggleActions: "play none none reverse",
        },
      }
    );

    // 3D tilt on mouse move
    const handleMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateY = ((x - centerX) / centerX) * 10;
      const rotateX = ((centerY - y) / centerY) * 10;

      gsap.to(el, {
        rotateY,
        rotateX,
        transformPerspective: 1000,
        duration: 0.4,
        ease: "power2.out",
      });
    };

    const handleMouseLeave = () => {
      gsap.to(el, {
        rotateY: 0,
        rotateX: 0,
        duration: 0.7,
        ease: "elastic.out(1, 0.5)",
      });
    };

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [index]);

  useEffect(() => {
    if (!iconRef.current) return;
    gsap.to(iconRef.current, {
      rotate: 360,
      duration: 12,
      repeat: -1,
      ease: "none",
    });
  }, []);

  return (
    <div
      ref={tileRef}
      className={`od-stat od-stat-${accent}`}
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="od-stat-icon" ref={iconRef}>
        <Icon name={icon} size={20} />
      </div>
      <div className="od-stat-body">
        <span className="od-stat-label">{label}</span>
        <span className="od-stat-value" ref={valueRef}>
          {prefix}
          <Counter value={value} />
          {suffix}
        </span>
      </div>
      <div className="od-stat-shine" aria-hidden />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Copy button
// ---------------------------------------------------------------------------
function CopyButton({ text, label = "Copy address" }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Address copied");
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  return (
    <button
      className={`od-copy ${copied ? "od-copy-done" : ""}`}
      onClick={handleCopy}
      title={label}
      aria-label={label}
    >
      <Icon name={copied ? "check" : "copy"} size={13} />
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// 3D Business Card with GSAP tilt + Framer entrance
// ---------------------------------------------------------------------------
function OwnerBusinessCard({ business, index, kycApproved, kycStatus }) {
  const cardRef = useRef(null);
  const glowRef = useRef(null);

  const tokensSold = Number(business.tokens_sold || 0);
  const totalTokens = Number(business.total_tokens || 0);
  const ratio = totalTokens > 0 ? Math.min(1, tokensSold / totalTokens) : 0;
  const pct = Math.round(ratio * 100);
  const priceUsd = Number(business.price_per_token || 0) / 1_000_000;
  const raiseUsd = priceUsd * totalTokens;
  const shortAddr = business.onchain_pubkey
    ? `${business.onchain_pubkey.slice(0, 4)}…${business.onchain_pubkey.slice(-4)}`
    : "—";

  useEffect(() => {
    const card = cardRef.current;
    const glow = glowRef.current;
    if (!card) return;

    // GSAP entrance with ScrollTrigger
    gsap.fromTo(
      card,
      { opacity: 0, y: 60, rotateY: -8, scale: 0.94 },
      {
        opacity: 1,
        y: 0,
        rotateY: 0,
        scale: 1,
        duration: 0.9,
        delay: index * 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: card,
          start: "top 92%",
          toggleActions: "play none none reverse",
        },
      }
    );

    // 3D tilt + glow follow
    const handleMouseMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateY = ((x - centerX) / centerX) * 8;
      const rotateX = ((centerY - y) / centerY) * 8;

      gsap.to(card, {
        rotateY,
        rotateX,
        transformPerspective: 1200,
        duration: 0.5,
        ease: "power2.out",
      });

      if (glow) {
        gsap.to(glow, {
          left: `${(x / rect.width) * 100}%`,
          top: `${(y / rect.height) * 100}%`,
          opacity: 1,
          duration: 0.5,
          ease: "power2.out",
        });
      }
    };

    const handleMouseLeave = () => {
      gsap.to(card, {
        rotateY: 0,
        rotateX: 0,
        duration: 0.8,
        ease: "elastic.out(1, 0.5)",
      });
      if (glow) {
        gsap.to(glow, { opacity: 0, duration: 0.4 });
      }
    };

    card.addEventListener("mousemove", handleMouseMove);
    card.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      card.removeEventListener("mousemove", handleMouseMove);
      card.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [index]);

  return (
    <div
      ref={cardRef}
      className="od-card"
      style={{ transformStyle: "preserve-3d" }}
    >
      <div ref={glowRef} className="od-card-glow" aria-hidden />

      <div className="od-card-cover">
        <div className="od-card-cover-grad" aria-hidden />
        <div className="od-card-cover-shine" aria-hidden />
        <span className="od-card-badge">{business.category || "Business"}</span>

        <span className="od-card-kyc" title="Your KYC status for this business">
          <KYCBadge status={kycStatus || "not_started"} size="sm" />
        </span>

        <span className="od-card-address" title={business.onchain_pubkey}>
          <span>{shortAddr}</span>
          <CopyButton text={business.onchain_pubkey || ""} />
        </span>
      </div>

      <div className="od-card-body">
        <h3 className="od-card-title">{business.name}</h3>
        <p className="od-card-desc">{business.description || "No description yet."}</p>

        <div className="od-card-metrics">
          <div className="od-metric">
            <span className="od-metric-label">Price / token</span>
            <span className="od-metric-value">${priceUsd.toFixed(2)}</span>
          </div>
          <div className="od-metric">
            <span className="od-metric-label">Potential raise</span>
            <span className="od-metric-value">
              ${raiseUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        <div className="od-progress">
          <div className="od-progress-head">
            <span>Shares sold</span>
            <span>{tokensSold.toLocaleString()} / {totalTokens.toLocaleString()}</span>
          </div>
          <div className="od-progress-track">
            <div className="od-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="od-card-actions">
          <Link
            to={`/owner/deposit-profit/${business.onchain_pubkey}`}
            className="od-action od-action-primary"
            onClick={(e) => { if (!kycApproved) { e.preventDefault(); toast.error("Complete KYC before depositing profit"); } }}
            style={!kycApproved ? { opacity: 0.5, pointerEvents: "none" } : undefined}
          >
            <Icon name="deposit" size={15} />
            Deposit profit
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function SkeletonCard() {
  return (
    <div className="od-card od-card-skeleton">
      <div className="od-skel od-skel-cover" />
      <div className="od-card-body">
        <div className="od-skel od-skel-line od-skel-title" />
        <div className="od-skel od-skel-line" />
        <div className="od-skel od-skel-line od-skel-short" />
        <div className="od-skel od-skel-metrics" />
        <div className="od-skel od-skel-bar" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero section with GSAP scroll parallax
// ---------------------------------------------------------------------------
function HeroSection() {
  const heroRef = useRef(null);
  const titleRef = useRef(null);
  const badgeRef = useRef(null);
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const ctx = gsap.context(() => {
      // Badge entrance
      gsap.fromTo(
        badgeRef.current,
        { opacity: 0, y: -20, scale: 0.8 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "power3.out", delay: 0.2 }
      );

      // Title character animation
      if (titleRef.current) {
        const chars = titleRef.current.querySelectorAll(".od-char");
        gsap.fromTo(
          chars,
          { opacity: 0, y: 60, rotateX: -90 },
          {
            opacity: 1,
            y: 0,
            rotateX: 0,
            duration: 0.9,
            stagger: 0.03,
            ease: "power4.out",
            delay: 0.4,
          }
        );
      }

      // Orb parallax on scroll
      gsap.to(orb1Ref.current, {
        y: -150,
        rotate: 30,
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });

      gsap.to(orb2Ref.current, {
        y: 120,
        rotate: -20,
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: 1.2,
        },
      });
    }, hero);

    return () => ctx.revert();
  }, []);

  const headline = "Turn your business into on-chain ownership".split(" ");

  return (
    <section ref={heroRef} className="od-hero" aria-label="Sarmayachain intro">
      {/* Floating 3D orbs */}
      <div ref={orb1Ref} className="od-orb od-orb-1" aria-hidden />
      <div ref={orb2Ref} className="od-orb od-orb-2" aria-hidden />
      <div className="od-orb od-orb-3" aria-hidden />

      <div className="od-hero-inner">
        <span ref={badgeRef} className="od-hero-badge">
          <span className="od-hero-dot" />
          Owner dashboard
        </span>

        <h1 ref={titleRef} className="od-hero-headline">
          {headline.map((word, i) => (
            <span key={i} className="od-word">
              {word.split("").map((char, j) => (
                <span key={j} className="od-char">
                  {char}
                </span>
              ))}
              {i < headline.length - 1 && " "}
            </span>
          ))}
        </h1>

        <p className="od-hero-sub">
          Launch a share offering in under a minute. Pay out monthly profit
          automatically. Every investor is KYC-verified.
        </p>

        <div className="od-hero-scroll-hint">
          <span>Scroll to explore</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function OwnerDashboard() {
  const { profile } = useAuthContext();
  const kycStatus = profile?.kyc_status || "not_started";
  const kycApproved = kycStatus === "approved";

  const [businesses, setBusinesses] = useState(null);
  const containerRef = useRef(null);
  const statsRef = useRef(null);

  const { scrollYProgress } = useScroll();
  const bgOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.5]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);

  useEffect(() => {
    api
      .get("/businesses/mine")
      .then(({ data }) => setBusinesses(data.businesses))
      .catch(() => {
        toast.error("Could not load your businesses.");
        setBusinesses([]);
      });
  }, []);

  // GSAP global scroll effects
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header entrance
      gsap.fromTo(
        ".od-header",
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".od-header",
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        }
      );

      // Stat strip entrance
      gsap.fromTo(
        ".od-stats",
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".od-stats",
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        }
      );

      // Container 3D scroll rotation
      gsap.to(".od-container", {
        rotateX: 2,
        scale: 0.98,
        scrollTrigger: {
          trigger: ".od-container",
          start: "top 80%",
          end: "bottom 20%",
          scrub: 1,
        },
      });

      // KYC banner
      gsap.fromTo(
        ".kyc-gate-banner",
        { opacity: 0, x: -40, rotateY: -10 },
        {
          opacity: 1,
          x: 0,
          rotateY: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".kyc-gate-banner",
            start: "top 88%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const stats = useMemo(() => {
    if (!businesses) return { count: 0, shares: 0, raise: 0 };
    let count = businesses.length;
    let shares = 0;
    let raise = 0;
    for (const b of businesses) {
      const t = Number(b.total_tokens || 0);
      const p = Number(b.price_per_token || 0) / 1_000_000;
      shares += t;
      raise += t * p;
    }
    return { count, shares, raise };
  }, [businesses]);

  return (
    <div className="od-page" ref={containerRef}>
      {/* ============ Fixed background video ============ */}
      <div className="od-bg" aria-hidden>
        <motion.video
          className="od-bg-video"
          src={owner_vdo}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          style={{ opacity: bgOpacity, scale: bgScale }}
          onLoadedMetadata={(e) => { e.currentTarget.playbackRate = 0.6; }}
          onPlay={(e) => { e.currentTarget.playbackRate = 0.6; }}
        />
        <div className="od-bg-overlay" />
        <div className="od-bg-grid" aria-hidden />
      </div>

      {/* ============ All UI floats above the video ============ */}
      <div className="od-content">
        {/* Hero copy with GSAP */}
        <HeroSection />

        {/* Glass dashboard container */}
        <div className="od-container">
          {/* Header */}
          <header className="od-header">
            <div>
              <span className="od-eyebrow">Your dashboard</span>
              <h2 className="od-title">
                Your <span className="od-title-accent">businesses</span>
              </h2>
              <p className="od-subtitle">
                Every business you tokenize appears here. Click{" "}
                <strong>New business</strong> to launch another one — it takes
                about a minute.
              </p>
            </div>
            <Link to="/owner/create-business" className="od-cta">
              <Icon name="plus" size={16} />
              New business
            </Link>
          </header>

          {/* KYC gate banner */}
          {!kycApproved && (
            <div className="kyc-gate-banner">
              <div>
                <KYCBadge status={kycStatus} />
                <h3>
                  {kycStatus === "pending"
                    ? "KYC under review"
                    : kycStatus === "rejected"
                      ? "KYC rejected — please resubmit"
                      : "Complete KYC to list your businesses"}
                </h3>
                <p>
                  Investors only see verified businesses. Verification usually
                  takes less than 24 hours.
                </p>
              </div>
              <Link to="/kyc" className="kyc-btn-primary">
                {kycStatus === "pending"
                  ? "View status"
                  : kycStatus === "rejected"
                    ? "Resubmit"
                    : "Verify now"}
              </Link>
            </div>
          )}

          {/* Stat strip */}
          <div className="od-stats" ref={statsRef}>
            <StatTile icon="grid" label="Businesses" value={stats.count} accent="violet" index={0} />
            <StatTile icon="coins" label="Shares issued" value={stats.shares} accent="cyan" index={1} />
            <StatTile icon="trend" label="Potential raise" value={stats.raise} prefix="$" accent="indigo" index={2} />
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {businesses === null ? (
              <motion.div
                key="skeleton"
                className="od-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </motion.div>
            ) : businesses.length === 0 ? (
              <motion.div
                key="empty"
                className="od-empty"
                initial={{ opacity: 0, y: 30, rotateX: -10 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="od-empty-icon"><Icon name="spark" size={32} /></div>
                <h2>No businesses yet</h2>
                <p>
                  When you create your first business, it will show up here with
                  live metrics and a link to manage profit deposits.
                </p>
                <Link to="/owner/create-business" className="od-cta od-cta-large">
                  <Icon name="plus" size={16} />
                  Create your first business
                </Link>
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                className="od-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                {businesses.map((b, i) => (
                  <OwnerBusinessCard
                    key={b.onchain_pubkey}
                    business={b}
                    index={i}
                    kycApproved={kycApproved}
                    kycStatus={kycStatus}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}