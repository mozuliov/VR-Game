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
    // In a real app we'd fetch the company here, verify it exists.
    // For now, redirect to the dashboard with the company ID.
    sessionStorage.setItem("vr_company_id", companyId);
    router.push(`/dashboard`);
  };

  const handleGmLogin = (e) => {
    e.preventDefault();
    // Hardcoded GM password for simulation
    if (gmPassword === "silicon_master") {
      sessionStorage.setItem("vr_gm_access", "true");
      router.push("/gm");
    } else {
      setError("Incorrect Game Master password.");
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 relative overflow-hidden">

      {/* Decorative neon effects */}
      <div className="absolute top-[20%] left-[20%] w-64 h-64 bg-fuchsia-600 rounded-full mix-blend-screen filter blur-[100px] opacity-20"></div>
      <div className="absolute bottom-[20%] right-[20%] w-64 h-64 bg-cyan-400 rounded-full mix-blend-screen filter blur-[100px] opacity-20"></div>

      <div className="z-10 text-center mb-12">
        <h1 className="text-6xl font-extrabold tracking-tight neon-text mb-4">
          VR NEXUS
        </h1>
        <p className="text-xl text-gray-400 font-mono">
          SILICON & SENSES
        </p>
      </div>

      <div className="z-10 glass-panel p-8 w-full max-w-md interactive-hover flex flex-col gap-8">

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded text-sm text-center">
            {error}
          </div>
        )}

        {/* Player Login */}
        <form onSubmit={handlePlayerLogin} className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-cyan-400 border-b border-cyan-400/30 pb-2">
            Founder Access
          </h2>
          <div>
            <label className="block text-sm text-gray-400 mb-1 font-mono">Company ID</label>
            <input
              type="text"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              placeholder="e.g. AERO_DYNAMICS"
              className="w-full bg-black/50 border border-cyan-400/30 rounded px-4 py-3 text-white focus:outline-none focus:border-cyan-400 neon-border transition-colors box-border"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400 text-cyan-50 py-3 rounded font-bold transition-all hover:shadow-[0_0_15px_rgba(0,240,255,0.5)]"
          >
            Enter Simulation
          </button>
        </form>

        <div className="h-px bg-white/10 w-full"></div>

        {/* GM Login */}
        <form onSubmit={handleGmLogin} className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-fuchsia-400 border-b border-fuchsia-400/30 pb-2">
            Game Master Override
          </h2>
          <div>
            <label className="block text-sm text-gray-400 mb-1 font-mono">Secret Password</label>
            <input
              type="password"
              value={gmPassword}
              onChange={(e) => setGmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-black/50 border border-fuchsia-400/30 rounded px-4 py-3 text-white focus:outline-none focus:border-fuchsia-400 transition-colors box-border"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-fuchsia-500/20 hover:bg-fuchsia-500/40 border border-fuchsia-400 text-fuchsia-50 py-3 rounded font-bold transition-all hover:shadow-[0_0_15px_rgba(255,0,127,0.5)]"
          >
            Access War Room
          </button>
        </form>

      </div>
    </main>
  );
}
