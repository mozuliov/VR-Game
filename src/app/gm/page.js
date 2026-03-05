"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";
import { ASSEMBLY_COST } from "@/lib/engine/constants";

function fmt(n) {
    if (n == null) return "—";
    const abs = Math.abs(Number(n));
    if (abs >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `$${(n / 1000).toFixed(0)}K`;
    return "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

const COMP_COSTS = {
    display: { 1: 120, 2: 150, 3: 250 },
    optics: { 1: 40, 2: 80, 3: 130 },
    tracking: { 1: 60, 2: 120, 3: 180 },
    processor: { 1: 90, 2: 150, 3: 220 }
};

const getUnitCost = (c) => ASSEMBLY_COST + COMP_COSTS.display[c.comp_display_level] + COMP_COSTS.optics[c.comp_optics_level] + COMP_COSTS.tracking[c.comp_tracking_level] + COMP_COSTS.processor[c.comp_processor_level];

// Circular market share indicator
function DonutShare({ pct }) {
    const r = 16, circ = 2 * Math.PI * r;
    const fill = Math.min((pct || 0), 100) / 100 * circ;
    return (
        <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44" width="44" height="44">
                <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                <circle cx="22" cy="22" r={r} fill="none" stroke="#f2a60d" strokeWidth="4"
                    strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
            </svg>
            <span className="text-[9px] font-mono font-bold text-amber-300">{Math.round(pct || 0)}%</span>
        </div>
    );
}

// Horizontal tech bar
function TechBar({ label, value, max = 12, dots = 3 }) {
    const pct = Math.min((value / max) * 100, 100);
    return (
        <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{label}</span>
                <span className="flex gap-1">{Array.from({ length: dots }).map((_, i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                ))}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-700"
                    style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

export default function GameMaster() {
    const router = useRouter();
    const [companies, setCompanies] = useState([]);
    const [market, setMarket] = useState(null);
    const [history, setHistory] = useState([]);
    const [tab, setTab] = useState("feed");
    const [msg, setMsg] = useState("");
    const [growthRate, setGrowthRate] = useState(7);
    const [humanPlayers, setHumanPlayers] = useState([
        { id: "AERO_DYNAMICS", name: "Aero Dynamics", starting_cash: 500000 }
    ]);

    const fetchAll = useCallback(async () => {
        const [compRes, mktRes, histRes] = await Promise.all([
            fetch("/api/companies"), fetch("/api/market"), fetch("/api/history"),
        ]);
        if (compRes.ok) setCompanies(await compRes.json());
        if (mktRes.ok) { const m = await mktRes.json(); setMarket(m); setGrowthRate(m.growth_rate_percent); }
        if (histRes.ok) setHistory(await histRes.json());
    }, []);

    useEffect(() => {
        if (!sessionStorage.getItem("vr_gm_access")) { router.push("/"); return; }
        fetchAll();
    }, [router, fetchAll]);

    const handleInit = async () => {
        if (!confirm(`Reset simulation with ${humanPlayers.length} players? All data lost.`)) return;
        setMsg("Initializing...");
        const res = await fetch("/api/init", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companies: humanPlayers }) });
        const d = await res.json();
        setMsg(res.ok ? `✓ ${d.message || "Reset complete."}` : `✗ ${d.error}`);
        if (res.ok) fetchAll();
    };

    const handleAdvance = async () => {
        setMsg("");
        const res = await fetch("/api/advance-quarter", { method: "POST", headers: { Authorization: "Bearer silicon_master" } });
        if (res.ok) { const j = await res.json(); setMsg(`✓ Advanced to Q${j.new_quarter}.`); fetchAll(); }
        else { const e = await res.json(); setMsg(`✗ ${e.error}`); }
    };

    const handleUpdateGrowth = async () => {
        const res = await fetch("/api/market", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: "Bearer silicon_master" }, body: JSON.stringify({ growth_rate_percent: parseFloat(growthRate) }) });
        if (res.ok) { setMsg(`✓ Growth updated to ${growthRate}%.`); fetchAll(); }
    };

    const handleRollback = async (roundId) => {
        if (!confirm(`Rollback to Q${roundId}?`)) return;
        const res = await fetch(`/api/history/${roundId}`, { method: "POST", headers: { Authorization: "Bearer silicon_master" } });
        if (res.ok) { setMsg(`✓ Rolled back to Q${roundId}.`); fetchAll(); }
        else setMsg("✗ Rollback failed.");
    };

    const totalBrand = companies.reduce((s, c) => s + Math.max(c.brand_equity || 0, 0), 0) || 1;

    const leaderboard = [...companies].sort((a, b) => {
        const score = c => 0.4 * (c.shareholders_equity + c.retained_earnings) + 0.4 * ((c.brand_equity || 0) / totalBrand) * 100000 + 0.2 * (c.brand_equity || 0);
        return score(b) - score(a);
    }).map((c, i) => ({
        ...c, rank: i + 1,
        techScore: c.comp_display_level + c.comp_optics_level + c.comp_tracking_level + c.comp_processor_level,
        totalEquity: c.shareholders_equity + c.retained_earnings,
        mktSharePct: ((c.brand_equity || 0) / totalBrand * 100),
    }));

    const topTwo = leaderboard.slice(0, 2);
    const radarData = [
        { metric: "DISP", ...Object.fromEntries(topTwo.map(c => [c.name, c.comp_display_level])) },
        { metric: "OPT", ...Object.fromEntries(topTwo.map(c => [c.name, c.comp_optics_level])) },
        { metric: "PROC", ...Object.fromEntries(topTwo.map(c => [c.name, c.comp_processor_level])) },
        { metric: "TRAC", ...Object.fromEntries(topTwo.map(c => [c.name, c.comp_tracking_level])) },
    ];

    const RADAR_COLORS = ["#f2a60d", "#0df2f2"];

    const tabs = [
        { id: "feed", label: "Real-Time Feed" },
        { id: "market", label: "Market Ops" },
        { id: "deepdive", label: "Deep Dive" },
        { id: "archives", label: "Archives" },
    ];

    return (
        <div className="min-h-screen bg-[#0a0c0f] text-gray-100 flex flex-col" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>

            {/* ── TOP NAV ── */}
            <nav className="flex items-center gap-6 px-6 py-0 h-12 border-b border-amber-500/20 bg-black/60 backdrop-blur-xl sticky top-0 z-50 flex-shrink-0">
                <div className="flex items-center gap-2 mr-4">
                    <div className="w-6 h-6 rounded-full border border-amber-400/60 flex items-center justify-center">
                        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none">
                            <circle cx="8" cy="8" r="6" stroke="#f2a60d" strokeWidth="1.5" />
                            <circle cx="8" cy="8" r="2.5" fill="#f2a60d" />
                        </svg>
                    </div>
                    <span className="text-amber-400 font-bold text-sm tracking-[0.15em] font-mono uppercase">GM Mission Control</span>
                </div>
                <div className="flex gap-1 h-full">
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`px-4 h-full text-[11px] font-mono font-semibold tracking-widest uppercase border-b-2 transition-all ${tab === t.id ? "border-amber-400 text-amber-300 bg-amber-500/5" : "border-transparent text-gray-600 hover:text-gray-300"}`}>
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="ml-auto flex items-center gap-4">
                    <span className="text-[10px] font-mono text-gray-600">⏱ Q{market?.current_quarter || "—"} · {market?.market_size?.toLocaleString()} units</span>
                    <div className="flex items-center gap-1.5 bg-amber-900/20 border border-amber-500/30 px-3 py-1 rounded text-[10px] font-mono text-amber-300 tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                        SYSTEM STATUS: {companies.filter(c => c.is_frozen).length > 0 ? "ALERT" : "NOMINAL"}
                    </div>
                    <button onClick={fetchAll} className="text-[10px] text-gray-600 hover:text-amber-400 font-mono transition tracking-widest uppercase">Refresh</button>
                    <button onClick={() => { sessionStorage.clear(); router.push("/"); }} className="text-[10px] text-gray-600 hover:text-red-400 font-mono transition tracking-widest uppercase">Exit</button>
                </div>
            </nav>

            {/* ── STATUS MESSAGE ── */}
            {msg && (
                <div className={`mx-4 mt-3 px-4 py-2 rounded border text-xs font-mono flex-shrink-0 ${msg.startsWith("✓") ? "bg-green-900/20 border-green-500/40 text-green-300" : "bg-red-900/20 border-red-500/40 text-red-300"}`}>
                    {msg}
                </div>
            )}

            {/* ── MAIN BODY ── */}
            <div className="flex flex-1 overflow-hidden">

                {/* ── LEFT SIDEBAR ── */}
                <aside className="w-56 flex-shrink-0 border-r border-amber-500/10 bg-black/30 flex flex-col gap-0 overflow-y-auto">

                    {/* Market Conditions */}
                    <div className="p-4 border-b border-white/5">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[9px] font-mono uppercase tracking-widest text-gray-600">Market Conditions</p>
                            <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 12 12" stroke="currentColor"><path strokeWidth="1.5" d="M1 9l3-3 2 2 4-4" /></svg>
                        </div>
                        <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-1">Global Growth Rate</p>
                        <p className="text-2xl font-bold font-mono text-amber-400">
                            {market?.growth_rate_percent > 0 ? "+" : ""}{market?.growth_rate_percent || "—"}%
                        </p>
                        {/* Mini sparkline placeholder */}
                        <div className="h-10 my-2 relative overflow-hidden">
                            <svg viewBox="0 0 100 32" className="w-full h-full" preserveAspectRatio="none">
                                <polyline points="0,28 20,22 40,18 60,14 80,10 100,8"
                                    fill="none" stroke="#f2a60d" strokeWidth="1.5" opacity="0.8" />
                                <polygon points="0,28 20,22 40,18 60,14 80,10 100,8 100,32 0,32"
                                    fill="url(#amberGrad)" opacity="0.15" />
                                <defs>
                                    <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f2a60d" />
                                        <stop offset="100%" stopColor="#f2a60d" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-0.5">Total Market Cap</p>
                        <p className="text-lg font-bold font-mono text-white">
                            {market ? `$${(market.market_size * 850 / 1000).toFixed(1)}B` : "—"}
                            <span className="text-[10px] text-gray-600 ml-1">SH</span>
                        </p>
                    </div>

                    {/* Global Shocks Console */}
                    <div className="p-4 flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-amber-500 text-xs">⚠</span>
                            <p className="text-[9px] font-mono uppercase tracking-widest text-gray-500">Global Shocks Console</p>
                        </div>
                        {[
                            { label: "Chipset Shortage", sub: "Increase production costs by 40%", color: "border-red-500/40 bg-red-900/10 text-red-300", dot: "bg-red-400" },
                            { label: "Market Crash", sub: "Reduce all equity by 15%", color: "border-amber-600/30 bg-amber-900/10 text-amber-300", dot: "bg-amber-400" },
                            { label: "AI Breakthrough", sub: "Boost Tracking tech +2 levels", color: "border-blue-500/40 bg-blue-900/10 text-blue-300", dot: "bg-blue-400" },
                            { label: "Legal Restrictions", sub: "Global VR ban in 3 regions", color: "border-gray-500/30 bg-gray-900/10 text-gray-400", dot: "bg-gray-500" },
                        ].map((shock, i) => (
                            <button key={i} className={`w-full text-left p-2.5 rounded-lg border transition hover:opacity-80 ${shock.color}`}>
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${shock.dot}`} />
                                    <span className="text-[10px] font-mono font-bold tracking-widest uppercase">{shock.label}</span>
                                </div>
                                <p className="text-[9px] font-mono text-gray-500 pl-3">{shock.sub}</p>
                            </button>
                        ))}

                        <div className="mt-2">
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Shock Readiness</p>
                                <p className="text-[9px] font-mono text-amber-400">85%</p>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-400 rounded-full" style={{ width: "85%" }} />
                            </div>
                        </div>
                    </div>

                    {/* Market Growth Control */}
                    <div className="p-4 border-t border-white/5 mt-auto">
                        <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-2">Override Growth %</p>
                        <div className="flex gap-2">
                            <input type="number" step="0.5" min="-10" max="20" value={growthRate}
                                onChange={e => setGrowthRate(e.target.value)}
                                className="flex-1 bg-black/50 border border-amber-900/40 rounded px-2 py-1.5 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-400" />
                            <button onClick={handleUpdateGrowth}
                                className="px-2 py-1 bg-amber-900/30 border border-amber-500/30 text-amber-300 rounded font-mono text-[10px] hover:bg-amber-900/50 transition">
                                Set
                            </button>
                        </div>
                    </div>
                </aside>

                {/* ── CONTENT AREA ── */}
                <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 pb-20">

                    {/* ── REAL-TIME FEED TAB ── */}
                    {tab === "feed" && (
                        <>
                            {/* Corporate Leaderboard */}
                            <div className="bg-black/40 border border-amber-500/15 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-xs font-mono font-bold text-gray-300 uppercase tracking-widest">Corporate Leaderboard</p>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                        <span className="text-[9px] font-mono text-green-400 tracking-widest uppercase">Live Updates</span>
                                    </div>
                                </div>
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[9px] font-mono text-gray-600 uppercase tracking-widest">
                                            <th className="text-left py-2 w-12">Rank</th>
                                            <th className="text-left py-2">Corporation</th>
                                            <th className="text-right py-2">Equity (M)</th>
                                            <th className="text-center py-2">Market Share</th>
                                            <th className="text-right py-2">Trend</th>
                                            <th className="text-right py-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leaderboard.map((c, idx) => {
                                            const eq = c.totalEquity / 1000000;
                                            const isTop = idx === 0;
                                            return (
                                                <tr key={c.company_id} className="border-b border-white/5 hover:bg-amber-500/3 transition">
                                                    <td className="py-3">
                                                        <span className={`text-lg font-bold font-mono ${isTop ? "text-amber-400" : idx === 1 ? "text-gray-400" : "text-gray-700"}`}>
                                                            0{c.rank}
                                                        </span>
                                                    </td>
                                                    <td className="py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded border border-amber-500/30 bg-amber-900/20 flex items-center justify-center">
                                                                <span className="text-[8px] font-mono font-bold text-amber-400">
                                                                    {c.name.slice(0, 2).toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-white">{c.name}</p>
                                                                <p className="text-[9px] font-mono text-gray-600">{c.is_ai ? "AI" : "Human"} · {c.company_id}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={`py-3 text-right font-mono font-bold text-sm tabular-nums ${c.totalEquity >= 0 ? "text-white" : "text-red-400"}`}>
                                                        ${Math.abs(eq).toFixed(1)}
                                                    </td>
                                                    <td className="py-3 text-center">
                                                        <div className="flex justify-center">
                                                            <DonutShare pct={c.mktSharePct} />
                                                        </div>
                                                    </td>
                                                    <td className={`py-3 text-right font-mono text-xs tabular-nums ${c.retained_earnings >= 0 ? "text-green-400" : "text-red-400"}`}>
                                                        {c.retained_earnings >= 0 ? "+" : ""}{((c.retained_earnings || 0) / 1000).toFixed(1)}K
                                                    </td>
                                                    <td className="py-3 text-right">
                                                        <span className={`px-2 py-1 rounded text-[9px] font-mono tracking-widest border ${c.is_frozen
                                                            ? "bg-red-900/40 border-red-700/50 text-red-300"
                                                            : c.retained_earnings > 0
                                                                ? "bg-green-900/20 border-green-700/30 text-green-400"
                                                                : "bg-amber-900/20 border-amber-700/30 text-amber-300"
                                                            }`}>
                                                            {c.is_frozen ? "FROZEN" : c.retained_earnings > 0 ? "STABLE" : "VOLATILE"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {leaderboard.length === 0 && (
                                            <tr><td colSpan={6} className="py-8 text-center text-xs font-mono text-gray-600">No companies initialized. Go to Archives → Config to set up the simulation.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Bottom row: Tech Matrix + Radar */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Tech Comparison Matrix */}
                                <div className="bg-black/40 border border-amber-500/15 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">Tech Comparison Matrix</p>
                                        <span className="text-[9px] font-mono text-amber-400 cursor-pointer hover:text-amber-300 tracking-widest uppercase">Switch View</span>
                                    </div>
                                    <TechBar label="Display Optics" value={companies.reduce((s, c) => s + c.comp_display_level + c.comp_optics_level, 0)} max={companies.length * 6 || 6} dots={4} />
                                    <TechBar label="Spatial Tracking" value={companies.reduce((s, c) => s + c.comp_tracking_level, 0)} max={companies.length * 3 || 3} dots={4} />
                                    <TechBar label="Neuro-Processor" value={companies.reduce((s, c) => s + c.comp_processor_level, 0)} max={companies.length * 3 || 3} dots={3} />
                                    {/* Per-company comparison bars */}
                                    {companies.slice(0, 3).map((c, i) => {
                                        const ts = c.comp_display_level + c.comp_optics_level + c.comp_tracking_level + c.comp_processor_level;
                                        const colors = ["from-amber-500 to-amber-300", "from-cyan-600 to-cyan-400", "from-fuchsia-600 to-fuchsia-400"];
                                        return (
                                            <div key={c.company_id} className="mb-2">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <span className="text-[9px] font-mono text-gray-500">{c.name}</span>
                                                    <span className="text-[9px] font-mono text-gray-600">{ts}/12</span>
                                                </div>
                                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full bg-gradient-to-r ${colors[i]} transition-all duration-700`} style={{ width: `${ts / 12 * 100}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Deep Dive Radar */}
                                <div className="bg-black/40 border border-amber-500/15 rounded-xl p-4">
                                    <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mb-2">Deep Dive Comparison</p>
                                    {topTwo.length >= 2 ? (
                                        <>
                                            <ResponsiveContainer width="100%" height={180}>
                                                <RadarChart outerRadius={65} data={radarData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                                                    <PolarGrid stroke="rgba(255,255,255,0.06)" />
                                                    <PolarAngleAxis dataKey="metric" tick={{ fill: "#6b7280", fontSize: 9, fontFamily: "Space Mono" }} />
                                                    {topTwo.map((c, i) => (
                                                        <Radar key={c.company_id} name={c.name} dataKey={c.name}
                                                            stroke={RADAR_COLORS[i]} fill={RADAR_COLORS[i]} fillOpacity={0.15} strokeWidth={1.5} />
                                                    ))}
                                                    <Tooltip contentStyle={{ background: "#050810", border: "1px solid #1e2d4a", borderRadius: 6, color: "#e2e8f0", fontFamily: "Space Mono", fontSize: 10 }} />
                                                </RadarChart>
                                            </ResponsiveContainer>
                                            <div className="flex gap-4 justify-center mt-1">
                                                {topTwo.map((c, i) => (
                                                    <div key={c.company_id} className="flex items-center gap-1">
                                                        <span className="w-2.5 h-0.5 rounded-full inline-block" style={{ background: RADAR_COLORS[i] }} />
                                                        <span className="text-[9px] font-mono text-gray-500">{c.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-center h-40 text-gray-700 font-mono text-xs">Need ≥2 companies</div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── MARKET OPS TAB ── */}
                    {tab === "market" && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/40 border border-amber-500/15 rounded-xl p-5">
                                <p className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest mb-4">Simulation Engine</p>
                                <button onClick={handleAdvance}
                                    className="w-full py-4 mb-4 rounded-xl bg-amber-900/30 hover:bg-amber-800/50 border border-amber-400/50 text-amber-100 font-bold font-mono text-sm tracking-widest uppercase transition-all hover:shadow-[0_0_20px_rgba(242,166,13,0.2)]">
                                    ⏩ Advance Quarter →
                                </button>
                                <div className="flex items-center gap-2 bg-black/30 rounded-lg p-3 border border-white/5">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-xs font-mono text-gray-400">Ready — Q{market?.current_quarter || 1} awaiting decisions</span>
                                </div>
                            </div>
                            <div className="bg-black/40 border border-amber-500/15 rounded-xl p-5">
                                <p className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest mb-4">Competitive Benchmarks</p>
                                <table className="w-full text-xs font-mono">
                                    <thead>
                                        <tr className="text-[9px] text-gray-600 uppercase tracking-widest border-b border-white/5">
                                            <th className="text-left py-1.5">Company</th>
                                            <th className="text-right py-1.5">GM%</th>
                                            <th className="text-right py-1.5">Debt/Assets</th>
                                            <th className="text-right py-1.5">Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {companies.map(c => {
                                            const uc = getUnitCost(c);
                                            const net = c.fixed_assets_gross - c.accumulated_depreciation;
                                            const ta = c.cash + c.accounts_receivable + c.inventory_units * uc + net;
                                            const debt = c.credit_line + c.bank_loan;
                                            const gm = c.prev_price > 0 ? ((c.prev_price - uc) / c.prev_price * 100).toFixed(1) : "—";
                                            const dr = ta > 0 ? (debt / ta * 100).toFixed(1) : 0;
                                            return (
                                                <tr key={c.company_id} className="border-b border-white/5 hover:bg-amber-500/3">
                                                    <td className="py-2 text-white font-bold">{c.name}</td>
                                                    <td className={`py-2 text-right ${parseFloat(gm) > 30 ? "text-green-400" : "text-amber-400"}`}>{gm}%</td>
                                                    <td className={`py-2 text-right ${parseFloat(dr) > 40 ? "text-red-400" : "text-gray-400"}`}>{dr}%</td>
                                                    <td className="py-2 text-right text-gray-300">{fmt(c.prev_price)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── DEEP DIVE TAB ── */}
                    {tab === "deepdive" && (
                        <div className="bg-black/40 border border-amber-500/15 rounded-xl p-5">
                            <p className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest mb-4">Company Technology Profiles</p>
                            <div className="grid grid-cols-1 gap-4">
                                {companies.map(c => {
                                    const ts = c.comp_display_level + c.comp_optics_level + c.comp_tracking_level + c.comp_processor_level;
                                    const uc = getUnitCost(c);
                                    const comps = [
                                        { label: "Display", level: c.comp_display_level, names: { 1: "LCD", 2: "OLED", 3: "Micro-OLED" } },
                                        { label: "Optics", level: c.comp_optics_level, names: { 1: "Fresnel", 2: "Aspheric", 3: "Pancake" } },
                                        { label: "Tracking", level: c.comp_tracking_level, names: { 1: "3-DoF", 2: "6-DoF", 3: "6-DoF+Eye" } },
                                        { label: "CPU", level: c.comp_processor_level, names: { 1: "Mobile", 2: "Std SoC", 3: "Hi-Perf" } },
                                    ];
                                    return (
                                        <div key={c.company_id} className="bg-black/30 border border-white/8 rounded-xl p-4">
                                            <div className="flex justify-between items-center mb-3">
                                                <div>
                                                    <p className="font-bold text-white text-sm">{c.name}</p>
                                                    <p className="text-[9px] font-mono text-gray-600">{c.is_ai ? "AI" : "Human"} · {c.company_id}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-bold font-mono text-amber-400">{ts}<span className="text-gray-600 text-xs ml-1">/12</span></p>
                                                    <p className="text-[9px] font-mono text-gray-600">{fmt(uc)}/unit</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-4 gap-3">
                                                {comps.map(comp => (
                                                    <div key={comp.label} className="bg-black/30 rounded-lg p-2.5">
                                                        <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-1.5">{comp.label}</p>
                                                        <div className="flex gap-1 mb-1.5">
                                                            {[1, 2, 3].map(i => (
                                                                <div key={i} className={`w-2 h-2 rounded-sm border ${i <= comp.level ? "bg-amber-400 border-amber-300 shadow-[0_0_4px_rgba(242,166,13,0.6)]" : "border-white/15 bg-transparent"}`} />
                                                            ))}
                                                        </div>
                                                        <p className="text-[9px] font-mono text-amber-400">Lvl {comp.level} — {comp.names[comp.level]}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── ARCHIVES TAB (Config + Time Machine) ── */}
                    {tab === "archives" && (
                        <div className="grid grid-cols-2 gap-4">
                            {/* Player Setup */}
                            <div className="bg-black/40 border border-cyan-500/15 rounded-xl p-5">
                                <p className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest mb-4">Player Setup</p>
                                <div className="flex flex-col gap-3">
                                    {humanPlayers.map((p, i) => (
                                        <div key={i} className="flex gap-2 items-center bg-black/30 p-3 rounded-xl border border-white/8">
                                            <div className="flex-1 flex flex-col gap-2">
                                                <input type="text" placeholder="Company ID" value={p.id}
                                                    onChange={e => { const arr = [...humanPlayers]; arr[i].id = e.target.value.toUpperCase().replace(/\s/g, "_"); setHumanPlayers(arr); }}
                                                    className="bg-black/50 border border-white/10 rounded px-2 py-1.5 text-[11px] font-mono text-cyan-400 focus:border-cyan-400 outline-none" />
                                                <input type="text" placeholder="Display Name" value={p.name}
                                                    onChange={e => { const arr = [...humanPlayers]; arr[i].name = e.target.value; setHumanPlayers(arr); }}
                                                    className="bg-black/50 border border-white/10 rounded px-2 py-1.5 text-[11px] font-mono text-white focus:border-cyan-400 outline-none" />
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-600 font-mono">Cash: $</span>
                                                    <input type="number" value={p.starting_cash}
                                                        onChange={e => { const arr = [...humanPlayers]; arr[i].starting_cash = Number(e.target.value); setHumanPlayers(arr); }}
                                                        className="bg-black/50 border border-white/10 rounded px-2 py-1 text-[11px] font-mono text-green-400 focus:border-cyan-400 outline-none w-28" />
                                                </div>
                                            </div>
                                            <button onClick={() => humanPlayers.length > 1 && setHumanPlayers(humanPlayers.filter((_, j) => j !== i))}
                                                disabled={humanPlayers.length <= 1}
                                                className="text-red-500/60 hover:text-red-400 p-2 transition disabled:opacity-20">✕</button>
                                        </div>
                                    ))}
                                    <button onClick={() => setHumanPlayers([...humanPlayers, { id: `PLAYER_${humanPlayers.length + 1}`, name: `Company ${humanPlayers.length + 1}`, starting_cash: 500000 }])}
                                        className="w-full py-2 border border-dashed border-white/15 rounded-xl text-[11px] text-gray-600 hover:text-white hover:border-white/40 transition font-mono">
                                        + Add Human Company
                                    </button>
                                    <button onClick={handleInit}
                                        className="w-full py-3 rounded-xl bg-red-900/20 hover:bg-red-900/40 border border-red-500/40 text-red-200 font-mono text-xs tracking-widest uppercase transition">
                                        ⚠ Reset & Initialize {humanPlayers.length} Players
                                    </button>
                                </div>
                            </div>

                            {/* Time Machine */}
                            <div className="bg-black/40 border border-violet-500/15 rounded-xl p-5">
                                <p className="text-xs font-mono font-bold text-violet-400 uppercase tracking-widest mb-4">⏪ Time Machine — Rollback</p>
                                <p className="text-[10px] font-mono text-gray-600 mb-4">Roll back to any quarter. Subsequent data enters Shadow KPI mode.</p>
                                {history.length === 0 ? (
                                    <p className="text-gray-600 font-mono text-xs">No snapshots yet. Advance at least one quarter first.</p>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {history.map(snap => (
                                            <div key={snap.id} className="flex items-center justify-between bg-black/30 border border-white/8 rounded-lg px-4 py-3">
                                                <div>
                                                    <p className="text-sm font-bold font-mono text-violet-400">Q{snap.round_id}</p>
                                                    <p className="text-[9px] font-mono text-gray-600">{new Date(snap.timestamp).toLocaleString()}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono tracking-widest ${snap.timeline_status === "active" ? "bg-green-900/30 text-green-400 border border-green-800/30" : "bg-yellow-900/30 text-yellow-400 border border-yellow-800/30"}`}>
                                                        {snap.timeline_status === "active" ? "Active" : "Shadow KPI"}
                                                    </span>
                                                    {snap.timeline_status === "active" && (
                                                        <button onClick={() => handleRollback(snap.round_id)}
                                                            className="px-3 py-1.5 bg-violet-900/30 hover:bg-violet-800/50 border border-violet-500/40 text-violet-200 rounded-lg font-mono text-[10px] transition tracking-widest uppercase">
                                                            Rollback
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* ── BOTTOM TIMELINE BAR ── */}
            <div className="fixed bottom-0 left-0 right-0 h-14 bg-black/80 backdrop-blur-xl border-t border-amber-500/15 flex items-center px-4 gap-4 z-50">
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Corporate Timeline</span>
                    {market?.current_quarter && (
                        <span className="text-[9px] font-mono bg-amber-900/40 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded tracking-widest">
                            Phase {market.current_quarter} Active
                        </span>
                    )}
                </div>

                {/* Timeline track */}
                <div className="flex-1 relative flex items-center gap-1 overflow-x-auto">
                    <div className="h-0.5 flex-1 bg-white/5 rounded-full relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-600/30 to-amber-400/10 rounded-full" style={{ width: `${Math.min(((market?.current_quarter || 1) / 8) * 100, 100)}%` }} />
                    </div>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(q => {
                        const curr = market?.current_quarter || 0;
                        return (
                            <button key={q} onClick={() => handleRollback(q)}
                                className={`flex-shrink-0 transition-all ${q < curr ? "opacity-60 hover:opacity-100" : ""}`}>
                                <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[8px] font-mono font-bold ${q === curr ? "border-amber-400 bg-amber-900/50 text-amber-300 shadow-[0_0_8px_rgba(242,166,13,0.4)]" : q < curr ? "border-gray-600 bg-gray-900/50 text-gray-500 hover:border-gray-400" : "border-white/10 text-gray-700"}`}>
                                    Q{q}
                                </div>
                            </button>
                        );
                    })}
                </div>

                <button onClick={handleAdvance}
                    className="flex-shrink-0 flex items-center gap-2 bg-amber-900/30 hover:bg-amber-800/50 border border-amber-400/50 text-amber-200 px-4 py-2 rounded-lg font-mono text-[10px] tracking-widest uppercase transition">
                    ⏩ Time Travel Rollback
                </button>
                <span className="text-[9px] font-mono text-gray-700 flex-shrink-0">CRC: 0x{Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, "0")}</span>
            </div>
        </div>
    );
}
