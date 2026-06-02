"use client";

import React, { useEffect, useState, useCallback, Fragment, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { COMPONENT_COSTS, ASSEMBLY_COST, getPriceMultiplier } from "@/lib/engine/constants";

// Use imported constants directly (COMPONENT_COSTS) — no local copy needed

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

function SectionHeader({ title, color = "text-cyan-400" }) {
    return (
        <h2 className={`text-2xl font-bold mb-4 border-b border-white/10 pb-2 ${color}`}>{title}</h2>
    );
}

function BSRow({ label, value, bold, indent, color }) {
    return (
        <div className={`flex justify-between py-1 border-b border-white/5 text-sm font-mono ${bold ? "font-bold text-white" : "text-gray-400"} ${indent ? "pl-4" : ""}`}>
            <span>{label}</span>
            <span className={color || ""}>{value}</span>
        </div>
    );
}

export default function Dashboard() {
    const router = useRouter();
    const [companyId, setCompanyId] = useState("");
    const [data, setData] = useState(null);
    const [market, setMarket] = useState(null);
    const [allCompanies, setAllCompanies] = useState([]);
    const [companyHistory, setCompanyHistory] = useState([]);
    const [tab, setTab] = useState("decisions");
    const [submitMsg, setSubmitMsg] = useState("");
    const [expandedRow, setExpandedRow] = useState(null);
    const [expandedHistory, setExpandedHistory] = useState(null);
    const [selectedQuarter, setSelectedQuarter] = useState("");

    useEffect(() => {
        if (companyHistory.length > 0 && !selectedQuarter) {
            setSelectedQuarter(companyHistory[companyHistory.length - 1].round_id.toString());
        }
    }, [companyHistory, selectedQuarter]);

    const handleExpand = async (id) => {
        if (expandedRow === id) {
            setExpandedRow(null);
            return;
        }
        setExpandedRow(id);
        setExpandedHistory(null);
        const res = await fetch(`/api/history/company/${id}`);
        if (res.ok) {
            setExpandedHistory(await res.json());
        }
    };

    // Decision form state
    const [price, setPrice] = useState(0);
    const [volume, setVolume] = useState(0);
    const [brandSpend, setBrandSpend] = useState(0);
    const [capex, setCapex] = useState(0);
    const [creditDraw, setCreditDraw] = useState(0);
    const [creditRepay, setCreditRepay] = useState(0);
    const [loanDraw, setLoanDraw] = useState(0);
    const [loanRepay, setLoanRepay] = useState(0);
    const [upgradeDisplay, setUpgradeDisplay] = useState(false);
    const [upgradeOptics, setUpgradeOptics] = useState(false);
    const [upgradeTracking, setUpgradeTracking] = useState(false);
    const [upgradeProcessor, setUpgradeProcessor] = useState(false);

    const scrollRef = useRef(null);
    const videoRef = useRef(null);
    const telemetryRef = useRef(null);

    // High-performance smooth animation lerp loop for VR Set video
    useEffect(() => {
        const vid = videoRef.current;
        const container = scrollRef.current;
        if (!vid || !container) return;

        let targetTime = 0;
        let animFrame = null;

        // Force browser to load video data so duration is available
        vid.load();

        const handleScroll = () => {
            const maxScroll = container.scrollHeight - container.clientHeight;
            if (maxScroll <= 0) return;
            const pct = container.scrollTop / maxScroll;
            if (vid.duration) {
                targetTime = pct * vid.duration;
            }
        };

        const updateVideo = () => {
            if (vid && vid.duration) {
                // Smooth interpolation to targetTime
                const diff = targetTime - vid.currentTime;
                if (Math.abs(diff) > 0.005) {
                    vid.currentTime += diff * 0.06;
                }
                
                // Update HUD direct text value
                if (telemetryRef.current) {
                    const pctVal = Math.round((vid.currentTime / vid.duration) * 100);
                    const degVal = Math.round((vid.currentTime / vid.duration) * 360);
                    telemetryRef.current.textContent = `ROTATION: ${degVal}° | DEPTH: ${pctVal}%`;
                }
            }
            animFrame = requestAnimationFrame(updateVideo);
        };

        container.addEventListener("scroll", handleScroll);
        animFrame = requestAnimationFrame(updateVideo);

        // Also run once to align initial state
        const timer = setTimeout(handleScroll, 500);

        return () => {
            container.removeEventListener("scroll", handleScroll);
            cancelAnimationFrame(animFrame);
            clearTimeout(timer);
        };
    }, [data, tab]);

    // Helper to resolve HUD specs dynamically
    const getHUDSpec = (key, currentLvl, isUpgraded) => {
        const specs = {
            display: {
                1: "LCD, 2K Res",
                2: "OLED, 3.5K Res",
                3: "Micro-OLED, 5K Res"
            },
            optics: {
                1: "Fresnel Lenses",
                2: "Aspheric Lenses",
                3: "Pancake Lenses"
            },
            tracking: {
                1: "3-DoF Tracking",
                2: "6-DoF Inside-Out",
                3: "6-DoF + Eye Track"
            },
            processor: {
                1: "Mobile Lite SoC",
                2: "Standard SoC",
                3: "High-Perf XR"
            }
        };

        const currentSpec = specs[key][currentLvl] || "Unknown";
        if (isUpgraded && currentLvl < 3) {
            const nextSpec = specs[key][currentLvl + 1];
            return {
                text: `${currentSpec} ➔ ${nextSpec}`,
                pending: true
            };
        }
        return {
            text: currentSpec,
            pending: false
        };
    };

    const fetchAll = useCallback(async (id) => {
        const [compRes, mktRes, allRes, histRes] = await Promise.all([
            fetch(`/api/companies/${id}`),
            fetch("/api/market"),
            fetch("/api/companies"),
            fetch(`/api/history/company/${id}`),
        ]);
        if (compRes.ok) {
            const c = await compRes.json();
            setData(c);
            setPrice(c.prev_price || 500);
            setVolume(c.prev_production_volume || 1000);
            setBrandSpend(c.prev_brand_spend || 5000);
            setCapex(c.prev_capex || 0);
            setCreditDraw(c.prev_credit_draw || 0);
            setCreditRepay(c.prev_credit_repay || 0);
            setLoanDraw(c.prev_loan_draw || 0);
            setLoanRepay(c.prev_loan_repay || 0);
        }
        if (mktRes.ok) setMarket(await mktRes.json());
        if (allRes.ok) setAllCompanies(await allRes.json());
        if (histRes.ok) setCompanyHistory(await histRes.json());
    }, []);

    useEffect(() => {
        const id = sessionStorage.getItem("vr_company_id");
        if (!id) { router.push("/"); return; }
        setCompanyId(id);
        fetchAll(id);
    }, [router, fetchAll]);

    const submitDecisions = async (e) => {
        e.preventDefault();
        setSubmitMsg("");
        const res = await fetch(`/api/companies/${companyId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                price: Number(price),
                production_volume: Number(volume),
                brand_spend: Number(brandSpend),
                capex: Number(capex),
                credit_draw: Number(creditDraw),
                credit_repay: Number(creditRepay),
                loan_draw: Number(loanDraw),
                loan_repay: Number(loanRepay),
                upgrade_display: upgradeDisplay,
                upgrade_optics: upgradeOptics,
                upgrade_tracking: upgradeTracking,
                upgrade_processor: upgradeProcessor,
            }),
        });
        if (res.ok) {
            const json = await res.json();
            setSubmitMsg(`✓ Decisions locked in. R&D fee: ${fmt(json.rd_fee_total)}. Awaiting GM to advance quarter.`);
            setUpgradeDisplay(false); setUpgradeOptics(false);
            setUpgradeTracking(false); setUpgradeProcessor(false);
            fetchAll(companyId);
        } else {
            setSubmitMsg("✗ Submission failed. Please try again.");
        }
    };

    if (!data) return (
        <div className="flex items-center justify-center h-screen">
            <div className="text-cyan-400 font-mono animate-pulse text-lg">Connecting to Nexus...</div>
        </div>
    );

    // Derived values
    const netFixed = data.fixed_assets_gross - data.accumulated_depreciation;
    const maxCap = Math.floor(netFixed / 100);
    const totalEquity = data.shareholders_equity + data.retained_earnings;
    const dispLvl = data.comp_display_level + (upgradeDisplay && data.comp_display_level < 3 ? 1 : 0);
    const optLvl = data.comp_optics_level + (upgradeOptics && data.comp_optics_level < 3 ? 1 : 0);
    const trackLvl = data.comp_tracking_level + (upgradeTracking && data.comp_tracking_level < 3 ? 1 : 0);
    const procLvl = data.comp_processor_level + (upgradeProcessor && data.comp_processor_level < 3 ? 1 : 0);

    const techScore = dispLvl + optLvl + trackLvl + procLvl;
    const unitCost = ASSEMBLY_COST + COMPONENT_COSTS.display[dispLvl].cost + COMPONENT_COSTS.optics[optLvl].cost + COMPONENT_COSTS.tracking[trackLvl].cost + COMPONENT_COSTS.processor[procLvl].cost;
    const maxPrice = unitCost * getPriceMultiplier(techScore);
    const totalDebt = data.credit_line + data.bank_loan;
    const totalAssets = data.cash + data.accounts_receivable + (data.inventory_units * unitCost) + netFixed;
    const debtRatio = totalAssets > 0 ? (totalDebt / totalAssets * 100).toFixed(1) : 0;

    // Build leaderboard with weighted score
    const buildScore = (c) => {
        const totalA = c.shareholders_equity + c.retained_earnings;
        const mktShareFrac = (c.market_share || 0) / 100;
        return (0.4 * totalA + 0.4 * mktShareFrac * 100000 + 0.2 * (c.brand_equity || 0)).toFixed(0);
    };

    const leaderboard = [...allCompanies]
        .sort((a, b) => buildScore(b) - buildScore(a))
        .map((c, i) => ({ ...c, rank: i + 1, score: buildScore(c) }));

    // companyHistory is fetched live from /api/history/company/[id]
    const lastHistoryItem = companyHistory.length > 0 ? companyHistory[companyHistory.length - 1] : null;
    const displayCash = lastHistoryItem ? lastHistoryItem.cash : data.cash;
    const displayTotalEquity = lastHistoryItem ? lastHistoryItem.total_equity : totalEquity;
    const displayBrandEquity = lastHistoryItem ? lastHistoryItem.brand_equity : data.brand_equity;
    const displayTechScore = lastHistoryItem ? lastHistoryItem.tech_score : techScore;

    return (
        <div className="min-h-screen text-gray-100 relative">
            {/* Background glows */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-0 w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-[140px] opacity-5" />
                <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-fuchsia-500 rounded-full mix-blend-screen filter blur-[140px] opacity-5" />
            </div>

            {/* Top Nav */}
            <nav className="sticky top-0 z-50 glass-panel rounded-none border-0 border-b border-cyan-500/20 px-8 py-3 flex items-center justify-between">
                <div>
                    <span className="text-cyan-400 font-extrabold text-lg tracking-wider">VR NEXUS</span>
                    <span className="ml-3 text-gray-500 text-sm font-mono">/ {data.name}</span>
                </div>
                <div className="flex items-center gap-6">
                    {data.is_frozen === 1 && (
                        <span className="bg-red-900/60 border border-red-500 text-red-300 text-xs font-mono px-3 py-1 rounded-full animate-pulse">
                            ⚠ LIQUIDITY FREEZE
                        </span>
                    )}
                    <span className="text-gray-500 text-sm font-mono">Q{market?.current_quarter || "—"}</span>
                    <button onClick={() => fetchAll(companyId)} className="text-xs text-gray-600 hover:text-cyan-400 transition font-mono">[Refresh]</button>
                    <button onClick={() => { sessionStorage.clear(); router.push("/"); }} className="text-xs text-gray-600 hover:text-red-400 transition font-mono">[Exit]</button>
                </div>
            </nav>

            {/* Tab Bar */}
            <div className="flex gap-1 px-8 pt-6 pb-0 max-w-7xl mx-auto">
                {[
                    { id: "decisions", label: "📋 Decisions" },
                    { id: "financials", label: "📊 Financials" },
                    { id: "market", label: "🌐 Market Intel" },
                    { id: "leaderboard", label: "🏆 Leaderboard" },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-5 py-2 rounded-t-lg text-sm font-semibold transition-all border-b-2 ${tab === t.id
                            ? "bg-cyan-500/10 border-cyan-400 text-cyan-300"
                            : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5"
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-8 py-6 relative z-10">

                {/* ─── KPI Strip ─── */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <StatCard title="Cash" value={fmt(displayCash)} color="text-green-400" />
                    <StatCard title="Total Equity" value={fmt(displayTotalEquity)} color={displayTotalEquity >= 500000 ? "text-green-400" : "text-red-400"} />
                    <StatCard title="Brand Equity" value={`${displayBrandEquity} pts`} color="text-fuchsia-400" />
                    <StatCard title="Tech Score" value={`${displayTechScore} / 12`} color="text-yellow-400" />
                    <StatCard title="Max Capacity" value={`${maxCap.toLocaleString()} units`} sub={`Net Fixed: ${fmt(netFixed)}`} />
                </div>

                {/* ─── DECISIONS TAB ─── */}
                {tab === "decisions" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <form onSubmit={submitDecisions} className="glass-panel p-6 flex flex-col gap-5">
                            <SectionHeader title="📋 Quarter Decision Hub" />

                            {data.is_frozen === 1 && (
                                <div className="bg-red-900/30 border border-red-500 rounded p-3 text-red-200 text-sm">
                                    ⚠ Liquidity Freeze Active. Marketing & R&D spend forced to $0 this quarter.
                                </div>
                            )}

                            {/* Pricing & Volume */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-cyan-300 mb-1 font-mono uppercase">Unit Price ($)</label>
                                    <input type="number" min="0" max={maxPrice} value={price} onChange={e => setPrice(e.target.value)}
                                        className={`w-full bg-black/50 border rounded px-3 py-2 text-white focus:outline-none transition font-mono ${price > maxPrice ? 'border-red-500 focus:border-red-500' : 'border-cyan-900 focus:border-cyan-400'}`} />
                                    <p className={`text-xs mt-1 ${price > maxPrice ? 'text-red-400' : 'text-gray-600'}`}>Max: {fmt(maxPrice)} (Unit Cost: {fmt(unitCost)})</p>
                                </div>
                                <div>
                                    <label className="block text-xs text-cyan-300 mb-1 font-mono uppercase">Production Volume</label>
                                    <input type="number" min="0" max={maxCap} value={volume} onChange={e => setVolume(e.target.value)}
                                        className="w-full bg-black/50 border border-cyan-900 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-400 transition font-mono" />
                                    <p className="text-xs text-gray-600 mt-1">Max: {maxCap.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Brand Spend */}
                            <div>
                                <label className="block text-xs text-fuchsia-300 mb-1 font-mono uppercase">Brand Spend ($) <span className="text-gray-500">— min $5k to avoid decay</span></label>
                                <input type="number" min="0" value={brandSpend} onChange={e => setBrandSpend(e.target.value)}
                                    disabled={data.is_frozen === 1}
                                    className="w-full bg-black/50 border border-fuchsia-900 rounded px-3 py-2 text-white focus:outline-none focus:border-fuchsia-400 transition font-mono disabled:opacity-40" />
                            </div>

                            {/* CapEx */}
                            <div>
                                <label className="block text-xs text-yellow-300 mb-1 font-mono uppercase">Capital Expenditure / Fixed Assets ($)</label>
                                <input type="number" min="0" value={capex} onChange={e => setCapex(e.target.value)}
                                    className="w-full bg-black/50 border border-yellow-900 rounded px-3 py-2 text-white focus:outline-none focus:border-yellow-400 transition font-mono" />
                                <p className="text-xs text-gray-600 mt-1">Takes effect next quarter. +10 units capacity per $1,000.</p>
                            </div>

                            {/* Financing */}
                            <div className="bg-black/30 border border-blue-900/50 rounded-xl p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <label className="block text-sm font-bold text-blue-300 font-mono uppercase">Financing</label>
                                        <p className="text-xs text-gray-500 mt-1">Total Debt Limit (50% Assets): <span className="text-white">{fmt(totalAssets * 0.5)}</span> <br />
                                            Available to Borrow: <span className="text-green-400">{fmt(Math.max(0, (totalAssets * 0.5) - totalDebt))}</span></p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    {/* Credit Line */}
                                    <div className="border border-blue-900/30 rounded p-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs text-blue-200 font-bold uppercase tracking-wider">Credit Line</span>
                                            <span className="text-xs text-gray-500 font-mono">12% APR / 3% qtr • Current: {fmt(data.credit_line)}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-widest">+ DRAW (Borrow)</label>
                                                <input type="number" min="0" value={creditDraw} onChange={e => setCreditDraw(e.target.value)}
                                                    placeholder="0" className="w-full bg-black/40 border border-blue-900/50 rounded px-3 py-2 text-green-400 text-sm focus:outline-none focus:border-blue-400 transition font-mono" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-widest">- REPAY (Pay Off)</label>
                                                <input type="number" min="0" value={creditRepay} onChange={e => setCreditRepay(e.target.value)}
                                                    placeholder="0" className="w-full bg-black/40 border border-blue-900/50 rounded px-3 py-2 text-red-400 text-sm focus:outline-none focus:border-blue-400 transition font-mono" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bank Loan */}
                                    <div className="border border-blue-900/30 rounded p-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs text-blue-200 font-bold uppercase tracking-wider">Bank Loan</span>
                                            <span className="text-xs text-gray-500 font-mono">6% APR / 1.5% qtr • Current: {fmt(data.bank_loan)}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-widest">+ DRAW (Borrow)</label>
                                                <input type="number" min="0" value={loanDraw} onChange={e => setLoanDraw(e.target.value)}
                                                    placeholder="0" className="w-full bg-black/40 border border-blue-900/50 rounded px-3 py-2 text-green-400 text-sm focus:outline-none focus:border-blue-400 transition font-mono" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-widest">- REPAY (Pay Off)</label>
                                                <input type="number" min="0" value={loanRepay} onChange={e => setLoanRepay(e.target.value)}
                                                    placeholder="0" className="w-full bg-black/40 border border-blue-900/50 rounded px-3 py-2 text-red-400 text-sm focus:outline-none focus:border-blue-400 transition font-mono" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {submitMsg && (
                                <div className={`text-sm font-mono px-4 py-2 rounded border ${submitMsg.startsWith("✓") ? "bg-green-900/30 border-green-500 text-green-300" : "bg-red-900/30 border-red-500 text-red-300"}`}>
                                    {submitMsg}
                                </div>
                            )}

                            <button type="submit"
                                className="mt-2 py-3 rounded bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400 text-cyan-100 font-bold transition-all hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]">
                                🔒 Lock In Decisions
                            </button>
                        </form>

                        {/* R&D Upgrades Panel */}
                        <div className="glass-panel p-6 flex flex-col gap-5 relative overflow-hidden">
                            <style dangerouslySetInnerHTML={{__html: `
                                @keyframes scan {
                                    0% { transform: translateY(-100%); }
                                    100% { transform: translateY(220px); }
                                }
                                .custom-scrollbar::-webkit-scrollbar {
                                    width: 6px;
                                }
                                .custom-scrollbar::-webkit-scrollbar-track {
                                    background: rgba(255, 255, 255, 0.02);
                                    border-radius: 99px;
                                }
                                .custom-scrollbar::-webkit-scrollbar-thumb {
                                    background: rgba(234, 179, 8, 0.25);
                                    border-radius: 99px;
                                    border: 1px solid rgba(234, 179, 8, 0.1);
                                }
                                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                                    background: rgba(234, 179, 8, 0.45);
                                }
                            `}} />

                            <SectionHeader title="⚗️ R&D — Component Upgrades" color="text-yellow-400" />
                            
                            {/* ─── FUTURISTIC VR ASSEMBLY BAY VISUALIZER ─── */}
                            <div className="relative w-full h-[220px] rounded-xl overflow-hidden border border-yellow-500/20 bg-black shadow-[0_0_20px_rgba(234,179,8,0.05),inset_0_0_20px_rgba(234,179,8,0.15)] group">
                                <video
                                    ref={videoRef}
                                    src="/video/VR Set Luxury 720p.mp4"
                                    className="w-full h-full object-cover opacity-85"
                                    muted
                                    playsInline
                                    preload="auto"
                                    loop
                                />
                                
                                {/* Sci-Fi HUD Scanline */}
                                <div className="absolute top-0 left-0 w-full h-10 bg-gradient-to-b from-transparent via-yellow-500/10 to-transparent pointer-events-none opacity-50" style={{ animation: "scan 4s linear infinite" }} />
                                
                                {/* Cyber Grid Background */}
                                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0)_96%,rgba(234,179,8,0.03)_96%),linear-gradient(to_right,rgba(0,0,0,0)_96%,rgba(234,179,8,0.03)_96%)] bg-[size:16px_16px] pointer-events-none opacity-50" />

                                {/* Interactive corner bracket overlays */}
                                <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-yellow-500/40" />
                                <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-yellow-500/40" />
                                <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-yellow-500/40" />
                                <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-yellow-500/40" />

                                {/* HUD Panel: Top Stats */}
                                <div className="absolute top-3 left-3 right-3 flex justify-between items-center text-[10px] font-mono tracking-widest text-yellow-500/80 pointer-events-none">
                                    <div className="flex items-center gap-1.5 bg-black/75 px-2 py-0.5 rounded border border-yellow-500/20 backdrop-blur-sm">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        <span>ASSEMBLY BAY: ACTIVE</span>
                                    </div>
                                    <div ref={telemetryRef} className="bg-black/75 px-2 py-0.5 rounded border border-yellow-500/20 backdrop-blur-sm text-right">
                                        ROTATION: 0° | DEPTH: 0%
                                    </div>
                                </div>

                                {/* HUD Panel: Core Specs Overlay (translucent card) */}
                                <div className="absolute bottom-3 left-3 right-3 bg-black/80 border border-yellow-500/20 rounded-lg p-3 backdrop-blur-md pointer-events-none">
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono">
                                        {/* Display */}
                                        {(() => {
                                            const spec = getHUDSpec("display", data.comp_display_level, upgradeDisplay);
                                            return (
                                                <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                                                    <span className="text-gray-500 uppercase">Display:</span>
                                                    <span className={spec.pending ? "text-yellow-400 animate-pulse font-bold" : "text-white"}>{spec.text}</span>
                                                </div>
                                            );
                                        })()}
                                        
                                        {/* Optics */}
                                        {(() => {
                                            const spec = getHUDSpec("optics", data.comp_optics_level, upgradeOptics);
                                            return (
                                                <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                                                    <span className="text-gray-500 uppercase">Optics:</span>
                                                    <span className={spec.pending ? "text-yellow-400 animate-pulse font-bold" : "text-white"}>{spec.text}</span>
                                                </div>
                                            );
                                        })()}

                                        {/* Tracking */}
                                        {(() => {
                                            const spec = getHUDSpec("tracking", data.comp_tracking_level, upgradeTracking);
                                            return (
                                                <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                                                    <span className="text-gray-500 uppercase">Tracking:</span>
                                                    <span className={spec.pending ? "text-yellow-400 animate-pulse font-bold" : "text-white"}>{spec.text}</span>
                                                </div>
                                            );
                                        })()}

                                        {/* Processor */}
                                        {(() => {
                                            const spec = getHUDSpec("processor", data.comp_processor_level, upgradeProcessor);
                                            return (
                                                <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                                                    <span className="text-gray-500 uppercase">Processor:</span>
                                                    <span className={spec.pending ? "text-yellow-400 animate-pulse font-bold" : "text-white"}>{spec.text}</span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            <p className="text-[11px] text-gray-500 font-mono italic leading-relaxed border-l-2 border-yellow-500/20 pl-2">
                                💡 Tip: Scroll the upgrade list below to rotate the VR Set and preview full 3D-like mechanics.
                            </p>

                            {/* ─── SNAP-SCROLL CAROUSEL (info only, drives VR video) ─── */}
                            <div
                                ref={scrollRef}
                                className="flex flex-col overflow-y-auto h-[180px] snap-y snap-mandatory scroll-smooth pr-2 custom-scrollbar"
                            >
                                {[
                                    { key: "tracking", label: "Tracking Upgrade", level: data.comp_tracking_level, val: upgradeTracking },
                                    { key: "optics",   label: "Optics Upgrade",   level: data.comp_optics_level,   val: upgradeOptics },
                                    { key: "processor",label: "Processor Upgrade",level: data.comp_processor_level,val: upgradeProcessor },
                                    { key: "display",  label: "Display Upgrade",  level: data.comp_display_level,  val: upgradeDisplay },
                                ].map(({ key, label, level, val }) => {
                                    const cur  = COMPONENT_COSTS[key][level];
                                    const next = level < 3 ? COMPONENT_COSTS[key][level + 1] : null;
                                    const desc = {
                                        tracking:  "🎯 Spatial Telemetry: Decodes player head and controller movement. Advanced tracking drastically lowers spatial lag, cuts simulator motion sickness, and unlocks natural, high-precision hand interactions.",
                                        optics:    "👓 Visual Path: Focuses screen pixels perfectly onto the pupil. Premium lenses expand the FOV Sweet Spot, clear chromatic blur, and reduce physical visor depth and headset weight.",
                                        processor: "🧠 Computation Engine: Runs sensor-fusion, physics, and graphics rendering. Heavy-duty processors maintain solid 90+ FPS, support high-density audio, and prevent screen tearing.",
                                        display:   "📺 Screen Resolution: Visual output interface. Higher pixel density removes the screen-door texture, rendering vivid contrast, deep blacks, and sharp text legibility.",
                                    };
                                    return (
                                        <div key={key} className="h-[300px] py-1 flex-shrink-0 w-full snap-center snap-always flex flex-col justify-center">
                                            <div className={`bg-black/45 border rounded-xl p-4 h-[165px] flex flex-col justify-between transition-all duration-300 ${val ? "border-yellow-500/40 bg-yellow-500/5 shadow-[0_0_15px_rgba(234,179,8,0.05)]" : "border-white/10"}`}>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="text-xs font-bold text-white uppercase tracking-wider">{label}</p>
                                                        {val  && <span className="bg-yellow-500/20 text-yellow-300 text-[8px] px-1.5 py-0.5 rounded font-mono uppercase tracking-widest border border-yellow-500/10 animate-pulse">Pending Lock-in</span>}
                                                        {!next && <span className="bg-green-900/30 text-green-400 text-[8px] px-1.5 py-0.5 rounded font-mono uppercase border border-green-500/20">Max Level</span>}
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-mono leading-relaxed">{desc[key]}</p>
                                                </div>
                                                <div className="flex gap-4 text-[10px] font-mono border-t border-white/5 pt-2">
                                                    <span className="text-gray-500">CURRENT: <span className="text-white">Lvl {level} ({cur.name}) · ${cur.cost}/unit</span></span>
                                                    {next && <span className="text-yellow-500">UPGRADE ➔: <span className="text-yellow-400">Lvl {level + 1} ({next.name}) · ${next.cost}/unit</span></span>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ─── PERSISTENT UPGRADE BUTTON GRID (always visible) ─── */}
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { key: "tracking",  label: "Tracking",  icon: "🎯", level: data.comp_tracking_level,  set: setUpgradeTracking,  val: upgradeTracking },
                                    { key: "optics",    label: "Optics",    icon: "👓", level: data.comp_optics_level,    set: setUpgradeOptics,    val: upgradeOptics },
                                    { key: "processor", label: "Processor", icon: "🧠", level: data.comp_processor_level, set: setUpgradeProcessor, val: upgradeProcessor },
                                    { key: "display",   label: "Display",   icon: "📺", level: data.comp_display_level,   set: setUpgradeDisplay,   val: upgradeDisplay },
                                ].map(({ key, label, icon, level, set, val }) => {
                                    const next = level < 3 ? COMPONENT_COSTS[key][level + 1] : null;
                                    const isMaxed  = !next;
                                    const isFrozen = !!data.is_frozen;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            disabled={isMaxed || isFrozen}
                                            onClick={() => !isMaxed && !isFrozen && set(!val)}
                                            className={`relative flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border text-left transition-all duration-200
                                                ${isMaxed  ? "border-green-800/30 bg-green-900/10 cursor-default opacity-70" : ""}
                                                ${isFrozen && !isMaxed ? "border-red-900/30 bg-red-900/10 cursor-not-allowed opacity-50" : ""}
                                                ${!isMaxed && !isFrozen && val  ? "border-yellow-400 bg-yellow-500/15 shadow-[0_0_14px_rgba(234,179,8,0.25)]" : ""}
                                                ${!isMaxed && !isFrozen && !val ? "border-white/10 bg-black/30 hover:border-yellow-600/60 hover:bg-yellow-500/5" : ""}
                                            `}
                                        >
                                            <div className="flex items-center gap-1.5 w-full">
                                                <span className="text-sm leading-none">{icon}</span>
                                                <span className={`text-[11px] font-bold font-mono uppercase tracking-wider ${val && !isMaxed ? "text-yellow-300" : "text-gray-300"}`}>{label}</span>
                                                {val && !isMaxed && (
                                                    <span className="ml-auto text-[8px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 px-1 py-0.5 rounded font-mono uppercase animate-pulse">ON</span>
                                                )}
                                                {isMaxed && (
                                                    <span className="ml-auto text-[8px] bg-green-900/30 text-green-500 border border-green-700/30 px-1 py-0.5 rounded font-mono uppercase">MAX</span>
                                                )}
                                            </div>
                                            <span className="text-[9px] font-mono text-gray-600 pl-5">
                                                {isMaxed  ? `Lvl ${level} — fully upgraded` : isFrozen ? "frozen" : val ? `Lvl ${level} ➔ ${level + 1} queued` : `Lvl ${level} → click to queue`}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Component Summary */}
                            <div className="bg-black/30 border border-yellow-500/20 rounded-xl p-4 mt-2">
                                <p className="text-xs text-gray-500 font-mono mb-2 uppercase">Tech Score (Next Qtr)</p>
                                <p className="text-3xl font-mono font-extrabold text-yellow-400">{techScore} <span className="text-base text-gray-600">/ 12</span></p>
                                <p className="text-xs text-gray-600 mt-1 font-mono">Unit Build Cost: {fmt(unitCost)} · Assembly: ${ASSEMBLY_COST} included</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── FINANCIALS TAB ─── */}
                {tab === "financials" && (() => {
                    const displayData = companyHistory.find(h => h.round_id.toString() === selectedQuarter)?.raw_company || data;

                    const getDispUnitCost = (comp) => {
                        return ASSEMBLY_COST + 
                            (COMPONENT_COSTS.display[comp.comp_display_level || 1]?.cost || 80) + 
                            (COMPONENT_COSTS.optics[comp.comp_optics_level || 1]?.cost || 20) + 
                            (COMPONENT_COSTS.tracking[comp.comp_tracking_level || 1]?.cost || 30) + 
                            (COMPONENT_COSTS.processor[comp.comp_processor_level || 1]?.cost || 50);
                    };
                    const dispUnitCost = getDispUnitCost(displayData);

                    const displayNetFixed = (displayData.fixed_assets_gross || 0) - (displayData.accumulated_depreciation || 0);
                    const displayTotalAssets = (displayData.cash || 0) + (displayData.accounts_receivable || 0) + ((displayData.inventory_units || 0) * dispUnitCost) + displayNetFixed;
                    const displayTotalEquity = (displayData.shareholders_equity || 0) + (displayData.retained_earnings || 0);
                    const displayTotalDebt = (displayData.credit_line || 0) + (displayData.bank_loan || 0);
                    const displayDebtRatio = displayTotalAssets > 0 ? (displayTotalDebt / displayTotalAssets * 100).toFixed(1) : 0;

                    return (
                        <div className="flex flex-col gap-6">
                            {/* Quarter Selector */}
                            <div className="glass-panel p-4 flex items-center justify-between">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-cyan-400 font-bold tracking-wider">
                                        Financial Statements — Q{selectedQuarter}
                                    </span>
                                    <span className="text-xs font-mono text-gray-500">
                                        Statements as of end of Q{selectedQuarter}.
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <label className="text-sm font-mono text-gray-400 uppercase">Select Period:</label>
                                    <select 
                                        value={selectedQuarter} 
                                        onChange={(e) => setSelectedQuarter(e.target.value)}
                                        className="bg-black/50 border border-cyan-900 rounded px-3 py-1 text-white font-mono text-sm focus:outline-none focus:border-cyan-400 pb-1"
                                    >
                                        {[...companyHistory].reverse().map(h => (
                                            <option key={h.round_id} value={h.round_id.toString()}>Q{h.round_id}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Balance Sheet */}
                                <div className="glass-panel p-6">
                            <SectionHeader title="Balance Sheet" />
                            <div className="flex flex-col gap-0.5">
                                <p className="text-xs text-gray-600 font-mono uppercase mb-2">Current Assets</p>
                                <BSRow indent label="A1 · Cash" value={fmt(displayData.cash)} color="text-green-400" />
                                <BSRow indent label="A2 · Accounts Receivable" value={fmt(displayData.accounts_receivable)} />
                                <BSRow indent label="A4 · Inventory" value={fmt(displayData.inventory_units * dispUnitCost)} sub={`${displayData.inventory_units} units × ${fmt(dispUnitCost)}`} />
                                <BSRow bold label="A5 · Total Current Assets" value={fmt(displayData.cash + displayData.accounts_receivable + displayData.inventory_units * dispUnitCost)} />
                                <p className="text-xs text-gray-600 font-mono uppercase mt-4 mb-2">Fixed Assets</p>
                                <BSRow indent label="A6 · Fixed Assets (Gross)" value={fmt(displayData.fixed_assets_gross)} />
                                <BSRow indent label="A7 · Accum. Depreciation" value={`(${fmt(displayData.accumulated_depreciation)})`} color="text-red-400" />
                                <BSRow indent bold label="A8 · Net Fixed Assets" value={fmt(displayNetFixed)} color="text-white" />
                                <BSRow bold label="A9 · Total Assets" value={fmt(displayTotalAssets)} color="text-cyan-400" />
                                <p className="text-xs text-gray-600 font-mono uppercase mt-4 mb-2">Liabilities</p>
                                <BSRow indent label="A10 · Accounts Payable" value={fmt(displayData.accounts_payable)} />
                                <BSRow indent label="A11 · Credit Line" value={fmt(displayData.credit_line)} color="text-red-400" />
                                <BSRow indent label="A13 · Bank Loan" value={fmt(displayData.bank_loan)} color="text-red-400" />
                                <BSRow bold label="A15 · Total Liabilities" value={fmt(displayData.credit_line + displayData.bank_loan + displayData.accounts_payable)} color="text-red-400" />
                                <p className="text-xs text-gray-600 font-mono uppercase mt-4 mb-2">Equity</p>
                                <BSRow indent label="A16 · Shareholders' Equity" value={fmt(displayData.shareholders_equity)} />
                                <BSRow indent label="A17 · Retained Earnings" value={fmt(displayData.retained_earnings)} color={displayData.retained_earnings >= 0 ? "text-green-400" : "text-red-400"} />
                                <BSRow bold label="A18 · Total Equity" value={fmt(displayTotalEquity)} color={displayTotalEquity >= 0 ? "text-green-400" : "text-red-400"} />
                                <div className="mt-4 p-3 rounded bg-black/30 border border-gray-800 text-xs font-mono text-gray-500">
                                    Debt / Assets: <span className={parseFloat(displayDebtRatio) > 50 ? "text-red-400" : "text-green-400"}>{displayDebtRatio}%</span> (max 50%)
                                </div>
                            </div>
                        </div>

                        {/* P&L and Cash Flow */}
                        <div className="glass-panel p-6 md:col-span-2 flex flex-col gap-8">
                            {!displayData.last_q_ledger ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-600 font-mono text-sm border-2 border-dashed border-white/5 rounded-xl p-8">
                                    <p>No P&L or Cash Flow data yet.</p>
                                    <p className="mt-2">Advance the quarter to see performance metrics here.</p>
                                </div>
                            ) : (() => {
                                const ledger = typeof displayData.last_q_ledger === 'string'
                                    ? JSON.parse(displayData.last_q_ledger)
                                    : displayData.last_q_ledger;
                                const { P_L, CFO } = ledger;
                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* P&L Column */}
                                        <div>
                                            <SectionHeader title="Profit & Loss" color="text-yellow-400" />
                                            <div className="flex flex-col gap-0.5">
                                                <BSRow label="B1 · Revenue" value={fmt(P_L.B1)} color="text-white" />
                                                <BSRow label="B2 · COGS" value={`(${fmt(P_L.B2)})`} color="text-red-400" />
                                                <BSRow bold label="B3 · Gross Profit" value={fmt(P_L.B3)} />

                                                <p className="text-xs text-gray-600 font-mono uppercase mt-4 mb-2">Operating Expenses</p>
                                                <BSRow indent label="B4 · Marketing & Brand" value={`(${fmt(P_L.B4)})`} color="text-red-400" />
                                                <BSRow indent label="B5 · R&D (Fees + Maint)" value={`(${fmt(P_L.B5)})`} color="text-red-400" />
                                                <BSRow indent label="B5b · Fixed Overhead" value={`(${fmt(P_L.B5b)})`} color="text-red-400" />
                                                <BSRow indent label="B6 · Depreciation" value={`(${fmt(P_L.B6)})`} color="text-red-400" />
                                                <BSRow bold label="B7 · Operating Income (EBIT)" value={fmt(P_L.B7)} />

                                                <p className="text-xs text-gray-600 font-mono uppercase mt-4 mb-2">Financing & Taxes</p>
                                                <BSRow indent label="B8 · Interest Expense" value={fmt(P_L.B8)} color="text-red-400" />
                                                <BSRow bold label="B9 · Net Income" value={fmt(P_L.B9)} color={P_L.B9 >= 0 ? "text-green-400" : "text-red-400"} />
                                            </div>
                                        </div>

                                        {/* Cash Flow Column */}
                                        <div>
                                            <SectionHeader title="Cash Flow" color="text-green-400" />
                                            <div className="flex flex-col gap-0.5">
                                                <p className="text-xs text-gray-600 font-mono uppercase mb-2">Operating Activities</p>
                                                <BSRow indent label="C1 · Cash from Customers" value={fmt(CFO.C1)} />
                                                <BSRow indent label="C2 · Cash Paid for Inventory" value={`(${fmt(CFO.C2)})`} />
                                                <BSRow indent label="C3 · Cash Paid for OpEx/R&D" value={`(${fmt(CFO.C3)})`} />
                                                <BSRow indent label="C4 · Cash Paid for Interest" value={`(${fmt(CFO.C4)})`} />
                                                <BSRow bold label="C5 · Net Cash from Ops (CFO)" value={fmt(CFO.C5)} color={CFO.C5 >= 0 ? "text-green-400" : "text-red-400"} />

                                                <p className="text-xs text-gray-600 font-mono uppercase mt-4 mb-2">Investing Activities</p>
                                                <BSRow indent label="C6 · Capital Expenditures" value={`(${fmt(CFO.C6)})`} />
                                                <BSRow bold label="Net Cash from Investing" value={`(${fmt(CFO.C6)})`} />

                                                <p className="text-xs text-gray-600 font-mono uppercase mt-4 mb-2">Financing Activities</p>
                                                <BSRow indent label="C7 · Debt Activity (Net)" value={fmt(CFO.C7)} color={CFO.C7 >= 0 ? "text-green-400" : "text-red-400"} />
                                                <BSRow bold label="Net Cash from Financing" value={fmt(CFO.C9)} />

                                                <div className="mt-4 pt-2 border-t-2 border-white/10">
                                                    <BSRow bold label="C10 · Net Change in Cash" value={fmt(CFO.C10)} color={CFO.C10 >= 0 ? "text-green-400" : "text-red-400"} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                                {/* Quarter quick stats */}
                                <div className="md:col-span-3 grid grid-cols-2 gap-4 mt-2">
                                    <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                                        <p className="text-xs text-gray-500 uppercase mb-2 font-mono">Inventory Units (Q{selectedQuarter})</p>
                                        <p className="text-2xl font-mono text-white">{displayData.inventory_units.toLocaleString()} <span className="text-sm text-gray-600">units</span></p>
                                    </div>
                                    <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                                        <p className="text-xs text-gray-500 uppercase mb-2 font-mono">Debt (Credit / Loan) (Q{selectedQuarter})</p>
                                        <p className="text-2xl font-mono text-red-400">{fmt(displayData.credit_line)} <span className="text-sm text-gray-600">/ {fmt(displayData.bank_loan)}</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* ─── MARKET INTEL TAB ─── */}
                {tab === "market" && (
                    <div className="glass-panel p-6">
                        <SectionHeader title="🌐 Competitive Intelligence" color="text-teal-400" />
                        <p className="text-xs text-gray-500 font-mono mb-6">Showing competitors' previous quarter price & tech score. Financials are hidden.</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {allCompanies
                                .filter(c => c.company_id !== companyId)
                                .map(c => {
                                    const ts = c.comp_display_level + c.comp_optics_level + c.comp_tracking_level + c.comp_processor_level;
                                    return (
                                        <div key={c.company_id} className={`bg-black/40 border rounded-xl p-5 ${c.is_ai ? "border-fuchsia-500/30" : "border-cyan-500/30"}`}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="font-bold text-white">{c.name}</p>
                                                    <p className="text-xs text-gray-500 font-mono">{c.company_id} {c.is_ai ? "• AI" : "• Player"}</p>
                                                </div>
                                                <span className={`text-xs font-mono px-2 py-1 rounded ${c.is_ai ? "bg-fuchsia-900/40 text-fuchsia-300" : "bg-cyan-900/40 text-cyan-300"}`}>
                                                    {c.is_ai ? "AI" : "Human"}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-black/30 rounded p-3">
                                                    <p className="text-xs text-gray-500 mb-1 font-mono">Price</p>
                                                    <p className="text-lg font-mono text-yellow-400">{fmt(c.prev_price)}</p>
                                                </div>
                                                <div className="bg-black/30 rounded p-3">
                                                    <p className="text-xs text-gray-500 mb-1 font-mono">Tech Score</p>
                                                    <p className="text-lg font-mono text-teal-400">{ts} / 12</p>
                                                </div>
                                                <div className="bg-black/30 rounded p-3">
                                                    <p className="text-xs text-gray-500 mb-1 font-mono">Brand Equity</p>
                                                    <p className="text-lg font-mono text-fuchsia-400">{c.brand_equity} pts</p>
                                                </div>
                                                <div className="bg-black/30 rounded p-3">
                                                    <p className="text-xs text-gray-500 mb-1 font-mono">Status</p>
                                                    <p className={`text-sm font-mono ${c.is_frozen ? "text-red-400" : "text-green-400"}`}>{c.is_frozen ? "🔴 Frozen" : "🟢 Active"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                        <div className="mt-8 p-4 bg-black/30 border border-white/5 rounded-xl">
                            <p className="text-xs text-gray-500 font-mono uppercase mb-3">Market Conditions (Q{market?.current_quarter})</p>
                            <div className="grid grid-cols-3 gap-4 text-sm font-mono">
                                <div><span className="text-gray-600">Market Size:</span> <span className="text-white">{market?.market_size?.toLocaleString()} units</span></div>
                                <div><span className="text-gray-600">Growth Rate:</span> <span className="text-green-400">{market?.growth_rate_percent}% / qtr</span></div>
                                <div><span className="text-gray-600">Competitors:</span> <span className="text-white">{allCompanies.length} total</span></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── LEADERBOARD TAB ─── */}
                {tab === "leaderboard" && (
                    <div className="glass-panel p-6">
                        <SectionHeader title="🏆 Current Leaderboard" color="text-yellow-400" />
                        <p className="text-xs text-gray-500 font-mono mb-6">Weighted Score = 0.4 × Total Equity + 0.4 × Market Share + 0.2 × Brand Equity</p>
                        <table className="w-full text-sm font-mono">
                            <thead>
                                <tr className="border-b border-white/10 text-gray-500 text-xs uppercase">
                                    <th className="text-left py-2 pl-2"># Rank</th>
                                    <th className="text-left py-2">Company</th>
                                    <th className="text-right py-2">Total Equity</th>
                                    <th className="text-right py-2">Brand Equity</th>
                                    <th className="text-right py-2">Market Share</th>
                                    <th className="text-right py-2 pr-2">Weighted Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((c, i) => {
                                    const eq = c.shareholders_equity + c.retained_earnings;
                                    const isMe = c.company_id === companyId;
                                    return (
                                        <Fragment key={c.company_id}>
                                            <tr onClick={() => handleExpand(c.company_id)}
                                                className={`cursor-pointer border-b border-white/5 transition ${isMe ? "bg-cyan-500/5 border-l-2 border-l-cyan-400" : "hover:bg-white/5"}`}>
                                                <td className="py-3 pl-2">
                                                    <span className={`font-bold text-lg ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-600" : "text-gray-600"}`}>
                                                        #{c.rank}
                                                    </span>
                                                </td>
                                                <td className="py-3">
                                                    <p className="font-bold text-white flex items-center gap-2">
                                                        {c.name} {isMe && <span className="text-cyan-400 text-xs">(You)</span>}
                                                        <span className="text-gray-600 text-[10px]">{expandedRow === c.company_id ? "▲" : "▼"}</span>
                                                    </p>
                                                    <p className="text-xs text-gray-600">{c.is_ai ? "AI Competitor" : "Player"} · {c.is_frozen ? "🔴 Frozen" : "🟢 Active"}</p>
                                                </td>
                                                <td className={`py-3 text-right ${eq >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(eq)}</td>
                                                <td className="py-3 text-right text-fuchsia-400">{c.brand_equity} pts</td>
                                                <td className="py-3 text-right text-green-400">{Number(c.market_share || 0).toFixed(2)}%</td>
                                                <td className="py-3 text-right pr-2 text-white font-bold">{parseInt(c.score).toLocaleString()}</td>
                                            </tr>
                                            {expandedRow === c.company_id && (
                                                <tr className="bg-black/80 border-b border-cyan-500/20">
                                                    <td colSpan="6" className="p-4">
                                                        {!expandedHistory ? (
                                                            <div className="text-center text-cyan-400 font-mono text-sm py-8 animate-pulse">Retrieving historical data...</div>
                                                        ) : expandedHistory.length === 0 ? (
                                                            <div className="text-center text-gray-500 font-mono text-sm py-8">No historical data available.</div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                                <div>
                                                                    <p className="text-xs text-fuchsia-400 font-mono uppercase mb-2">Weighted Score</p>
                                                                    <ResponsiveContainer width="100%" height={160}>
                                                                        <LineChart data={expandedHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                                                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                                                            <XAxis dataKey="quarter" tick={{ fill: '#6b7280', fontSize: 10 }} />
                                                                            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                                                                            <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 8, color: '#e5e7eb', fontSize: 11 }} />
                                                                            <Line type="monotone" dataKey="weighted_score" stroke="#facc15" strokeWidth={2} dot={{ r: 2 }} />
                                                                        </LineChart>
                                                                    </ResponsiveContainer>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-cyan-400 font-mono uppercase mb-2">Total Equity</p>
                                                                    <ResponsiveContainer width="100%" height={160}>
                                                                        <LineChart data={expandedHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                                                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                                                            <XAxis dataKey="quarter" tick={{ fill: '#6b7280', fontSize: 10 }} />
                                                                            <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fill: '#6b7280', fontSize: 10 }} />
                                                                            <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 8, color: '#e5e7eb', fontSize: 11 }} formatter={v => "$" + v.toLocaleString()} />
                                                                            <Line type="monotone" dataKey="total_equity" stroke="#22d3ee" strokeWidth={2} dot={{ r: 2 }} />
                                                                        </LineChart>
                                                                    </ResponsiveContainer>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-fuchsia-400 font-mono uppercase mb-2">Brand Equity</p>
                                                                    <ResponsiveContainer width="100%" height={160}>
                                                                        <LineChart data={expandedHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                                                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                                                            <XAxis dataKey="quarter" tick={{ fill: '#6b7280', fontSize: 10 }} />
                                                                            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                                                                            <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 8, color: '#e5e7eb', fontSize: 11 }} />
                                                                            <Line type="monotone" dataKey="brand_equity" stroke="#e879f9" strokeWidth={2} dot={{ r: 2 }} />
                                                                        </LineChart>
                                                                    </ResponsiveContainer>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-green-400 font-mono uppercase mb-2">Market Share</p>
                                                                    <ResponsiveContainer width="100%" height={160}>
                                                                        <LineChart data={expandedHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                                                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                                                            <XAxis dataKey="quarter" tick={{ fill: '#6b7280', fontSize: 10 }} />
                                                                            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => `${v}%`} />
                                                                            <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 8, color: '#e5e7eb', fontSize: 11 }} formatter={v => v + "%"} />
                                                                            <Line type="monotone" dataKey="market_share" stroke="#4ade80" strokeWidth={2} dot={{ r: 2 }} />
                                                                        </LineChart>
                                                                    </ResponsiveContainer>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
}
