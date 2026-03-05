"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [companyId, setCompanyId] = useState("");
  const [gmPassword, setGmPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handlePlayerLogin = (e) => {
    e.preventDefault();
    if (companyId.trim().length < 3) {
      setError("Company ID must be at least 3 characters.");
      return;
    }
    setError("");
    sessionStorage.setItem("vr_company_id", companyId.toUpperCase().trim());
    router.push(`/dashboard`);
  };

  const handleGmLogin = (e) => {
    e.preventDefault();
    if (gmPassword === "silicon_master") {
      sessionStorage.setItem("vr_gm_access", "true");
      router.push("/gm");
    } else {
      setError("Incorrect Game Master password.");
    }
  };

  return (
    <main className="relative min-h-screen grid-bg overflow-hidden flex flex-col items-center justify-center px-6 py-12">

      {/* Ambient glows */}
      <div className="glow-orb-cyan w-[600px] h-[600px] top-[-150px] left-[-150px]" />
      <div className="glow-orb-fuchsia w-[500px] h-[500px] bottom-[-100px] right-[-100px]" />

      {/* Top nav strip */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-3 border-b border-white/5 bg-black/30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse-cyan" />
          <span className="text-[11px] font-mono text-gray-500 tracking-widest uppercase">Network Status: Online</span>
        </div>
        <div className="flex items-center gap-6 text-[11px] font-mono text-gray-600 tracking-widest uppercase">
          <span>Archive</span>
          <span>Protocol v4.0</span>
        </div>
      </div>

      {/* Central hero */}
      <div className="z-10 text-center mb-12 mt-8">
        {/* Logo mark */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border border-cyan-400/30 bg-cyan-400/5 mb-6 mx-auto">
          <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8">
            <path d="M4 16L16 4L28 16L16 28L4 16Z" stroke="#0df2f2" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M10 16L16 10L22 16L16 22L10 16Z" fill="#0df2f2" fillOpacity="0.2" stroke="#0df2f2" strokeWidth="1" />
            <circle cx="16" cy="16" r="3" fill="#0df2f2" />
          </svg>
        </div>

        <h1 className="text-7xl font-bold tracking-tighter neon-text mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          VR NEXUS
        </h1>
        <p className="text-sm font-mono text-gray-500 tracking-[0.3em] uppercase mb-4">
          Silicon &amp; Senses Simulation
        </p>
        <p className="text-cyan-400/70 text-base font-light tracking-wide">
          The year is 2032. Disrupt the VR duopoly.
        </p>
      </div>

      {/* Login cards */}
      <div className="z-10 grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-2xl">

        {/* Error banner */}
        {error && (
          <div className="md:col-span-2 bg-red-900/30 border border-red-500/50 text-red-300 text-sm font-mono px-4 py-3 rounded-xl text-center">
            ⚠ {error}
          </div>
        )}

        {/* Player card */}
        <form onSubmit={handlePlayerLogin} className="glass-panel p-6 flex flex-col gap-4 interactive-hover relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
              </svg>
              <h2 className="text-sm font-mono font-bold text-cyan-400 tracking-widest uppercase">Enter as Player</h2>
            </div>
            <p className="text-xs text-gray-600 font-mono">Deploy into the simulation layers.</p>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1.5">Company ID</label>
            <input
              type="text"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              placeholder="e.g. AERO_DYNAMICS"
              className="w-full bg-black/50 border border-cyan-900/60 rounded-lg px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(13,242,242,0.15)] transition-all placeholder-gray-700"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/50 hover:border-cyan-400 text-cyan-300 text-sm font-bold font-mono transition-all hover:shadow-[0_0_20px_rgba(13,242,242,0.25)] tracking-widest uppercase"
          >
            Launch Dashboard →
          </button>
        </form>

        {/* GM card */}
        <form onSubmit={handleGmLogin} className="glass-panel-amber p-6 flex flex-col gap-4 interactive-hover relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-60" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h2 className="text-sm font-mono font-bold text-amber-400 tracking-widest uppercase">Game Master</h2>
            </div>
            <p className="text-xs text-gray-600 font-mono">Architect the parameters of the Nexus.</p>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1.5">Secure Access Code</label>
            <input
              type="password"
              value={gmPassword}
              onChange={(e) => setGmPassword(e.target.value)}
              placeholder="••••••••••••••"
              className="w-full bg-black/50 border border-amber-900/60 rounded-lg px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-amber-400 focus:shadow-[0_0_10px_rgba(242,166,13,0.15)] transition-all placeholder-gray-700"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/50 hover:border-amber-400 text-amber-300 text-sm font-bold font-mono transition-all hover:shadow-[0_0_20px_rgba(242,166,13,0.25)] tracking-widest uppercase"
          >
            Open Command Center →
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="z-10 mt-12 text-center">
        <p className="text-[10px] font-mono text-gray-700 tracking-widest">
          © 2032 NEXUS NEURAL SYSTEMS · ALL SENSES RESERVED · v4.0.2-BETA
        </p>
      </div>

    </main>
  );
}
