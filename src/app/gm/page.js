"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { COMPONENT_COSTS, ASSEMBLY_COST } from "@/lib/engine/constants";

function fmt(n) {
    if (n == null) return "—";
    return "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function StatCard({ title, value, color = "text-white", sub }) {
    return (
        <div className="glass-panel-amber p-4">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-mono mb-1">{title}</p>
            <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
            {sub && <p className="text-[10px] text-gray-600 font-mono mt-0.5">{sub}</p>}
        </div>
    );
}

function LevelPips({ level, max = 3 }) {
    return (
        <div className="level-bar">
            {Array.from({ length: max }).map((_, i) => (
                <div key={i} className={`level-pip ${i < level ? "active" : ""}`} />
            ))}
        </div>
    );
}

function SectionTitle({ children, color = "text-amber-400", icon }) {
    return (
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/8">
            {icon && <span>{icon}</span>}
            <h2 className={`text-base font-bold tracking-widest uppercase font-mono ${color}`}>{children}</h2>
        </div>
    );
}

function TabButton({ active, onClick, children }) {
    return (
        <button
            onClick={onClick}
            className={`px-5 py-2 rounded-t-lg text-xs font-mono font-semibold transition-all border-b-2 tracking-widest uppercase ${active
                ? "bg-amber-500/10 border-amber-400 text-amber-300"
                : "border-transparent text-gray-600 hover:text-gray-300 hover:bg-white/5"}`}
        >
            {children}
        </button>
    );
}

const getUnitCost = (c) => {
    const costs = {
        display: { 1: 120, 2: 150, 3: 250 },
        optics: { 1: 40, 2: 80, 3: 130 },
        tracking: { 1: 60, 2: 120, 3: 180 },
        processor: { 1: 90, 2: 150, 3: 220 }
    };
    return ASSEMBLY_COST +
        costs.display[c.comp_display_level] +
        costs.optics[c.comp_optics_level] +
        costs.tracking[c.comp_tracking_level] +
        costs.processor[c.comp_processor_level];
};

export default function GameMaster() {
    const router = useRouter();
    const [companies, setCompanies] = useState([]);
    const [market, setMarket] = useState(null);
    const [history, setHistory] = useState([]);
    const [tab, setTab] = useState("leaderboard");
    const [msg, setMsg] = useState("");
    const [growthRate, setGrowthRate] = useState(7);
    const [humanPlayers, setHumanPlayers] = useState([
        { id: "AERO_DYNAMICS", name: "Aero Dynamics", starting_cash: 500000 }
    ]);

    const fetchAll = useCallback(async () => {
        const [compRes, mktRes, histRes] = await Promise.all([
            fetch("/api/companies"),
            fetch("/api/market"),
            fetch("/api/history"),
        ]);
        if (compRes.ok) setCompanies(await compRes.json());
        if (mktRes.ok) {
            const m = await mktRes.json();
            setMarket(m);
            setGrowthRate(m.growth_rate_percent);
        }
        if (histRes.ok) setHistory(await histRes.json());
    }, []);

    useEffect(() => {
        const isGm = sessionStorage.getItem("vr_gm_access");
        if (!isGm) { router.push("/"); return; }
        fetchAll();
    }, [router, fetchAll]);

    const handleInit = async () => {
        try {
            if (!confirm(`Reset the simulation with ${humanPlayers.length} human players? All current data will be lost.`)) return;
            setMsg("Initializing...");
            const res = await fetch("/api/init", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ companies: humanPlayers })
            });
            const data = await res.json();
            if (res.ok) { setMsg(`✓ ${data.message || "Simulation reset."}`); fetchAll(); }
            else setMsg(`✗ Init failed: ${data.error || "Unknown error"}`);
        } catch (e) { setMsg(`✗ Error: ${e.message}`); }
    };

    const addPlayer = () => {
        const id = `PLAYER_${humanPlayers.length + 1}`;
        setHumanPlayers([...humanPlayers, { id, name: `Company ${humanPlayers.length + 1}`, starting_cash: 500000 }]);
    };
    const removePlayer = (idx) => { if (humanPlayers.length <= 1) return; setHumanPlayers(humanPlayers.filter((_, i) => i !== idx)); };
    const updatePlayer = (idx, field, val) => { const p = [...humanPlayers]; p[idx][field] = val; setHumanPlayers(p); };

    const handleAdvance = async () => {
        setMsg("");
        const res = await fetch("/api/advance-quarter", { method: "POST", headers: { Authorization: "Bearer silicon_master" } });
        if (res.ok) { const j = await res.json(); setMsg(`✓ Advanced to Quarter ${j.new_quarter}.`); fetchAll(); }
        else { const e = await res.json(); setMsg(`✗ Error: ${e.error}`); }
    };

    const handleUpdateGrowth = async () => {
        const res = await fetch("/api/market", {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: "Bearer silicon_master" },
            body: JSON.stringify({ growth_rate_percent: parseFloat(growthRate) }),
        });
        if (res.ok) { setMsg(`✓ Growth rate updated to ${growthRate}%.`); fetchAll(); }
    };

    const handleRollback = async (roundId) => {
        if (!confirm(`Roll back to Q${roundId}? All data after that round will become Shadow KPI.`)) return;
        const res = await fetch(`/api/history/${roundId}`, { method: "POST", headers: { Authorization: "Bearer silicon_master" } });
        if (res.ok) { setMsg(`✓ Rolled back to Quarter ${roundId}.`); fetchAll(); }
        else setMsg("✗ Rollback failed.");
    };

    const buildScore = (c) => {
        const eq = c.shareholders_equity + c.retained_earnings;
        const totalMkt = companies.reduce((s, x) => s + (x.brand_equity || 0), 0) || 1;
        const mktShare = (c.brand_equity || 0) / totalMkt;
        return Math.round(0.4 * eq + 0.4 * mktShare * 100000 + 0.2 * (c.brand_equity || 0));
    };

    const leaderboard = [...companies]
        .sort((a, b) => buildScore(b) - buildScore(a))
        .map((c, i) => ({
            ...c, rank: i + 1, score: buildScore(c),
            techScore: c.comp_display_level + c.comp_optics_level + c.comp_tracking_level + c.comp_processor_level,
            totalEquity: c.shareholders_equity + c.retained_earnings,
            netFixed: c.fixed_assets_gross - c.accumulated_depreciation,
        }));

    return (
        <div className="min-h-screen grid-bg scan-line text-gray-100 relative">
            {/* Amber/orange glows for GM theme */}
            <div className="glow-orb-amber w-[500px] h-[500px] top-[-100px] right-[-50px]" />
            <div className="glow-orb-fuchsia w-[400px] h-[400px] bottom-[0px] left-[-80px]" />

            {/* Nav */}
            <nav className="sticky top-0 z-50 bg-black/60 backdrop-blur-xl border-b border-amber-500/15 px-8 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" style={{ animation: 'pulse 2s infinite' }} />
                        <span className="text-amber-400 font-bold text-base tracking-[0.15em] font-mono">GM MISSION CONTROL</span>
                    </div>
                    <span className="text-gray-700">|</span>
                    <span className="text-gray-500 text-xs font-mono tracking-widest uppercase">War Room · Real-Time Feed</span>
                </div>
                <div className="flex items-center gap-5">
                    <span className="text-gray-600 text-xs font-mono tracking-widest">Q{market?.current_quarter || "—"} · {market?.market_size?.toLocaleString() || "—"} units</span>
                    <button onClick={fetchAll} className="text-[11px] text-gray-700 hover:text-amber-400 transition font-mono tracking-widest uppercase">Refresh</button>
                    <button onClick={() => { sessionStorage.clear(); router.push("/"); }} className="text-[11px] text-gray-700 hover:text-red-400 transition font-mono tracking-widest uppercase">Exit</button>
                </div>
            </nav>

            {/* KPI Strip */}
            <div className="max-w-7xl mx-auto px-8 pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <StatCard title="Current Quarter" value={`Q${market?.current_quarter || "—"}`} color="text-amber-400" />
                    <StatCard title="Market Size" value={`${market?.market_size?.toLocaleString() || "—"} units`} color="text-white" />
                    <StatCard title="Growth Rate" value={`${market?.growth_rate_percent || "—"}%/qtr`} color="text-green-400" />
                    <StatCard title="Companies" value={companies.length} color="text-white" sub={`${companies.filter(c => c.is_frozen).length} in Liquidity Freeze`} />
                </div>

                {/* Status Message */}
                {msg && (
                    <div className={`mb-5 px-4 py-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${msg.startsWith("✓") ? "bg-green-900/20 border-green-500/40 text-green-300" : "bg-red-900/20 border-red-500/40 text-red-300"}`}>
                        {msg}
                    </div>
                )}
            </div>

            {/* Tab Bar */}
            <div className="flex gap-1 px-8 pb-0 max-w-7xl mx-auto">
                {[
                    { id: "leaderboard", label: "🏆 Leaderboard" },
                    { id: "benchmarks", label: "📊 War Room" },
                    { id: "deepdive", label: "🔬 Deep Dive" },
                    { id: "config", label: "⚙️ Config" },
                    { id: "timemachine", label: "⏪ Time Machine" },
                ].map((t) => (
                    <TabButton key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
                        {t.label}
                    </TabButton>
                ))}
            </div>

            <main className="max-w-7xl mx-auto px-8 py-6 relative z-10">

                {/* ─── LEADERBOARD ─── */}
                {tab === "leaderboard" && (
                    <div className="glass-panel-amber p-6">
                        <SectionTitle icon="🏆" color="text-amber-400">Full Leaderboard</SectionTitle>
                        <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-5">Score = 0.4 × Equity + 0.4 × Market Share + 0.2 × Brand Equity</p>
                        <table className="w-full text-xs font-mono">
                            <thead>
                                <tr className="border-b border-white/8 text-gray-600 text-[9px] uppercase tracking-widest">
                                    <th className="text-left py-2 pl-2">#</th>
                                    <th className="text-left py-2">Company</th>
                                    <th className="text-right py-2">Cash</th>
                                    <th className="text-right py-2">Total Equity</th>
                                    <th className="text-right py-2">Brand</th>
                                    <th className="text-right py-2">Tech</th>
                                    <th className="text-right py-2">Debt</th>
                                    <th className="text-right py-2">Status</th>
                                    <th className="text-right py-2 pr-2">Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((c, idx) => (
                                    <tr key={c.company_id} className="border-b border-white/5 hover:bg-amber-500/3 transition">
                                        <td className="py-3 pl-2 font-bold text-base">
                                            <span className={idx === 0 ? "text-amber-400" : idx === 1 ? "text-gray-400" : idx === 2 ? "text-orange-600" : "text-gray-700"}>
                                                #{c.rank}
                                            </span>
                                        </td>
                                        <td className="py-3">
                                            <p className="font-bold text-white">{c.name}</p>
                                            <p className="text-[9px] text-gray-600">{c.is_ai ? "AI Competitor" : "Human Player"} · {c.company_id}</p>
                                        </td>
                                        <td className={`py-3 text-right tabular-nums ${c.cash >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(c.cash)}</td>
                                        <td className={`py-3 text-right tabular-nums ${c.totalEquity >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(c.totalEquity)}</td>
                                        <td className="py-3 text-right text-fuchsia-400 tabular-nums">{c.brand_equity}</td>
                                        <td className="py-3 text-right text-cyan-400 tabular-nums">{c.techScore}/12</td>
                                        <td className="py-3 text-right text-red-400 tabular-nums">{fmt(c.credit_line + c.bank_loan)}</td>
                                        <td className="py-3 text-right">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono tracking-widest ${c.is_frozen ? "bg-red-900/40 text-red-300 border border-red-800/50" : "bg-green-900/30 text-green-400 border border-green-800/30"}`}>
                                                {c.is_frozen ? "FROZEN" : "ACTIVE"}
                                            </span>
                                        </td>
                                        <td className="py-3 text-right pr-2 font-bold text-amber-300 tabular-nums">{c.score.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ─── WAR ROOM ─── */}
                {tab === "benchmarks" && (
                    <div className="flex flex-col gap-6">
                        <div className="glass-panel-amber p-6">
                            <SectionTitle icon="📊" color="text-amber-400">Competitive Benchmarking</SectionTitle>
                            <table className="w-full text-xs font-mono">
                                <thead>
                                    <tr className="border-b border-white/8 text-gray-600 text-[9px] uppercase tracking-widest">
                                        <th className="text-left py-2">Company</th>
                                        <th className="text-right py-2">Gross Margin</th>
                                        <th className="text-right py-2">Inventory Days</th>
                                        <th className="text-right py-2">FA Turnover</th>
                                        <th className="text-right py-2">Net Fixed Assets</th>
                                        <th className="text-right py-2">Debt / Assets</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {companies.map(c => {
                                        const unitCost = getUnitCost(c);
                                        const net = c.fixed_assets_gross - c.accumulated_depreciation;
                                        const totalDebt = c.credit_line + c.bank_loan;
                                        const totalAssets = c.cash + c.accounts_receivable + c.inventory_units * unitCost + net;
                                        const debtRatio = totalAssets > 0 ? (totalDebt / totalAssets * 100).toFixed(1) : 0;
                                        const grossMargin = c.prev_price > 0 ? (((c.prev_price - unitCost) / c.prev_price) * 100).toFixed(1) : "—";
                                        const inventoryDays = c.accounts_payable > 0 ? (c.inventory_units / ((c.accounts_payable / 90) || 1)).toFixed(1) : "—";
                                        const fatRatio = net > 0 ? ((c.prev_price * c.prev_production_volume) / net).toFixed(2) : "—";
                                        return (
                                            <tr key={c.company_id} className="border-b border-white/5 hover:bg-amber-500/3">
                                                <td className="py-3">
                                                    <p className="font-bold text-white">{c.name}</p>
                                                    <p className="text-[9px] text-gray-600">{c.is_ai ? "AI" : "Player"}</p>
                                                </td>
                                                <td className={`py-3 text-right tabular-nums ${parseFloat(grossMargin) > 30 ? "text-green-400" : parseFloat(grossMargin) > 0 ? "text-amber-400" : "text-red-400"}`}>{grossMargin}%</td>
                                                <td className="py-3 text-right text-white tabular-nums">{inventoryDays}</td>
                                                <td className="py-3 text-right text-cyan-400 tabular-nums">{fatRatio}×</td>
                                                <td className="py-3 text-right text-white tabular-nums">{fmt(net)}</td>
                                                <td className={`py-3 text-right tabular-nums ${parseFloat(debtRatio) > 40 ? "text-red-400" : "text-gray-300"}`}>{debtRatio}%</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Liquidity Freeze Watch */}
                        <div className="glass-panel-amber p-6">
                            <SectionTitle icon="⚠️" color="text-red-400">Liquidity Freeze Watch</SectionTitle>
                            {companies.filter(c => c.is_frozen || c.credit_line > 0 || c.bank_loan > 0).length === 0 ? (
                                <p className="text-gray-600 font-mono text-xs">No companies in distress this quarter.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {companies.filter(c => c.is_frozen || c.credit_line > 0 || c.bank_loan > 0).map(c => (
                                        <div key={c.company_id} className={`rounded-xl p-4 border ${c.is_frozen ? "bg-red-900/15 border-red-500/40" : "bg-amber-900/10 border-amber-600/20"}`}>
                                            <p className="font-bold text-white text-sm mb-2">{c.name} {c.is_frozen && <span className="text-red-400 text-[10px] font-mono ml-2 tracking-widest">FROZEN</span>}</p>
                                            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-gray-500">
                                                <span>Cash: <span className={c.cash < 50000 ? "text-red-400" : "text-white"}>{fmt(c.cash)}</span></span>
                                                <span>Credit: <span className="text-amber-400">{fmt(c.credit_line)}</span></span>
                                                <span>Bank Loan: <span className="text-orange-400">{fmt(c.bank_loan)}</span></span>
                                                <span>Retained: <span className={c.retained_earnings < 0 ? "text-red-400" : "text-green-400"}>{fmt(c.retained_earnings)}</span></span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ─── DEEP DIVE ─── */}
                {tab === "deepdive" && (
                    <div className="glass-panel-amber p-6">
                        <SectionTitle icon="🔬" color="text-cyan-300">Company Tech Comparison Matrix</SectionTitle>
                        <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-5">Component levels and build costs for all active companies</p>
                        <div className="grid grid-cols-1 gap-4">
                            {companies.map(c => {
                                const comps = [
                                    { key: "display", label: "Display", level: c.comp_display_level, names: { 1: "LCD", 2: "OLED", 3: "Micro-OLED" } },
                                    { key: "optics", label: "Optics", level: c.comp_optics_level, names: { 1: "Fresnel", 2: "Aspheric", 3: "Pancake" } },
                                    { key: "tracking", label: "Tracking", level: c.comp_tracking_level, names: { 1: "3-DoF", 2: "6-DoF", 3: "6-DoF+Eye" } },
                                    { key: "processor", label: "CPU", level: c.comp_processor_level, names: { 1: "Mobile", 2: "Std SoC", 3: "Hi-Perf" } },
                                ];
                                const ts = c.comp_display_level + c.comp_optics_level + c.comp_tracking_level + c.comp_processor_level;
                                const uc = getUnitCost(c);
                                return (
                                    <div key={c.company_id} className={`bg-black/30 border rounded-xl p-4 ${c.is_frozen ? "border-red-500/30" : "border-white/8"}`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <p className="font-bold text-white text-sm">{c.name}</p>
                                                <p className="text-[9px] font-mono text-gray-600">{c.is_ai ? "AI Competitor" : "Human Player"} · {c.company_id}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold font-mono text-amber-400">{ts}<span className="text-gray-600 text-xs">/12</span></p>
                                                <p className="text-[9px] font-mono text-gray-600">Cost: {fmt(uc)}/unit</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 gap-3">
                                            {comps.map(comp => (
                                                <div key={comp.key} className="bg-black/30 rounded-lg p-2.5">
                                                    <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-1.5">{comp.label}</p>
                                                    <LevelPips level={comp.level} />
                                                    <p className="text-[9px] font-mono text-cyan-400 mt-1.5">Lvl {comp.level} — {comp.names[comp.level]}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ─── CONFIG ─── */}
                {tab === "config" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Player Setup */}
                        <div className="glass-panel-amber p-6 border-l-4 border-l-cyan-500">
                            <SectionTitle icon="👥" color="text-cyan-300">Player Setup</SectionTitle>
                            <p className="text-[10px] font-mono text-gray-600 mb-4">Configure human-driven companies before resetting the simulation.</p>
                            <div className="flex flex-col gap-3">
                                {humanPlayers.map((p, i) => (
                                    <div key={i} className="flex gap-2 items-center bg-black/30 p-3 rounded-xl border border-white/8">
                                        <div className="flex-1 flex flex-col gap-2">
                                            <input
                                                type="text" placeholder="Company ID" value={p.id}
                                                onChange={e => updatePlayer(i, "id", e.target.value.toUpperCase().replace(/\s/g, "_"))}
                                                className="bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-cyan-400 focus:border-cyan-400 outline-none" />
                                            <input
                                                type="text" placeholder="Display Name" value={p.name}
                                                onChange={e => updatePlayer(i, "name", e.target.value)}
                                                className="bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-white focus:border-cyan-400 outline-none" />
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-600 font-mono">Cash: $</span>
                                                <input
                                                    type="number" value={p.starting_cash}
                                                    onChange={e => updatePlayer(i, "starting_cash", Number(e.target.value))}
                                                    className="bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-green-400 focus:border-cyan-400 outline-none w-32" />
                                            </div>
                                        </div>
                                        <button onClick={() => removePlayer(i)} disabled={humanPlayers.length <= 1}
                                            className="text-red-500/60 hover:text-red-400 p-2 transition text-lg disabled:opacity-20">✕</button>
                                    </div>
                                ))}
                                <button onClick={addPlayer}
                                    className="w-full py-2 border border-dashed border-white/15 rounded-xl text-[11px] text-gray-600 hover:text-white hover:border-white/40 transition font-mono tracking-widest">
                                    + Add Human Company
                                </button>
                                <div className="mt-2 pt-4 border-t border-white/8">
                                    <button onClick={handleInit}
                                        className="w-full py-3 rounded-xl bg-red-900/20 hover:bg-red-900/40 border border-red-500/50 text-red-200 font-mono text-xs transition tracking-widest uppercase">
                                        ⚠ [DANGER] Reset & Initialize {humanPlayers.length} Players
                                    </button>
                                    <p className="text-[9px] text-center text-gray-700 font-mono mt-2">This will wipe the database and create starting ledgers for all companies.</p>
                                </div>
                            </div>
                        </div>

                        {/* Simulation Engine */}
                        <div className="flex flex-col gap-6">
                            <div className="glass-panel-amber p-6 border-l-4 border-l-amber-500">
                                <SectionTitle icon="⚡" color="text-amber-400">Simulation Engine</SectionTitle>
                                <div className="flex flex-col gap-4">
                                    <button onClick={handleAdvance}
                                        className="py-4 rounded-xl bg-amber-900/30 hover:bg-amber-800/50 border border-amber-400/60 text-amber-100 font-bold font-mono transition-all hover:shadow-[0_0_20px_rgba(242,166,13,0.25)] text-sm tracking-widest uppercase">
                                        ⏩ Advance Quarter →
                                    </button>
                                    <div className="flex items-center gap-3 bg-black/30 rounded-xl p-3 border border-white/5">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-xs font-mono text-gray-400">Engine Ready — Q{market?.current_quarter || 1} awaiting decisions</span>
                                    </div>
                                </div>
                            </div>

                            {/* Market Parameters */}
                            <div className="glass-panel-amber p-6 border-l-4 border-l-green-500">
                                <SectionTitle icon="📈" color="text-green-400">Market Parameters</SectionTitle>
                                <div className="flex flex-col gap-4">
                                    <div>
                                        <label className="block text-[10px] text-green-400/80 font-mono uppercase tracking-widest mb-1.5">Quarterly Growth Rate (%)</label>
                                        <div className="flex gap-3">
                                            <input type="number" step="0.5" min="-10" max="20" value={growthRate} onChange={e => setGrowthRate(e.target.value)}
                                                className="flex-1 bg-black/40 border border-green-900/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-400 transition font-mono" />
                                            <button onClick={handleUpdateGrowth}
                                                className="px-4 py-2 bg-green-900/30 hover:bg-green-800/50 border border-green-500/50 text-green-200 rounded-lg font-mono text-xs transition tracking-widest uppercase">
                                                Update
                                            </button>
                                        </div>
                                        <p className="text-[9px] text-gray-600 mt-1 font-mono">Default: 7%. Set negative for Shock events.</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-orange-400/80 font-mono uppercase tracking-widest mb-2">Global Shocks Console</p>
                                        <div className="flex flex-col gap-2">
                                            {[
                                                { label: "Chipset Shortage", sub: "+20% L3 Processor cost" },
                                                { label: "OLED Breakthrough", sub: "−15% L2 Display cost" },
                                                { label: "Consumer Report", sub: "Halve ValueVirtua brand equity" },
                                            ].map((shock, i) => (
                                                <div key={i} className="flex justify-between items-center bg-black/30 border border-orange-500/15 rounded-lg p-3">
                                                    <div>
                                                        <p className="text-[11px] font-mono text-gray-300 font-bold">{shock.label}</p>
                                                        <p className="text-[9px] font-mono text-gray-600">{shock.sub}</p>
                                                    </div>
                                                    <button className="text-[10px] px-3 py-1.5 bg-orange-900/30 border border-orange-500/40 text-orange-300 rounded-lg font-mono hover:bg-orange-900/60 transition tracking-widest uppercase">
                                                        Trigger
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── TIME MACHINE ─── */}
                {tab === "timemachine" && (
                    <div className="flex flex-col gap-6">
                        <div className="glass-panel-amber p-6 border-l-4 border-l-violet-500">
                            <SectionTitle icon="⏪" color="text-violet-400">Time Machine — Quarter Rollback</SectionTitle>
                            <p className="text-[10px] font-mono text-gray-600 mb-5">Roll back to any previous quarter. Subsequent data enters Shadow KPI mode for War Room comparison.</p>

                            {/* Timeline visualization */}
                            {history.length > 0 && (
                                <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
                                    {history.map((snap, i) => (
                                        <div key={snap.id} className="flex items-center gap-1 flex-shrink-0">
                                            <div className={`flex flex-col items-center gap-1 cursor-pointer group ${snap.timeline_status === "shadow" ? "opacity-50" : ""}`}
                                                onClick={() => snap.timeline_status === "active" && handleRollback(snap.round_id)}>
                                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[9px] font-mono font-bold transition-all group-hover:scale-110 ${snap.timeline_status === "active" ? "border-violet-400 text-violet-300 bg-violet-900/30" : "border-yellow-600/50 text-yellow-400 bg-yellow-900/20"}`}>
                                                    Q{snap.round_id}
                                                </div>
                                                <span className={`text-[8px] font-mono ${snap.timeline_status === "active" ? "text-violet-500" : "text-yellow-600"}`}>
                                                    {snap.timeline_status === "active" ? "Active" : "Shadow"}
                                                </span>
                                            </div>
                                            {i < history.length - 1 && <div className="w-6 h-0.5 bg-white/10 flex-shrink-0" />}
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <div className="w-6 h-0.5 bg-white/5" />
                                        <div className="w-8 h-8 rounded-full border-2 border-dashed border-white/15 flex items-center justify-center text-[9px] font-mono text-gray-700">
                                            Q{market?.current_quarter || "—"}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {history.length === 0 ? (
                                <p className="text-gray-600 font-mono text-xs">No snapshots available. Advance at least one quarter first.</p>
                            ) : (
                                <table className="w-full text-xs font-mono">
                                    <thead>
                                        <tr className="border-b border-white/8 text-gray-600 text-[9px] uppercase tracking-widest">
                                            <th className="text-left py-2">Round</th>
                                            <th className="text-left py-2">Saved At</th>
                                            <th className="text-left py-2">Timeline</th>
                                            <th className="text-right py-2">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map(snap => (
                                            <tr key={snap.id} className="border-b border-white/5 hover:bg-white/3">
                                                <td className="py-3 text-violet-400 font-bold">Q{snap.round_id}</td>
                                                <td className="py-3 text-gray-500">{new Date(snap.timestamp).toLocaleString()}</td>
                                                <td className="py-3">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono tracking-widest ${snap.timeline_status === "active" ? "bg-green-900/30 text-green-400 border border-green-800/30" : "bg-yellow-900/30 text-yellow-400 border border-yellow-800/30"}`}>
                                                        {snap.timeline_status === "active" ? "Active" : "Shadow KPI"}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-right">
                                                    {snap.timeline_status === "active" && (
                                                        <button onClick={() => handleRollback(snap.round_id)}
                                                            className="px-4 py-1.5 bg-violet-900/30 hover:bg-violet-800/50 border border-violet-500/50 text-violet-200 rounded-lg font-mono text-[10px] transition tracking-widest uppercase">
                                                            Rollback to Q{snap.round_id}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Shadow KPI */}
                        {history.some(h => h.timeline_status === "shadow") && (
                            <div className="glass-panel-amber p-6 border-l-4 border-l-yellow-500">
                                <SectionTitle icon="🔀" color="text-yellow-400">Shadow KPI Review — Old Timeline</SectionTitle>
                                <p className="text-[10px] font-mono text-gray-600 mb-4">These rounds represent the branched timeline after the rollback. Use for War Room comparison.</p>
                                <div className="flex flex-col gap-2">
                                    {history.filter(h => h.timeline_status === "shadow").map(snap => (
                                        <div key={snap.id} className="flex items-center justify-between bg-yellow-900/10 border border-yellow-800/30 rounded-xl px-4 py-3">
                                            <span className="text-yellow-400 font-bold font-mono text-sm">Q{snap.round_id} (Shadow)</span>
                                            <span className="text-gray-600 font-mono text-xs">{new Date(snap.timestamp).toLocaleString()}</span>
                                            <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-yellow-900/40 text-yellow-300 border border-yellow-800/30 tracking-widest">Shadow KPI</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
