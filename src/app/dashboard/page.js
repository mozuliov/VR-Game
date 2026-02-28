"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { COMPONENT_COSTS, ASSEMBLY_COST } from "@/lib/engine/constants";

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
    const techScore = data.comp_display_level + data.comp_optics_level + data.comp_tracking_level + data.comp_processor_level;
    const unitCost = ASSEMBLY_COST + COMPONENT_COSTS.display[data.comp_display_level].cost + COMPONENT_COSTS.optics[data.comp_optics_level].cost + COMPONENT_COSTS.tracking[data.comp_tracking_level].cost + COMPONENT_COSTS.processor[data.comp_processor_level].cost;
    const totalDebt = data.credit_line + data.bank_loan;
    const totalAssets = data.cash + data.accounts_receivable + (data.inventory_units * unitCost) + netFixed;
    const debtRatio = totalAssets > 0 ? (totalDebt / totalAssets * 100).toFixed(1) : 0;

    // Build leaderboard with weighted score
    const buildScore = (c) => {
        const totalA = c.shareholders_equity + c.retained_earnings;
        const totalMkt = allCompanies.reduce((s, x) => s + Math.max(x.brand_equity || 0, 0), 0) || 1;
        const mktShare = (c.brand_equity || 0) / totalMkt;
        return (0.4 * totalA + 0.4 * mktShare * 100000 + 0.2 * (c.brand_equity || 0)).toFixed(0);
    };

    const leaderboard = [...allCompanies]
        .sort((a, b) => buildScore(b) - buildScore(a))
        .map((c, i) => ({ ...c, rank: i + 1, score: buildScore(c) }));

    // companyHistory is fetched live from /api/history/company/[id]

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
                    <StatCard title="Cash" value={fmt(data.cash)} color="text-green-400" />
                    <StatCard title="Total Equity" value={fmt(totalEquity)} color={totalEquity >= 500000 ? "text-green-400" : "text-red-400"} />
                    <StatCard title="Brand Equity" value={`${data.brand_equity} pts`} color="text-fuchsia-400" />
                    <StatCard title="Tech Score" value={`${techScore} / 12`} color="text-yellow-400" />
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
                                    <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)}
                                        className="w-full bg-black/50 border border-cyan-900 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-400 transition font-mono" />
                                    <p className="text-xs text-gray-600 mt-1">Unit Cost: {fmt(unitCost)}</p>
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
                            <div>
                                <label className="block text-xs text-blue-300 mb-1 font-mono uppercase">Financing</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="number" min="0" value={creditDraw} onChange={e => setCreditDraw(e.target.value)}
                                        placeholder="Credit Line Draw" className="bg-black/40 border border-blue-900 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400 transition font-mono" />
                                    <input type="number" min="0" value={creditRepay} onChange={e => setCreditRepay(e.target.value)}
                                        placeholder="Credit Line Repay" className="bg-black/40 border border-blue-900 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400 transition font-mono" />
                                    <input type="number" min="0" value={loanDraw} onChange={e => setLoanDraw(e.target.value)}
                                        placeholder="Bank Loan Draw" className="bg-black/40 border border-blue-900 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400 transition font-mono" />
                                    <input type="number" min="0" value={loanRepay} onChange={e => setLoanRepay(e.target.value)}
                                        placeholder="Bank Loan Repay" className="bg-black/40 border border-blue-900 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400 transition font-mono" />
                                </div>
                                <p className="text-xs text-gray-600 mt-1">Credit line: 12% APR / 3% qtr. Bank loan: 6% APR / 1.5% qtr. Total debt ≤ 50% of assets.</p>
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
                        <div className="glass-panel p-6 flex flex-col gap-5">
                            <SectionHeader title="⚗️ R&D — Component Upgrades" color="text-yellow-400" />
                            <p className="text-xs text-gray-500 font-mono">Each upgrade costs $150,000 (one-time). Effect applies next quarter (Lag Rule). Cannot skip levels.</p>

                            {[
                                { key: "display", label: "Display", level: data.comp_display_level, set: setUpgradeDisplay, val: upgradeDisplay },
                                { key: "optics", label: "Optics", level: data.comp_optics_level, set: setUpgradeOptics, val: upgradeOptics },
                                { key: "tracking", label: "Tracking", level: data.comp_tracking_level, set: setUpgradeTracking, val: upgradeTracking },
                                { key: "processor", label: "Processor", level: data.comp_processor_level, set: setUpgradeProcessor, val: upgradeProcessor },
                            ].map(({ key, label, level, set, val }) => {
                                const cur = COMPONENT_COSTS[key][level];
                                const next = level < 3 ? COMPONENT_COSTS[key][level + 1] : null;
                                return (
                                    <div key={key} className="bg-black/30 border border-white/10 rounded-xl p-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-bold text-white">{label}</p>
                                                <p className="text-xs text-gray-500 font-mono">Lvl {level}: {cur.name} — ${cur.cost}/unit</p>
                                                {next ? <p className="text-xs text-yellow-400 font-mono mt-1">→ Lvl {level + 1}: {next.name} — ${next.cost}/unit (+$150k)</p> : <p className="text-xs text-fuchsia-400 font-mono mt-1">✓ MAX LEVEL</p>}
                                            </div>
                                            {next && !data.is_frozen && (
                                                <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded border transition ${val ? "border-yellow-400 bg-yellow-500/10 text-yellow-300" : "border-gray-700 text-gray-500"}`}>
                                                    <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} className="accent-yellow-400" />
                                                    <span className="text-xs font-mono">Upgrade</span>
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Component Summary */}
                            <div className="bg-black/30 border border-yellow-500/20 rounded-xl p-4 mt-2">
                                <p className="text-xs text-gray-500 font-mono mb-2 uppercase">Current Tech Score</p>
                                <p className="text-3xl font-mono font-extrabold text-yellow-400">{techScore} <span className="text-base text-gray-600">/ 12</span></p>
                                <p className="text-xs text-gray-600 mt-1 font-mono">Unit Build Cost: {fmt(unitCost)} · Assembly: ${ASSEMBLY_COST} included</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── FINANCIALS TAB ─── */}
                {tab === "financials" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Balance Sheet */}
                        <div className="glass-panel p-6">
                            <SectionHeader title="Balance Sheet" />
                            <div className="flex flex-col gap-0.5">
                                <p className="text-xs text-gray-600 font-mono uppercase mb-2">Current Assets</p>
                                <BSRow indent label="A1 · Cash" value={fmt(data.cash)} color="text-green-400" />
                                <BSRow indent label="A2 · Accounts Receivable" value={fmt(data.accounts_receivable)} />
                                <BSRow indent label="A4 · Inventory" value={fmt(data.inventory_units * unitCost)} sub={`${data.inventory_units} units × ${fmt(unitCost)}`} />
                                <BSRow bold label="A5 · Total Current Assets" value={fmt(data.cash + data.accounts_receivable + data.inventory_units * unitCost)} />
                                <p className="text-xs text-gray-600 font-mono uppercase mt-4 mb-2">Fixed Assets</p>
                                <BSRow indent label="A6 · Fixed Assets (Gross)" value={fmt(data.fixed_assets_gross)} />
                                <BSRow indent label="A7 · Accum. Depreciation" value={`(${fmt(data.accumulated_depreciation)})`} color="text-red-400" />
                                <BSRow indent bold label="A8 · Net Fixed Assets" value={fmt(netFixed)} color="text-white" />
                                <BSRow bold label="A9 · Total Assets" value={fmt(totalAssets)} color="text-cyan-400" />
                                <p className="text-xs text-gray-600 font-mono uppercase mt-4 mb-2">Liabilities</p>
                                <BSRow indent label="A10 · Accounts Payable" value={fmt(data.accounts_payable)} />
                                <BSRow indent label="A11 · Credit Line" value={fmt(data.credit_line)} color="text-red-400" />
                                <BSRow indent label="A13 · Bank Loan" value={fmt(data.bank_loan)} color="text-red-400" />
                                <BSRow bold label="A15 · Total Liabilities" value={fmt(data.credit_line + data.bank_loan + data.accounts_payable)} color="text-red-400" />
                                <p className="text-xs text-gray-600 font-mono uppercase mt-4 mb-2">Equity</p>
                                <BSRow indent label="A16 · Shareholders' Equity" value={fmt(data.shareholders_equity)} />
                                <BSRow indent label="A17 · Retained Earnings" value={fmt(data.retained_earnings)} color={data.retained_earnings >= 0 ? "text-green-400" : "text-red-400"} />
                                <BSRow bold label="A18 · Total Equity" value={fmt(totalEquity)} color={totalEquity >= 0 ? "text-green-400" : "text-red-400"} />
                                <div className="mt-4 p-3 rounded bg-black/30 border border-gray-800 text-xs font-mono text-gray-500">
                                    Debt / Assets: <span className={parseFloat(debtRatio) > 50 ? "text-red-400" : "text-green-400"}>{debtRatio}%</span> (max 50%)
                                </div>
                            </div>
                        </div>

                        {/* P&L and Cash Flow */}
                        <div className="glass-panel p-6 md:col-span-2 flex flex-col gap-8">
                            {!data.last_q_ledger ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-600 font-mono text-sm border-2 border-dashed border-white/5 rounded-xl p-8">
                                    <p>No P&L or Cash Flow data yet.</p>
                                    <p className="mt-2">Advance the first quarter to see your performance metrics.</p>
                                </div>
                            ) : (() => {
                                const ledger = JSON.parse(data.last_q_ledger);
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

                        {/* Trend Charts */}
                        <div className="glass-panel p-6 md:col-span-3 flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <SectionHeader title="📈 Historical Trends" color="text-fuchsia-400" />
                                <span className="text-xs text-gray-600 font-mono">{companyHistory.length} quarters recorded</span>
                            </div>

                            {companyHistory.length < 1 ? (
                                <div className="bg-black/30 rounded-xl border border-fuchsia-500/10 p-4 h-48 flex items-center justify-center">
                                    <span className="text-gray-600 font-mono text-sm">No snapshot history yet. Advance the first quarter to start recording.</span>
                                </div>
                            ) : (
                                <>
                                    {/* Equity & Cash chart */}
                                    <div>
                                        <p className="text-xs text-gray-500 font-mono uppercase mb-2">Total Equity vs. Cash</p>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <LineChart data={companyHistory} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                                <XAxis dataKey="quarter" tick={{ fill: '#6b7280', fontSize: 11 }} />
                                                <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#6b7280', fontSize: 11 }} width={56} />
                                                <Tooltip
                                                    contentStyle={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 8, color: '#e5e7eb', fontFamily: 'monospace', fontSize: 12 }}
                                                    formatter={(v, name) => [`$${Number(v).toLocaleString()}`, name]}
                                                />
                                                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                                                <Line type="monotone" dataKey="total_equity" name="Total Equity" stroke="#22d3ee" strokeWidth={2} dot={{ r: 3, fill: '#22d3ee' }} />
                                                <Line type="monotone" dataKey="cash" name="Cash" stroke="#4ade80" strokeWidth={2} dot={{ r: 3, fill: '#4ade80' }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Brand Equity & Tech Score chart */}
                                    <div>
                                        <p className="text-xs text-gray-500 font-mono uppercase mb-2">Brand Equity & Tech Score</p>
                                        <ResponsiveContainer width="100%" height={180}>
                                            <LineChart data={companyHistory} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                                <XAxis dataKey="quarter" tick={{ fill: '#6b7280', fontSize: 11 }} />
                                                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} width={36} />
                                                <Tooltip
                                                    contentStyle={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 8, color: '#e5e7eb', fontFamily: 'monospace', fontSize: 12 }}
                                                />
                                                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                                                <Line type="monotone" dataKey="brand_equity" name="Brand Equity" stroke="#e879f9" strokeWidth={2} dot={{ r: 3, fill: '#e879f9' }} />
                                                <Line type="monotone" dataKey="tech_score" name="Tech Score" stroke="#facc15" strokeWidth={2} dot={{ r: 3, fill: '#facc15' }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Inventory units chart */}
                                    <div>
                                        <p className="text-xs text-gray-500 font-mono uppercase mb-2">Inventory Units (End of Quarter)</p>
                                        <ResponsiveContainer width="100%" height={160}>
                                            <LineChart data={companyHistory} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                                <XAxis dataKey="quarter" tick={{ fill: '#6b7280', fontSize: 11 }} />
                                                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} width={48} />
                                                <Tooltip
                                                    contentStyle={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 8, color: '#e5e7eb', fontFamily: 'monospace', fontSize: 12 }}
                                                />
                                                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                                                <Line type="monotone" dataKey="inventory_units" name="Inventory (units)" stroke="#fb923c" strokeWidth={2} dot={{ r: 3, fill: '#fb923c' }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </>
                            )}

                            {/* Current-state quick stats */}
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                                <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                                    <p className="text-xs text-gray-500 uppercase mb-2 font-mono">Inventory (Current)</p>
                                    <p className="text-2xl font-mono text-white">{data.inventory_units.toLocaleString()} <span className="text-sm text-gray-600">units</span></p>
                                </div>
                                <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                                    <p className="text-xs text-gray-500 uppercase mb-2 font-mono">Debt (Credit / Loan)</p>
                                    <p className="text-2xl font-mono text-red-400">{fmt(data.credit_line)} <span className="text-sm text-gray-600">/ {fmt(data.bank_loan)}</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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
                                    <th className="text-right py-2">Tech Score</th>
                                    <th className="text-right py-2 pr-2">Weighted Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((c, i) => {
                                    const ts = c.comp_display_level + c.comp_optics_level + c.comp_tracking_level + c.comp_processor_level;
                                    const eq = c.shareholders_equity + c.retained_earnings;
                                    const isMe = c.company_id === companyId;
                                    return (
                                        <tr key={c.company_id}
                                            className={`border-b border-white/5 transition ${isMe ? "bg-cyan-500/5 border-l-2 border-l-cyan-400" : "hover:bg-white/5"}`}>
                                            <td className="py-3 pl-2">
                                                <span className={`font-bold text-lg ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-600" : "text-gray-600"}`}>
                                                    #{c.rank}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                <p className="font-bold text-white">{c.name} {isMe && <span className="text-cyan-400 text-xs">(You)</span>}</p>
                                                <p className="text-xs text-gray-600">{c.is_ai ? "AI Competitor" : "Player"} · {c.is_frozen ? "🔴 Frozen" : "🟢 Active"}</p>
                                            </td>
                                            <td className={`py-3 text-right ${eq >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(eq)}</td>
                                            <td className="py-3 text-right text-fuchsia-400">{c.brand_equity} pts</td>
                                            <td className="py-3 text-right text-yellow-400">{ts} / 12</td>
                                            <td className="py-3 text-right pr-2 text-white font-bold">{parseInt(c.score).toLocaleString()}</td>
                                        </tr>
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
