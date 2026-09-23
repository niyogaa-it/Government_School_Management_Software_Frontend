import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/admin/login`,
        { email, password }
      );
      if (response.data.success) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
        navigate("/dashboard");
      } else {
        setError("Invalid email or password.");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .login-root {
          min-height: 100vh;
          display: flex;
          font-family: 'DM Sans', sans-serif;
          background: #f0f4fb;
        }

        /* ── LEFT PANEL ── */
        .login-left {
          flex: 1.1;
          background: linear-gradient(160deg, #0f2549 0%, #1a3c6e 55%, #1e4d9b 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 56px 52px;
          position: relative;
          overflow: hidden;
        }

        .left-art {
          position: absolute;
          inset: 0;
          width: 100%; height: 100%;
          z-index: 0;
        }

        /* floating orbs */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(0px);
          opacity: 0;
          animation: orbFloat linear infinite;
        }
        @keyframes orbFloat {
          0%   { opacity: 0;    transform: translateY(0)    scale(1); }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { opacity: 0;    transform: translateY(-80px) scale(1.05); }
        }

        .left-center-logo {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 28px;
        }
        .left-center-emblem {
          position: relative;
          width: 160px; height: 160px;
          display: flex; align-items: center; justify-content: center;
        }
        .emblem-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.15);
          animation: ringPulse 3s ease-in-out infinite;
        }
        .emblem-ring:nth-child(1) { width: 160px; height: 160px; animation-delay: 0s; }
        .emblem-ring:nth-child(2) { width: 120px; height: 120px; animation-delay: 0.6s; }
        .emblem-ring:nth-child(3) { width: 80px;  height: 80px;  animation-delay: 1.2s; border-color: rgba(245,158,11,0.35); }
        @keyframes ringPulse {
          0%,100% { transform: scale(1);    opacity: 0.6; }
          50%      { transform: scale(1.04); opacity: 1; }
        }
        .emblem-core {
          width: 56px; height: 56px;
          background: linear-gradient(135deg, #f59e0b, #fbbf24);
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 32px rgba(245,158,11,0.45);
          transform: rotate(45deg);
          animation: coreSpin 8s linear infinite;
        }
        @keyframes coreSpin {
          from { transform: rotate(45deg); }
          to   { transform: rotate(405deg); }
        }
        .emblem-core svg {
          transform: rotate(-45deg);
        }
        .left-word {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 3vw, 38px);
          font-weight: 700;
          color: #fff;
          letter-spacing: 1px;
          text-align: center;
          line-height: 1.2;
        }
        .left-word span { color: #f59e0b; }
        .left-tagline-sub {
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          letter-spacing: 3px;
          text-transform: uppercase;
          text-align: center;
        }

        /* grid of dots overlay */
        .dot-grid {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 28px 28px;
          z-index: 0;
        }

        /* ── RIGHT PANEL ── */
        .login-right {
          flex: 0.9;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          background: #f0f4fb;
        }

        .login-card {
          background: #fff;
          border-radius: 20px;
          padding: 52px 48px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 8px 48px rgba(26, 60, 110, 0.10), 0 1px 4px rgba(0,0,0,0.04);
          animation: cardIn 0.45s cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .card-logo-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 32px;
        }
        .card-logo-wrap img {
          height: 64px;
          object-fit: contain;
        }

        .card-title {
          font-family: 'Playfair Display', serif;
          font-size: 26px;
          font-weight: 700;
          color: #0f2549;
          margin-bottom: 6px;
          text-align: center;
        }
        .card-subtitle {
          font-size: 13px;
          color: #94a3b8;
          text-align: center;
          margin-bottom: 36px;
          font-weight: 400;
        }

        .field-group {
          margin-bottom: 20px;
        }
        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 8px;
        }
        .field-wrap {
          position: relative;
        }
        .field-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 16px;
          pointer-events: none;
          display: flex;
          align-items: center;
        }
        .field-input {
          width: 100%;
          padding: 13px 14px 13px 42px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #1e293b;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .field-input:-webkit-autofill,
        .field-input:-webkit-autofill:hover,
        .field-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #f8fafc inset !important;
          -webkit-text-fill-color: #1e293b !important;
          transition: background-color 5000s ease-in-out 0s;
          border-color: #e2e8f0 !important;
        }
        .field-input::placeholder { color: #c0cad8; }
        .field-input:focus {
          border-color: #2563eb;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(37,99,235,0.08);
        }
        .toggle-pass {
          position: absolute;
          right: 13px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          padding: 4px;
          font-size: 15px;
          display: flex;
          align-items: center;
          transition: color 0.15s;
        }
        .toggle-pass:hover { color: #2563eb; }

        .error-msg {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          font-size: 13px;
          padding: 10px 14px;
          border-radius: 8px;
          margin-bottom: 20px;
          animation: shake 0.35s ease;
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25%      { transform: translateX(-6px); }
          75%      { transform: translateX(6px); }
        }

        .login-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #1a3c6e 0%, #2563eb 100%);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14.5px;
          font-weight: 600;
          letter-spacing: 0.4px;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 18px rgba(37,99,235,0.28);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 8px;
        }
        .login-btn:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(37,99,235,0.36);
        }
        .login-btn:active:not(:disabled) { transform: translateY(0); }
        .login-btn:disabled { opacity: 0.65; cursor: not-allowed; }

        .spinner {
          width: 17px; height: 17px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .card-footer-note {
          text-align: center;
          margin-top: 28px;
          font-size: 12px;
          color: #94a3b8;
        }
        .card-footer-note span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 768px) {
          .login-left { display: none; }
          .login-right { background: #1a3c6e; }
          .login-card { box-shadow: 0 12px 48px rgba(0,0,0,0.25); }
        }
      `}</style>

      <div className="login-root">
        {/* ── LEFT PANEL ── */}
        <div className="login-left">
          <div className="dot-grid" />

          {/* floating orbs */}
          {[
            { w:180, h:180, bg:"rgba(37,99,235,0.18)",  top:"8%",  left:"10%",  dur:"9s",  delay:"0s"   },
            { w:120, h:120, bg:"rgba(245,158,11,0.14)", top:"65%", left:"60%",  dur:"12s", delay:"2s"   },
            { w: 80, h: 80, bg:"rgba(255,255,255,0.06)",top:"40%", left:"75%",  dur:"7s",  delay:"1.5s" },
            { w: 60, h: 60, bg:"rgba(245,158,11,0.10)", top:"15%", left:"70%",  dur:"10s", delay:"3s"   },
            { w:100, h:100, bg:"rgba(37,99,235,0.10)",  top:"78%", left:"5%",   dur:"11s", delay:"0.5s" },
          ].map((o, i) => (
            <div key={i} className="orb" style={{
              width: o.w, height: o.h, background: o.bg,
              top: o.top, left: o.left,
              animationDuration: o.dur, animationDelay: o.delay,
            }} />
          ))}

          {/* center emblem + text */}
          <div className="left-center-logo">
            <div className="left-center-emblem">
              <div className="emblem-ring" />
              <div className="emblem-ring" />
              <div className="emblem-ring" />
              <div className="emblem-core">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
              </div>
            </div>

            <div>
              <div className="left-word">School <span>Management</span></div>
              <div className="left-word">System</div>
            </div>
            <div className="left-tagline-sub">Login Portal</div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", letterSpacing: "2px", textTransform: "uppercase", textAlign: "center", marginTop: "-16px" }}>version: 1.0</div>
          </div>

          {/* corner SVG lines */}
          <svg style={{ position:"absolute", bottom:0, left:0, opacity:0.08, zIndex:0 }}
            width="220" height="220" viewBox="0 0 220 220" fill="none">
            <line x1="0" y1="220" x2="220" y2="0" stroke="white" strokeWidth="0.8"/>
            <line x1="0" y1="180" x2="180" y2="0" stroke="white" strokeWidth="0.8"/>
            <line x1="0" y1="140" x2="140" y2="0" stroke="white" strokeWidth="0.8"/>
            <line x1="0" y1="100" x2="100" y2="0" stroke="white" strokeWidth="0.8"/>
            <line x1="0" y1="60"  x2="60"  y2="0" stroke="white" strokeWidth="0.8"/>
          </svg>
          <svg style={{ position:"absolute", top:0, right:0, opacity:0.08, zIndex:0 }}
            width="180" height="180" viewBox="0 0 180 180" fill="none">
            <line x1="0" y1="0" x2="180" y2="180" stroke="white" strokeWidth="0.8"/>
            <line x1="40" y1="0" x2="180" y2="140" stroke="white" strokeWidth="0.8"/>
            <line x1="80" y1="0" x2="180" y2="100" stroke="white" strokeWidth="0.8"/>
            <line x1="120" y1="0" x2="180" y2="60" stroke="white" strokeWidth="0.8"/>
          </svg>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="login-right">
          <div className="login-card">
            <div className="card-logo-wrap">
              <img src="/images/CES-logo.png" alt="CES Logo" />
            </div>

            <h2 className="card-title">Welcome Back</h2>
            <p className="card-subtitle">Sign in to your account</p>

            {error && (
              <div className="error-msg">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              {/* Email */}
              <div className="field-group">
                <label className="field-label" htmlFor="email">Email Address</label>
                <div className="field-wrap">
                  <span className="field-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/>
                    </svg>
                  </span>
                  <input
                    id="email"
                    type="email"
                    className="field-input"
                    placeholder="your email id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="field-group">
                <label className="field-label" htmlFor="password">Password</label>
                <div className="field-wrap">
                  <span className="field-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="field-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  {/* <button
                    type="button"
                    className="toggle-pass"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button> */}
                </div>
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? (
                  <><div className="spinner" /> Signing in…</>
                ) : (
                  <>
                    Sign In
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="card-footer-note">
              <span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Secured access · Authorized personnel only
              </span>
            </div>

            <div style={{ textAlign: "center", marginTop: "12px", fontSize: "11px", color: "#cbd5e1", letterSpacing: "0.5px" }}>
              version: 1.0
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;