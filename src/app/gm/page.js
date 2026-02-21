"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

function fmt(n) {
    if (n == null) return "—";
    return "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function StatCard({ title, value, color = "text-white", sub }) {
    return (
        <div className="bg-black/40 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{title}</p>
            <p className={`text-xl font-mono font-bold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
        </div>
    );
}

export default function GameMaster() {
    const router = useRouter();
    const [companies, setCompanies] = useState([]);
    const [market, setMarket] = useState(null);
    const [history, setHistory] = useState([]);
    const [tab, setTab] = useState("leaderboard");
    const [msg, setMsg] = useState("");
    const [growthRate, setGrowthRate] = useState(7);

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
        if (!confirm("Reset the entire simulation? All data will be lost.")) return;
        const res = await fetch("/api/init", { method: "POST" });
        if (res.ok) { setMsg("✓ Simulation reset. All companies initialized."); fetchAll(); }
        else setMsg("✗ Init failed.");
    };

    const handleAdvance = async () => {
        setMsg("");
        const res = await fetch("/api/advance-quarter", {
            method: "POST",
            headers: { Authorization: "Bearer silicon_master" },
        });
        if (res.ok) {
            const json = await res.json();
            setMsg(`✓ Advanced to Quarter ${json.new_quarter}.`);
            fetchAll();
        } else {
            const err = await res.json();
            setMsg(`✗ Error: ${err.error}`);
        }
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
        if (!confirm(`Roll back to Q${roundId}? All data after that round will be put into Shadow KPI mode.`)) return;
        const res = await fetch(`/api/history/${roundId}`, {
            method: "POST",
            headers: { Authorization: "Bearer silicon_master" },
        });
        if (res.ok) { setMsg(`✓ Rolled back to Quarter ${roundId}.`); fetchAll(); }
        else setMsg("✗ Rollback failed.");
    };

    // Scoring helper
    const buildScore = (c) => {
        const eq = c.shareholders_equity + c.retained_earnings;
        const totalMkt = companies.reduce((s, x) => s + (x.brand_equity || 0), 0) || 1;
        const mktShare = (c.brand_equity || 0) / totalMkt;
        return Math.round(0.4 * eq + 0.4 * mktShare * 100000 + 0.2 * (c.brand_equity || 0));
    };

    const leaderboard = [...companies]
        .sort((a, b) => buildScore(b) - buildScore(a))
        .map((c, i) => ({
            ...c,
            rank: i + 1,
            score: buildScore(c),
            techScore: c.comp_display_level + c.comp_optics_level + c.comp_tracking_level + c.comp_processor_level,
            totalEquity: c.shareholders_equity + c.retained_earnings,
            netFixed: c.fixed_assets_gross - c.accumulated_depreciation,
        }));

    return (
        <div className="min-h-screen text-gray-100 relative">
            {/* Background glows */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 right-0 w-96 h-96 bg-fuchsia-500 rounded-full mix-blend-screen filter blur-[140px] opacity-8" />
                <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-violet-500 rounded-full mix-blend-screen filter blur-[140px] opacity-8" />
            </div>

            {/* Nav */}
            <nav className="sticky top-0 z-50 glass-panel rounded-none border-0 border-b border-fuchsia-500/20 px-8 py-3 flex items-center justify-between">
                <div>
                    <span className="text-fuchsia-400 font-extrabold text-lg tracking-wider">WAR ROOM</span>
                    <span className="ml-3 text-gray-500 text-sm font-mono">/ Game Master Control</span>
                </div>
                <div className="flex items-center gap-6">
                    <span className="text-gray-500 text-sm font-mono">Q{market?.current_quarter || "—"} · {market?.market_size?.toLocaleString()} units</span>
                    <button onClick={fetchAll} className="text-xs text-gray-600 hover:text-fuchsia-400 transition font-mono">[Refresh]</button>
                    <button onClick={() => { sessionStorage.clear(); router.push("/"); }} className="text-xs text-gray-600 hover:text-red-400 transition font-mono">[Exit]</button>
                </div>
            </nav>

            {/* Tab Bar */}
            <div className="flex gap-1 px-8 pt-6 pb-0 max-w-7xl mx-auto">
                {[
                    { id: "leaderboard", label: "🏆 Leaderboard" },
                    { id: "benchmarks", label: "📊 War Room" },
                    { id: "config", label: "⚙️ Config" },
                    { id: "timemachine", label: "⏪ Time Machine" },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-5 py-2 rounded-t-lg text-sm font-semibold transition-all border-b-2 ${tab === t.id
                                ? "bg-fuchsia-500/10 border-fuchsia-400 text-fuchsia-300"
                                : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5"
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <main className="max-w-7xl mx-auto px-8 py-6 relative z-10">

                {/* Status Message */}
                {msg && (
                    <div className={`mb-6 px-4 py-3 rounded border text-sm font-mono ${msg.startsWith("✓") ? "bg-green-900/30 border-green-500 text-green-300" : "bg-red-900/30 border-red-500 text-red-300"}`}>
                        {msg}
                    </div>
                )}

                {/* Market KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatCard title="Current Quarter" value={`Q${market?.current_quarter || "—"}`} color="text-fuchsia-400" />
                    <StatCard title="Market Size" value={`${market?.market_size?.toLocaleString() || "—"} units`} />
                    <StatCard title="Growth Rate" value={`${market?.growth_rate_percent || "—"}% / qtr`} color="text-green-400" />
                    <StatCard title="Companies" value={companies.length} sub={`${companies.filter(c => c.is_frozen).length} frozen`} />
                </div>

                {/* ─── LEADERBOARD TAB ─── */}
                {tab === "leaderboard" && (
                    <div className="glass-panel p-6">
                        <h2 className="text-2xl font-bold mb-2 text-fuchsia-400 border-b border-white/10 pb-2">🏆 Full Leaderboard</h2>
                        <p className="text-xs text-gray-500 font-mono mb-6">Score = 0.4 × Equity + 0.4 × Market Share + 0.2 × Brand Equity</p>
                        <table className="w-full text-sm font-mono">
                            <thead>
                                <tr className="border-b border-white/10 text-gray-500 text-xs uppercase">
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
                                    <tr key={c.company_id} className="border-b border-white/5 hover:bg-white/5 transition">
                                        <td className="py-3 pl-2 font-bold text-lg">
                                            <span className={idx === 0 ? "text-yellow-400" : idx === 1 ? "text-gray-400" : idx === 2 ? "text-orange-600" : "text-gray-600"}>
                                                #{c.rank}
                                            </span>
                                        </td>
                                        <td className="py-3">
                                            <p className="font-bold text-white">{c.name}</p>
                                            <p className="text-xs text-gray-600">{c.is_ai ? "AI" : "Player"} · {c.company_id}</p>
                                        </td>
                                        <td className={`py-3 text-right ${c.cash >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(c.cash)}</td>
                                        <td className={`py-3 text-right ${c.totalEquity >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(c.totalEquity)}</td>
                                        <td className="py-3 text-right text-fuchsia-400">{c.brand_equity}</td>
                                        <td className="py-3 text-right text-yellow-400">{c.techScore}/12</td>
                                        <td className="py-3 text-right text-red-400">{fmt(c.credit_line + c.bank_loan)}</td>
                                        <td className="py-3 text-right">
                                            <span className={`px-2 py-0.5 rounded text-xs font-mono ${c.is_frozen ? "bg-red-900/40 text-red-300" : "bg-green-900/40 text-green-300"}`}>
                                                {c.is_frozen ? "FROZEN" : "ACTIVE"}
                                            </span>
                                        </td>
                                        <td className="py-3 text-right pr-2 font-bold text-white">{c.score.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ─── WAR ROOM / BENCHMARKS TAB ─── */}
                {tab === "benchmarks" && (
                    <div className="flex flex-col gap-8">
                        <div className="glass-panel p-6">
                            <h2 className="text-2xl font-bold mb-6 text-fuchsia-400 border-b border-white/10 pb-2">📊 Competitive Benchmarking</h2>
                            <table className="w-full text-sm font-mono">
                                <thead>
                                    <tr className="border-b border-white/10 text-gray-500 text-xs uppercase">
                                        <th className="text-left py-2">Company</th>
                                        <th className="text-right py-2">Gross Margin</th>
                                        <th className="text-right py-2">Inventory Days</th>
                                        <th className="text-right py-2">Fixed Asset Turn.</th>
                                        <th className="text-right py-2">Net Fixed Assets</th>
                                        <th className="text-right py-2">Debt / Assets</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {companies.map(c => {
                                        const unitCost = 50 + [c.comp_display_level, c.comp_optics_level, c.comp_tracking_level, c.comp_processor_level]
                                            .reduce((s, l, i) => {
                                                const k = ["display", "optics", "tracking", "processor"][i];
                                                const costs = { display: { 1: 80, 2: 150, 3: 300 }, optics: { 1: 20, 2: 60, 3: 120 }, tracking: { 1: 30, 2: 100, 3: 250 }, processor: { 1: 50, 2: 120, 3: 280 } };
                                                return s + costs[k][l];
                                            }, 0);
                                        const net = c.fixed_assets_gross - c.accumulated_depreciation;
                                        const totalDebt = c.credit_line + c.bank_loan;
                                        const totalAssets = c.cash + c.accounts_receivable + c.inventory_units * unitCost + net;
                                        const debtRatio = totalAssets > 0 ? (totalDebt / totalAssets * 100).toFixed(1) : 0;
                                        const rev = 0; // Would need historical data
                                        const grossMargin = c.prev_price > 0 ? (((c.prev_price - unitCost) / c.prev_price) * 100).toFixed(1) : "—";
                                        const inventoryDays = c.accounts_payable > 0 ? (c.inventory_units / ((c.accounts_payable / 90) || 1)).toFixed(1) : "—";
                                        const fatRatio = net > 0 ? ((c.prev_price * c.prev_production_volume) / net).toFixed(2) : "—";
                                        return (
                                            <tr key={c.company_id} className="border-b border-white/5 hover:bg-white/5">
                                                <td className="py-3">
                                                    <p className="font-bold text-white">{c.name}</p>
                                                    <p className="text-xs text-gray-600">{c.is_ai ? "AI" : "Player"}</p>
                                                </td>
                                                <td className="py-3 text-right text-green-400">{grossMargin}%</td>
                                                <td className="py-3 text-right text-yellow-400">{inventoryDays}</td>
                                                <td className="py-3 text-right text-cyan-400">{fatRatio}×</td>
                                                <td className="py-3 text-right text-white">{fmt(net)}</td>
                                                <td className={`py-3 text-right ${parseFloat(debtRatio) > 40 ? "text-red-400" : "text-gray-300"}`}>{debtRatio}%</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Liquidity Freeze / Pivot Cases */}
                        <div className="glass-panel p-6">
                            <h2 className="text-2xl font-bold mb-4 text-orange-400 border-b border-white/10 pb-2">⚠ Pivot Cases — Liquidity Watch</h2>
                            {companies.filter(c => c.is_frozen || c.credit_line > 0 || c.bank_loan > 0).length === 0 ? (
                                <p className="text-gray-500 font-mono text-sm">No companies in distress this quarter.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {companies
                                        .filter(c => c.is_frozen || c.credit_line > 0 || c.bank_loan > 0)
                                        .map(c => (
                                            <div key={c.company_id} className={`rounded-xl p-4 border ${c.is_frozen ? "bg-red-900/20 border-red-500" : "bg-yellow-900/10 border-yellow-600/30"}`}>
                                                <p className="font-bold text-white mb-1">{c.name} {c.is_frozen && <span className="text-red-400 text-xs ml-2">FROZEN</span>}</p>
                                                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-gray-400">
                                                    <span>Cash: <span className={c.cash < 50000 ? "text-red-400" : "text-white"}>{fmt(c.cash)}</span></span>
                                                    <span>Credit: <span className="text-yellow-400">{fmt(c.credit_line)}</span></span>
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

                {/* ─── CONFIG TAB ─── */}
                {tab === "config" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Engine Controls */}
                        <div className="glass-panel p-6 border-l-4 border-l-red-500">
                            <h2 className="text-2xl font-bold mb-6 text-white border-b border-white/10 pb-2">Engine Controls</h2>
                            <div className="flex flex-col gap-4">
                                <button onClick={handleAdvance}
                                    className="py-4 rounded bg-fuchsia-900/40 hover:bg-fuchsia-800/60 border border-fuchsia-400 text-fuchsia-100 font-bold transition-all hover:shadow-[0_0_20px_rgba(255,0,127,0.4)] text-lg">
                                    ⏩ Advance Quarter →
                                </button>
                                <button onClick={handleInit}
                                    className="py-3 rounded bg-red-900/30 hover:bg-red-900/50 border border-red-500 text-red-100 font-mono transition">
                                    ⚠ [DANGER] Reset Entire Simulation
                                </button>
                            </div>
                        </div>

                        {/* Market Parameters */}
                        <div className="glass-panel p-6 border-l-4 border-l-green-500">
                            <h2 className="text-2xl font-bold mb-6 text-white border-b border-white/10 pb-2">Market Parameters</h2>
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-xs text-green-300 mb-2 font-mono uppercase">Quarterly Market Growth Rate (%)</label>
                                    <div className="flex gap-3">
                                        <input type="number" step="0.5" min="-10" max="20" value={growthRate} onChange={e => setGrowthRate(e.target.value)}
                                            className="flex-1 bg-black/50 border border-green-900 rounded px-3 py-2 text-white focus:outline-none focus:border-green-400 transition font-mono" />
                                        <button onClick={handleUpdateGrowth} className="px-4 py-2 bg-green-900/40 hover:bg-green-800/60 border border-green-500 text-green-100 rounded font-mono text-sm transition">
                                            Update
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1 font-mono">Default: 7%. Can be set negative for Shock events.</p>
                                </div>

                                <div className="mt-4">
                                    <p className="text-sm font-bold text-white mb-3">External Shock Presets</p>
                                    <div className="flex flex-col gap-2">
                                        {[
                                            { label: "Q3: Chipset Shortage (+20% L3 Processor cost)", action: null },
                                            { label: "Q5: OLED Breakthrough (−15% L2 Display permanently)", action: null },
                                            { label: "Q6: Consumer Report — Halve ValueVirtua Brand Equity", action: null },
                                        ].map((shock, i) => (
                                            <div key={i} className="flex justify-between items-center bg-black/30 border border-orange-500/20 rounded p-3">
                                                <p className="text-xs font-mono text-gray-400">{shock.label}</p>
                                                <button className="text-xs px-3 py-1 bg-orange-900/40 border border-orange-500 text-orange-300 rounded font-mono hover:bg-orange-900/70 transition">
                                                    Trigger
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── TIME MACHINE TAB ─── */}
                {tab === "timemachine" && (
                    <div className="flex flex-col gap-6">
                        <div className="glass-panel p-6 border-l-4 border-l-violet-500">
                            <h2 className="text-2xl font-bold mb-2 text-violet-400 border-b border-white/10 pb-2">⏪ Time Machine — Rollback</h2>
                            <p className="text-xs text-gray-500 font-mono mb-6">
                                Roll back to any previous quarter. All subsequent data is moved to "Shadow KPI" mode for War Room comparison.
                                Shadow KPIs represent the old timeline.
                            </p>

                            {history.length === 0 ? (
                                <p className="text-gray-500 font-mono text-sm">No snapshots available yet. Advance at least one quarter first.</p>
                            ) : (
                                <table className="w-full text-sm font-mono">
                                    <thead>
                                        <tr className="border-b border-white/10 text-gray-500 text-xs uppercase">
                                            <th className="text-left py-2">Round</th>
                                            <th className="text-left py-2">Saved At</th>
                                            <th className="text-left py-2">Timeline</th>
                                            <th className="text-right py-2">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map(snap => (
                                            <tr key={snap.id} className="border-b border-white/5 hover:bg-white/5">
                                                <td className="py-3 text-violet-400 font-bold">Q{snap.round_id}</td>
                                                <td className="py-3 text-gray-400">{new Date(snap.timestamp).toLocaleString()}</td>
                                                <td className="py-3">
                                                    <span className={`px-2 py-0.5 rounded text-xs ${snap.timeline_status === "active" ? "bg-green-900/40 text-green-300" : "bg-yellow-900/40 text-yellow-300"}`}>
                                                        {snap.timeline_status === "active" ? "Active" : "Shadow KPI"}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-right">
                                                    {snap.timeline_status === "active" && (
                                                        <button
                                                            onClick={() => handleRollback(snap.round_id)}
                                                            className="px-4 py-1.5 bg-violet-900/40 hover:bg-violet-800/60 border border-violet-500 text-violet-200 rounded font-mono text-xs transition">
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

                        {/* Shadow KPI comparison */}
                        {history.some(h => h.timeline_status === "shadow") && (
                            <div className="glass-panel p-6 border-l-4 border-l-yellow-500">
                                <h2 className="text-xl font-bold mb-4 text-yellow-400">🔀 Shadow KPI Review</h2>
                                <p className="text-xs text-gray-500 font-mono mb-4">
                                    The following rounds represent the "old timeline" data, preserved after a rollback.
                                    Use this to compare outcomes in the War Room briefing.
                                </p>
                                <table className="w-full text-sm font-mono">
                                    <thead>
                                        <tr className="border-b border-white/10 text-gray-500 text-xs uppercase">
                                            <th className="text-left py-2">Round</th>
                                            <th className="text-left py-2">Timestamp</th>
                                            <th className="text-right py-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.filter(h => h.timeline_status === "shadow").map(snap => (
                                            <tr key={snap.id} className="border-b border-yellow-800/30 hover:bg-yellow-500/5">
                                                <td className="py-3 text-yellow-400 font-bold">Q{snap.round_id} (Shadow)</td>
                                                <td className="py-3 text-gray-500">{new Date(snap.timestamp).toLocaleString()}</td>
                                                <td className="py-3 text-right">
                                                    <span className="px-2 py-0.5 rounded text-xs bg-yellow-900/40 text-yellow-300">Shadow KPI</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
