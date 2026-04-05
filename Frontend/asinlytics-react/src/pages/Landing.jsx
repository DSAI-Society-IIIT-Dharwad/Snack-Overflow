import { useState, useEffect, useContext, useRef } from "react";
import { ToastContext } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import "../Landing.css";

/* data */
const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 3v18h18" /><path d="m7 16 4-4 4 4 4-8" />
      </svg>
    ),
    label: "Price Trends",
    desc: "Track historical price movements across every ASIN with sub-minute resolution.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
    ),
    label: "ASIN Tracker",
    desc: "Monitor rank, reviews, and buy-box ownership across your entire catalogue.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" />
      </svg>
    ),
    label: "Competitor Intel",
    desc: "Benchmark pricing and listing quality against direct competitors in real time.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    label: "Live Alerts",
    desc: "Instant notifications on hijacks, stockouts, and sudden price swings.",
  },
];

const STATS = [
  { value: "4.2M+", label: "ASINs tracked" },
  { value: "99.7%", label: "Uptime SLA" },
  { value: "<30s",  label: "Alert latency" },
  { value: "180+",  label: "Marketplaces" },
];

/*Auth Modal */
function AuthModal({ onClose, onLogin }) {
  const { addToast } = useContext(ToastContext);
  const [mode, setMode]       = useState("login");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]       = useState("");
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef(null);

  const handleOverlay = (e) => { if (e.target === overlayRef.current) onClose(); };

  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (mode === "signup" && !name)) {
      addToast("Please fill in all required fields.", "error");
      return;
    }
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              full_name: name, 
            }
          }
        });

        if (error) throw error;
        addToast("Account created! Please check your email to verify.", "success");
        
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) throw error;

        addToast("Welcome back!", "success");
        onLogin(); 
      }
    } catch (error) {
      addToast(error.message || "An error occurred during authentication", "error");
    } finally {
      setLoading(false); 
    }
  };

  return (
    <div className="al-overlay" ref={overlayRef} onClick={handleOverlay}>
      <div className="al-modal" role="dialog" aria-modal="true" aria-label="Authentication">

        <button className="al-close" onClick={onClose} aria-label="Close dialog">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="al-brand">
          <span className="al-brand-dot" />
          <span>
             <span style={{ color: "#dde6f5" }}>ASIN</span>
             <span style={{ color: "#10e89a" }}>Lytics</span>
          </span>
        </div>

        <div className="al-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={mode === "login"}
            className={`al-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => setMode("login")}
          >Log In</button>
          <button
            role="tab"
            aria-selected={mode === "signup"}
            className={`al-tab ${mode === "signup" ? "active" : ""}`}
            onClick={() => setMode("signup")}
          >Sign Up</button>
          <span
            className="al-tab-indicator"
            style={{ left: mode === "login" ? "4px" : "calc(50% + 2px)" }}
          />
        </div>

        <form className="al-form" onSubmit={handleSubmit} noValidate>
          {mode === "signup" && (
            <div className="al-field al-field--enter">
              <label htmlFor="al-name">Full Name</label>
              <input
                id="al-name" type="text" placeholder="Jane Doe"
                value={name} onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}
          <div className="al-field">
            <label htmlFor="al-email">Email Address</label>
            <input
              id="al-email" type="email" placeholder="you@brand.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="al-field">
            <label htmlFor="al-pass">
              Password
              {mode === "login" && <a href="#" className="al-forgot">Forgot?</a>}
            </label>
            <input
              id="al-pass" type="password"
              placeholder={mode === "signup" ? "Min. 8 characters" : "••••••••"}
              value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          <button type="submit" className={`al-submit ${loading ? "loading" : ""}`} disabled={loading}>
            {loading
              ? <span className="al-spinner" />
              : mode === "login" ? "Log In →" : "Create Account →"}
          </button>
        </form>

        <p className="al-switch">
          {mode === "login" ? "New here? " : "Already have an account? "}
          <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
            {mode === "login" ? "Sign up free" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}

/*  Landing */
export default function Landing({ onLogin }) {
  const [showAuth, setShowAuth] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="lp-root">

      {/* Navbar */}
      <nav className={`lp-nav ${scrolled ? "lp-nav--scrolled" : ""}`}>
        <div className="lp-nav-inner">
          <div className="lp-logo">
            <span className="lp-logo-mark" />
           <span>
             <span style={{ color: "#dde6f5" }}>ASIN</span>
              <span style={{ color: "#10e89a" }}>Lytics</span>
           </span>
          </div>
          <div className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#stats">Metrics</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="lp-nav-cta">
            <button className="lp-btn-ghost" onClick={() => setShowAuth(true)}>Log In</button>
            <button className="lp-btn-primary" onClick={() => setShowAuth(true)}>Get Started</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-grid-bg" aria-hidden="true" />
        <div className="lp-orb lp-orb--green" aria-hidden="true" />
        <div className="lp-orb lp-orb--blue"  aria-hidden="true" />

        <div className="lp-hero-inner">
          <div className="lp-badge">
            <span className="lp-badge-dot" />
            <span>Live marketplace intelligence</span>
          </div>

          <h1 className="lp-headline">
            Outprice.<br />
            Outrank.<br />
            <span className="lp-headline-accent">Outperform.</span>
          </h1>

          <p className="lp-sub">
            ASINLytics delivers real-time price trend analysis, ASIN-level competitor
            tracking, and instant alerts — so your Amazon strategy runs on data, not gut feel.
          </p>

          <div className="lp-hero-actions">
            <button className="lp-btn-primary lp-btn-lg" onClick={() => setShowAuth(true)}>
              Get Started — it's free
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
            <a href="#features" className="lp-btn-ghost lp-btn-lg">See how it works</a>
          </div>

          {/* live ticker */}
          {/* <div className="lp-ticker">
            <span className="lp-ticker-label">LIVE</span>
            <div className="lp-ticker-wrap">
              <div className="lp-ticker-track">
                {["B08N5M7S6K +2.4%","B07XJ8C8F5 −0.8%","B09G9FPHY6 +5.1%",
                  "B08CF3B7N1 −1.2%","B07FNB4PZB +3.7%","B08N5M7S6K +2.4%",
                  "B07XJ8C8F5 −0.8%","B09G9FPHY6 +5.1%"].map((t, i) => (
                  <span key={i} className={`lp-ticker-item ${t.includes("+") ? "up" : "down"}`}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div> */}
        </div>
      </section>

      {/*Stats*/}
      <section id="stats" className="lp-stats">
        {STATS.map((s) => (
          <div key={s.label} className="lp-stat">
            <span className="lp-stat-val">{s.value}</span>
            <span className="lp-stat-label">{s.label}</span>
          </div>
        ))}
      </section>

      {/*Features*/}
      <section id="features" className="lp-features">
        <div className="lp-section-header">
          <span className="lp-eyebrow">Capabilities</span>
          <h2>Everything your team needs to win on Amazon</h2>
        </div>
        <div className="lp-feature-grid">
          {FEATURES.map((f, i) => (
            <div className="lp-feature-card" key={f.label} style={{"--i": i}}>
              <div className="lp-feature-icon">{f.icon}</div>
              <h3>{f.label}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/*CTA band*/}
      <section className="lp-cta-band">
        <div className="lp-orb lp-orb--green lp-orb--sm" aria-hidden="true" />
        <h2>Ready to make data-driven decisions?</h2>
        <p>Join thousands of sellers and brand managers already using ASINLytics.</p>
        <button className="lp-btn-primary lp-btn-lg" onClick={() => setShowAuth(true)}>
          Start for free →
        </button>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-logo">
          <span className="lp-logo-mark" />
         <span>
            <span style={{ color: "#dde6f5" }}>ASIN</span>
            <span style={{ color: "#10e89a" }}>Lytics</span>
         </span>
        </div>
        <p>© {new Date().getFullYear()} ASINLytics Inc. All rights reserved.</p>
      </footer>

       {showAuth && <AuthModal onClose={() => setShowAuth(false)} onLogin={onLogin} />}

    </div>
  );
}