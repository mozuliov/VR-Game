"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { COMPONENT_COSTS, ASSEMBLY_COST, getPriceMultiplier } from "@/lib/engine/constants";

function fmt(n) {
    if (n == null) return "—";
    return "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtPct(n) { return n == null ? "—" : `${Number(n).toFixed(1)}%`; }

function LevelPips({ level, max = 3, danger = false }) {
    return (
        <div className="level-bar">
            {Array.from({ length: max }).map((_, i) => (
                <div
                    key={i}
                    className={`level-pip ${i < level ? (danger ? "danger" : "active") : ""}`}
                />
            ))}
        </div>
    );
}

function StatCard({ title, value, color = "text-white", sub, icon }) {
    return (
        <div className="glass-panel p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 mb-1">
                {icon && <span className="text-gray-500 text-xs">{icon}</span>}
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">{title}</p>
            </div>
            <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
            {sub && <p className="text-[10px] text-gray-600 font-mono mt-0.5">{sub}</p>}
        </div>
    );
}

function BSRow({ label, value, bold, indent, color, highlight }) {
    return (
        <div className={`data-row ${bold ? "text-white font-bold" : "text-gray-400"} ${indent ? "pl-4" : ""} ${highlight ? "bg-cyan-400/5 -mx-2 px-2 rounded" : ""}`}>
            <span className="text-xs">{label}</span>
            <span className={`text-xs tabular-nums ${color || ""}`}>{value}</span>
        </div>
    );
}

function SectionTitle({ children, color = "text-cyan-400", icon }) {
    return (
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/8">
            {icon && <span>{icon}</span>}
            <h2 className={`text-lg font-bold tracking-wide ${color}`}>{children}</h2>
        </div>
    );
}

function TabButton({ active, onClick, children, accentColor = "cyan" }) {
    const activeClasses = accentColor === "amber"
        ? "bg-amber-500/10 border-amber-400 text-amber-300"
        : "bg-cyan-500/10 border-cyan-400 text-cyan-300";
    return (
        <button
            onClick={onClick}
            className={`px-5 py-2 rounded-t-lg text-xs font-mono font-semibold transition-all border-b-2 tracking-widest uppercase ${active ? activeClasses : "border-transparent text-gray-600 hover:text-gray-300 hover:bg-white/5"}`}
        >
            {children}
        </button>
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
            setPrice(c.prev_price || 600);
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
            setSubmitMsg(`✓ Decisions locked. R&D fee: ${fmt(json.rd_fee_total)}. Await GM to advance.`);
            setUpgradeDisplay(false); setUpgradeOptics(false);
            setUpgradeTracking(false); setUpgradeProcessor(false);
            fetchAll(companyId);
        } else {
            const err = await res.json();
            setSubmitMsg(`✗ ${err.error || "Submission failed."}`);
        }
    };

    if (!data) return (
        <div className="flex items-center justify-center h-screen grid-bg">
            <div className="text-center space-y-4">
                <div className="w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-cyan-400 font-mono text-sm tracking-widest animate-pulse">CONNECTING TO NEXUS...</p>
            </div>
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
    const debtRatio = totalAssets > 0 ? (totalDebt / totalAssets * 100) : 0;
    const priceOverCap = Number(price) > maxPrice;

    const buildScore = (c) => {
        const totalMkt = allCompanies.reduce((s, x) => s + Math.max(x.brand_equity || 0, 0), 0) || 1;
        const mktShare = (c.brand_equity || 0) / totalMkt;
        return (0.4 * (c.shareholders_equity + c.retained_earnings) + 0.4 * mktShare * 100000 + 0.2 * (c.brand_equity || 0)).toFixed(0);
    };

    const leaderboard = [...allCompanies]
        .sort((a, b) => buildScore(b) - buildScore(a))
        .map((c, i) => ({ ...c, rank: i + 1, score: buildScore(c) }));

    const componentDefs = [
        { key: "display", label: "Display", icon: "▣", level: data.comp_display_level, set: setUpgradeDisplay, val: upgradeDisplay, projLvl: dispLvl },
        { key: "optics", label: "Optics", icon: "◎", level: data.comp_optics_level, set: setUpgradeOptics, val: upgradeOptics, projLvl: optLvl },
        { key: "tracking", label: "Tracking", icon: "⊕", level: data.comp_tracking_level, set: setUpgradeTracking, val: upgradeTracking, projLvl: trackLvl },
        { key: "processor", label: "Processor", icon: "◈", level: data.comp_processor_level, set: setUpgradeProcessor, val: upgradeProcessor, projLvl: procLvl },
    ];

    return (
        <div className="min-h-screen grid-bg scan-line text-gray-100 relative">
            {/* Ambient glows */}
            <div className="glow-orb-cyan w-[500px] h-[500px] top-[0px] left-[-100px]" />
            <div className="glow-orb-fuchsia w-[400px] h-[400px] bottom-[0px] right-[-80px]" />

            {/* Top Nav */}
            <nav className="sticky top-0 z-50 bg-black/60 backdrop-blur-xl border-b border-cyan-500/15 px-8 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-cyan" />
                        <span className="text-cyan-400 font-bold text-base tracking-[0.15em] font-mono">VR NEXUS</span>
                    </div>
                    <span className="text-gray-700">|</span>
                    <span className="text-gray-400 text-sm font-mono">{data.name}</span>
                </div>
                <div className="flex items-center gap-5">
                    {data.is_frozen === 1 && (
                        <span className="bg-red-900/50 border border-red-500/60 text-red-300 text-[10px] font-mono px-3 py-1.5 rounded-lg pulse-red tracking-widest uppercase flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                            Liquidity Freeze
                        </span>
                    )}
                    <span className="text-gray-600 text-xs font-mono tracking-widest">Q{market?.current_quarter || "—"}</span>
                    <button onClick={() => fetchAll(companyId)} className="text-[11px] text-gray-700 hover:text-cyan-400 transition font-mono tracking-widest uppercase">Refresh</button>
                    <button onClick={() => { sessionStorage.clear(); router.push("/"); }} className="text-[11px] text-gray-700 hover:text-red-400 transition font-mono tracking-widest uppercase">Exit</button>
                </div>
            </nav>

            {/* KPI Strip */}
            <div className="max-w-7xl mx-auto px-8 pt-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                    <StatCard title="Cash" value={fmt(data.cash)} color="text-cyan-300" icon="◈" />
                    <StatCard title="Total Equity" value={fmt(totalEquity)} color={totalEquity >= 0 ? "text-green-400" : "text-red-400"} icon="▲" />
                    <StatCard title="Brand Equity" value={`${data.brand_equity} pts`} color="text-fuchsia-400" icon="◆" />
                    <StatCard title="Tech Score" value={`${techScore} / 12`} color="text-amber-400" sub="Proj. next quarter" icon="⚡" />
                    <StatCard title="Max Capacity" value={`${maxCap.toLocaleString()} units`} color="text-white" sub={`Net Fixed: ${fmt(netFixed)}`} icon="⊞" />
                </div>

                {/* Debt Ratio Bar */}
                <div className="glass-panel px-5 py-3 mb-6 flex items-center gap-4">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest whitespace-nowrap">Debt / Assets</span>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${debtRatio > 50 ? "bg-red-500" : debtRatio > 35 ? "bg-amber-500" : "bg-cyan-400"}`}
                            style={{ width: `${Math.min(debtRatio, 100)}%` }}
                        />
                    </div>
                    <span className={`text-sm font-mono font-bold tabular-nums ${debtRatio > 50 ? "text-red-400" : debtRatio > 35 ? "text-amber-400" : "text-green-400"}`}>
                        {fmtPct(debtRatio)} <span className="text-[10px] text-gray-600">/ 50% max</span>
                    </span>
                </div>
            </div>

            {/* Tab Bar */}
            <div className="flex gap-1 px-8 pb-0 max-w-7xl mx-auto">
                {[
                    { id: "decisions", label: "Decisions" },
                    { id: "financials", label: "Financials" },
                    { id: "market", label: "Market Intel" },
                    { id: "leaderboard", label: "Leaderboard" },
                ].map((t) => (
                    <TabButton key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
                        {t.label}
                    </TabButton>
                ))}
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-8 py-6 relative z-10">

                {/* ─── DECISIONS TAB ─── */}
                {tab === "decisions" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <form onSubmit={submitDecisions} className="glass-panel p-6 flex flex-col gap-5">
                            <SectionTitle icon="📋" color="text-cyan-300">Quarter Decision Hub</SectionTitle>

                            {data.is_frozen === 1 && (
                                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-xs font-mono flex items-start gap-2">
                                    <span>⚠</span>
                                    <span>Liquidity Freeze Active. Marketing &amp; R&D spend forced to $0 this quarter.</span>
                                </div>
                            )}

                            {/* Price & Volume */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1.5">Unit Price ($)</label>
                                    <input type="number" min="0" max={maxPrice} value={price} onChange={e => setPrice(e.target.value)}
                                        className={`w-full bg-black/40 border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none transition font-mono ${priceOverCap ? "border-red-500 focus:border-red-400 text-red-300" : "border-cyan-900/60 focus:border-cyan-400"}`} />
                                    <p className={`text-[10px] mt-1 font-mono ${priceOverCap ? "text-red-400" : "text-gray-600"}`}>
                                        Max: {fmt(maxPrice)} · Cost: {fmt(unitCost)}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1.5">Production Volume</label>
                                    <input type="number" min="0" max={maxCap} value={volume} onChange={e => setVolume(e.target.value)}
                                        className="w-full bg-black/40 border border-cyan-900/60 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400 transition font-mono" />
                                    <p className="text-[10px] text-gray-600 mt-1 font-mono">Max: {maxCap.toLocaleString()} units</p>
                                </div>
                            </div>

                            {/* Brand Spend */}
                            <div>
                                <label className="block text-[10px] text-fuchsia-400/80 font-mono uppercase tracking-widest mb-1.5">
                                    Brand Spend ($) <span className="text-gray-600 normal-case">— min $5k to avoid decay</span>
                                </label>
                                <input type="number" min="0" value={brandSpend} onChange={e => setBrandSpend(e.target.value)}
                                    disabled={data.is_frozen === 1}
                                    className="w-full bg-black/40 border border-fuchsia-900/50 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-fuchsia-400 transition font-mono disabled:opacity-30" />
                            </div>

                            {/* CapEx */}
                            <div>
                                <label className="block text-[10px] text-amber-400/80 font-mono uppercase tracking-widest mb-1.5">Capital Expenditure / Fixed Assets ($)</label>
                                <input type="number" min="0" value={capex} onChange={e => setCapex(e.target.value)}
                                    className="w-full bg-black/40 border border-amber-900/50 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400 transition font-mono" />
                                <p className="text-[10px] text-gray-600 mt-1 font-mono">+10 units capacity per $1,000 invested</p>
                            </div>

                            {/* Financing */}
                            <div className="bg-black/30 border border-blue-900/30 rounded-xl p-4">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-xs font-mono font-bold text-blue-300 tracking-widest uppercase">Financing</p>
                                    <span className="text-[10px] font-mono text-gray-600">
                                        Available: <span className="text-green-400">{fmt(Math.max(0, (totalAssets * 0.5) - totalDebt))}</span>
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {[
                                        { label: "Credit Line", rate: "12% APR / 3% qtr", current: data.credit_line, draw: creditDraw, setDraw: setCreditDraw, repay: creditRepay, setRepay: setCreditRepay },
                                        { label: "Bank Loan", rate: "6% APR / 1.5% qtr", current: data.bank_loan, draw: loanDraw, setDraw: setLoanDraw, repay: loanRepay, setRepay: setLoanRepay },
                                    ].map(debt => (
                                        <div key={debt.label} className="border border-blue-900/20 rounded-lg p-3">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-mono font-bold text-blue-200 uppercase tracking-widest">{debt.label}</span>
                                                <span className="text-[10px] font-mono text-gray-600">{debt.rate} · Bal: {fmt(debt.current)}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-[9px] text-gray-600 mb-1 font-mono uppercase tracking-widest">+ Draw (Borrow)</label>
                                                    <input type="number" min="0" value={debt.draw} onChange={e => debt.setDraw(e.target.value)} placeholder="0"
                                                        className="w-full bg-black/40 border border-blue-900/30 rounded px-2.5 py-1.5 text-green-400 text-xs focus:outline-none focus:border-blue-400 transition font-mono" />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] text-gray-600 mb-1 font-mono uppercase tracking-widest">− Repay</label>
                                                    <input type="number" min="0" value={debt.repay} onChange={e => debt.setRepay(e.target.value)} placeholder="0"
                                                        className="w-full bg-black/40 border border-blue-900/30 rounded px-2.5 py-1.5 text-red-400 text-xs focus:outline-none focus:border-blue-400 transition font-mono" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {submitMsg && (
                                <div className={`text-xs font-mono px-4 py-3 rounded-lg border ${submitMsg.startsWith("✓") ? "bg-green-900/20 border-green-500/40 text-green-300" : "bg-red-900/20 border-red-500/40 text-red-300"}`}>
                                    {submitMsg}
                                </div>
                            )}

                            <button type="submit"
                                className="py-3 rounded-lg bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/50 hover:border-cyan-400 text-cyan-300 font-bold font-mono text-sm transition-all hover:shadow-[0_0_20px_rgba(13,242,242,0.2)] tracking-widest uppercase">
                                🔒 Lock In Decisions
                            </button>
                        </form>

                        {/* R&D Panel */}
                        <div className="glass-panel p-6 flex flex-col gap-4">
                            <SectionTitle icon="⚗️" color="text-amber-400">R&amp;D — Component Upgrades</SectionTitle>
                            <p className="text-[10px] font-mono text-gray-600 -mt-2 mb-1">Each upgrade costs $150,000 one-time. Effect applies next quarter. Cannot skip levels.</p>

                            {componentDefs.map(({ key, label, icon, level, set, val, projLvl }) => {
                                const cur = COMPONENT_COSTS[key][level];
                                const next = level < 3 ? COMPONENT_COSTS[key][level + 1] : null;
                                return (
                                    <div key={key} className={`bg-black/30 border rounded-xl p-4 transition-all ${val ? "border-amber-500/50 bg-amber-500/5" : "border-white/8"}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="text-gray-500 text-sm">{icon}</span>
                                                    <p className="text-sm font-bold text-white">{label}</p>
                                                    <LevelPips level={projLvl} />
                                                </div>
                                                <p className="text-[10px] font-mono text-gray-500">Current: Lvl {level} · {cur.name} · ${cur.cost}/unit</p>
                                                {next
                                                    ? <p className="text-[10px] font-mono text-amber-400/80 mt-0.5">→ Lvl {level + 1}: {next.name} · ${next.cost}/unit (+$150k)</p>
                                                    : <p className="text-[10px] font-mono text-cyan-400/80 mt-0.5">✓ MAX LEVEL</p>
                                                }
                                            </div>
                                            {next && !data.is_frozen && (
                                                <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border transition ml-3 ${val ? "border-amber-400 bg-amber-500/10 text-amber-300" : "border-gray-700 text-gray-600 hover:border-gray-500"}`}>
                                                    <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} className="accent-amber-400 w-3 h-3" />
                                                    <span className="text-[10px] font-mono uppercase tracking-widest">Upgrade</span>
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Tech Summary */}
                            <div className="bg-black/30 border border-amber-500/15 rounded-xl p-4 mt-auto">
                                <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-2">Projected Tech Score (Next Qtr)</p>
                                <div className="flex items-end gap-3">
                                    <p className="text-4xl font-bold font-mono text-amber-400">{techScore}</p>
                                    <p className="text-gray-600 font-mono mb-1">/ 12</p>
                                    <div className="ml-2 mb-1">
                                        <LevelPips level={techScore} max={12} />
                                    </div>
                                </div>
                                <p className="text-[10px] font-mono text-gray-600 mt-2">Unit Build Cost: {fmt(unitCost)} · Max Price Cap: {fmt(maxPrice)}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── FINANCIALS TAB ─── */}
                {tab === "financials" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Balance Sheet */}
                        <div className="glass-panel p-6">
                            <SectionTitle icon="📄" color="text-cyan-300">Balance Sheet</SectionTitle>
                            <div className="flex flex-col gap-0">
                                <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mt-1 mb-2">Current Assets</p>
                                <BSRow indent label="A1 · Cash" value={fmt(data.cash)} color="text-cyan-300" />
                                <BSRow indent label="A2 · Accounts Receivable" value={fmt(data.accounts_receivable)} />
                                <BSRow indent label="A4 · Inventory" value={fmt(data.inventory_units * unitCost)} />
                                <BSRow bold label="A5 · Total Current Assets" value={fmt(data.cash + data.accounts_receivable + data.inventory_units * unitCost)} highlight />
                                <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mt-3 mb-2">Fixed Assets</p>
                                <BSRow indent label="A6 · Fixed Assets (Gross)" value={fmt(data.fixed_assets_gross)} />
                                <BSRow indent label="A7 · Accum. Depreciation" value={`(${fmt(data.accumulated_depreciation)})`} color="text-red-400" />
                                <BSRow indent bold label="A8 · Net Fixed Assets" value={fmt(netFixed)} />
                                <BSRow bold label="A9 · Total Assets" value={fmt(totalAssets)} color="text-cyan-300" highlight />
                                <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mt-3 mb-2">Liabilities</p>
                                <BSRow indent label="A10 · Accounts Payable" value={fmt(data.accounts_payable)} />
                                <BSRow indent label="A11 · Credit Line" value={fmt(data.credit_line)} color="text-red-400" />
                                <BSRow indent label="A13 · Bank Loan" value={fmt(data.bank_loan)} color="text-red-400" />
                                <BSRow bold label="A15 · Total Liabilities" value={fmt(data.credit_line + data.bank_loan + data.accounts_payable)} color="text-red-400" highlight />
                                <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mt-3 mb-2">Equity</p>
                                <BSRow indent label="A16 · Shareholders' Equity" value={fmt(data.shareholders_equity)} />
                                <BSRow indent label="A17 · Retained Earnings" value={fmt(data.retained_earnings)} color={data.retained_earnings >= 0 ? "text-green-400" : "text-red-400"} />
                                <BSRow bold label="A18 · Total Equity" value={fmt(totalEquity)} color={totalEquity >= 0 ? "text-green-400" : "text-red-400"} highlight />
                            </div>
                        </div>

                        {/* P&L and Cash Flow */}
                        <div className="glass-panel p-6 md:col-span-2">
                            {!data.last_q_ledger ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-700 font-mono text-sm border-2 border-dashed border-white/5 rounded-xl p-8 text-center gap-2">
                                    <span className="text-3xl">📊</span>
                                    <p>No P&L or Cash Flow data yet.</p>
                                    <p className="text-xs text-gray-600">Advance the first quarter to see performance metrics.</p>
                                </div>
                            ) : (() => {
                                const ledger = typeof data.last_q_ledger === 'string' ? JSON.parse(data.last_q_ledger) : data.last_q_ledger;
                                const { P_L, CFO } = ledger;
                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <SectionTitle icon="📈" color="text-amber-400">Profit &amp; Loss</SectionTitle>
                                            <BSRow label="B1 · Revenue" value={fmt(P_L.B1)} color="text-white" />
                                            <BSRow label="B2 · COGS" value={`(${fmt(P_L.B2)})`} color="text-red-400" />
                                            <BSRow bold label="B3 · Gross Profit" value={fmt(P_L.B3)} color={P_L.B3 >= 0 ? "text-green-400" : "text-red-400"} highlight />
                                            <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mt-3 mb-2">Operating Expenses</p>
                                            <BSRow indent label="B4 · Marketing & Brand" value={`(${fmt(P_L.B4)})`} color="text-red-400" />
                                            <BSRow indent label="B5 · R&D (Fees + Maint)" value={`(${fmt(P_L.B5)})`} color="text-red-400" />
                                            <BSRow indent label="B5b · Fixed Overhead" value={`(${fmt(P_L.B5b)})`} color="text-red-400" />
                                            <BSRow indent label="B6 · Depreciation" value={`(${fmt(P_L.B6)})`} color="text-red-400" />
                                            <BSRow bold label="B7 · EBIT" value={fmt(P_L.B7)} color={P_L.B7 >= 0 ? "text-green-400" : "text-red-400"} highlight />
                                            <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mt-3 mb-2">Financing & Taxes</p>
                                            <BSRow indent label="B8 · Interest Expense" value={fmt(P_L.B8)} color="text-red-400" />
                                            <BSRow bold label="B9 · Net Income" value={fmt(P_L.B9)} color={P_L.B9 >= 0 ? "text-green-400" : "text-red-400"} highlight />
                                        </div>
                                        <div>
                                            <SectionTitle icon="💧" color="text-cyan-300">Cash Flow</SectionTitle>
                                            <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mb-2">Operating Activities</p>
                                            <BSRow indent label="C1 · Cash from Customers" value={fmt(CFO.C1)} />
                                            <BSRow indent label="C2 · Cash Paid Inventory" value={`(${fmt(CFO.C2)})`} />
                                            <BSRow indent label="C3 · Cash Paid OpEx/R&D" value={`(${fmt(CFO.C3)})`} />
                                            <BSRow indent label="C4 · Cash Paid Interest" value={`(${fmt(CFO.C4)})`} />
                                            <BSRow bold label="C5 · Net Cash from Ops" value={fmt(CFO.C5)} color={CFO.C5 >= 0 ? "text-green-400" : "text-red-400"} highlight />
                                            <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mt-3 mb-2">Investing</p>
                                            <BSRow indent label="C6 · Capital Expenditures" value={`(${fmt(CFO.C6)})`} />
                                            <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mt-3 mb-2">Financing</p>
                                            <BSRow indent label="C7 · Debt Activity (Net)" value={fmt(CFO.C7)} color={CFO.C7 >= 0 ? "text-green-400" : "text-red-400"} />
                                            <BSRow bold label="C9 · Net Cash Financing" value={fmt(CFO.C9)} highlight />
                                            <div className="mt-4 pt-3 border-t border-white/8">
                                                <BSRow bold label="C10 · Net Δ Cash" value={fmt(CFO.C10)} color={CFO.C10 >= 0 ? "text-green-400" : "text-red-400"} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Trend Charts */}
                        {companyHistory.length > 0 && (
                            <div className="glass-panel p-6 md:col-span-3">
                                <SectionTitle icon="📊" color="text-fuchsia-400">Historical Trends</SectionTitle>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-[10px] text-gray-600 font-mono uppercase tracking-widest mb-3">Total Equity vs. Cash</p>
                                        <ResponsiveContainer width="100%" height={180}>
                                            <LineChart data={companyHistory}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#0d1117" />
                                                <XAxis dataKey="quarter" tick={{ fill: '#4b5563', fontSize: 10 }} />
                                                <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#4b5563', fontSize: 10 }} width={50} />
                                                <Tooltip contentStyle={{ background: '#050810', border: '1px solid #1e2d4a', borderRadius: 8, color: '#e2e8f0', fontFamily: 'Space Mono', fontSize: 11 }} formatter={(v, n) => [`$${Number(v).toLocaleString()}`, n]} />
                                                <Legend wrapperStyle={{ fontSize: 10, color: '#6b7280' }} />
                                                <Line type="monotone" dataKey="total_equity" name="Equity" stroke="#0df2f2" strokeWidth={2} dot={{ r: 2, fill: '#0df2f2' }} />
                                                <Line type="monotone" dataKey="cash" name="Cash" stroke="#4ade80" strokeWidth={2} dot={{ r: 2, fill: '#4ade80' }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-600 font-mono uppercase tracking-widest mb-3">Brand Equity &amp; Tech Score</p>
                                        <ResponsiveContainer width="100%" height={180}>
                                            <LineChart data={companyHistory}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#0d1117" />
                                                <XAxis dataKey="quarter" tick={{ fill: '#4b5563', fontSize: 10 }} />
                                                <YAxis tick={{ fill: '#4b5563', fontSize: 10 }} width={30} />
                                                <Tooltip contentStyle={{ background: '#050810', border: '1px solid #1e2d4a', borderRadius: 8, color: '#e2e8f0', fontFamily: 'Space Mono', fontSize: 11 }} />
                                                <Legend wrapperStyle={{ fontSize: 10, color: '#6b7280' }} />
                                                <Line type="monotone" dataKey="brand_equity" name="Brand" stroke="#e040fb" strokeWidth={2} dot={{ r: 2, fill: '#e040fb' }} />
                                                <Line type="monotone" dataKey="tech_score" name="Tech" stroke="#f2a60d" strokeWidth={2} dot={{ r: 2, fill: '#f2a60d' }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── MARKET INTEL TAB ─── */}
                {tab === "market" && (
                    <div className="glass-panel p-6">
                        <SectionTitle icon="🌐" color="text-cyan-300">Competitive Intelligence</SectionTitle>
                        <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-5">Previous quarter price &amp; tech score only. Financials are classified.</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            {allCompanies.filter(c => c.company_id !== companyId).map(c => {
                                const ts = c.comp_display_level + c.comp_optics_level + c.comp_tracking_level + c.comp_processor_level;
                                return (
                                    <div key={c.company_id} className={`bg-black/30 border rounded-xl p-5 ${c.is_ai ? "border-fuchsia-500/20" : "border-cyan-500/20"}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <p className="font-bold text-white text-sm">{c.name}</p>
                                                <p className="text-[10px] text-gray-600 font-mono mt-0.5">{c.company_id}</p>
                                            </div>
                                            <span className={`text-[10px] font-mono px-2 py-1 rounded-lg ${c.is_ai ? "bg-fuchsia-900/40 text-fuchsia-300" : "bg-cyan-900/30 text-cyan-300"}`}>
                                                {c.is_ai ? "AI" : "Human"}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { label: "Price", value: fmt(c.prev_price), color: "text-amber-400" },
                                                { label: "Tech Score", value: `${ts} / 12`, color: "text-cyan-300" },
                                                { label: "Brand Equity", value: `${c.brand_equity} pts`, color: "text-fuchsia-400" },
                                                { label: "Status", value: c.is_frozen ? "🔴 Frozen" : "🟢 Active", color: c.is_frozen ? "text-red-400" : "text-green-400" },
                                            ].map(({ label, value, color }) => (
                                                <div key={label} className="bg-black/30 rounded-lg p-2.5">
                                                    <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mb-1">{label}</p>
                                                    <p className={`text-sm font-mono font-bold ${color}`}>{value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="border-t border-white/5 pt-4 grid grid-cols-3 gap-4 text-xs font-mono">
                            <div><span className="text-gray-600">Market Size: </span><span className="text-white">{market?.market_size?.toLocaleString()} units</span></div>
                            <div><span className="text-gray-600">Growth Rate: </span><span className="text-green-400">{market?.growth_rate_percent}% / qtr</span></div>
                            <div><span className="text-gray-600">Competitors: </span><span className="text-white">{allCompanies.length} total</span></div>
                        </div>
                    </div>
                )}

                {/* ─── LEADERBOARD TAB ─── */}
                {tab === "leaderboard" && (
                    <div className="glass-panel p-6">
                        <SectionTitle icon="🏆" color="text-amber-400">Current Leaderboard</SectionTitle>
                        <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-5">Score = 0.4 × Equity + 0.4 × Market Share + 0.2 × Brand Equity</p>
                        <table className="w-full text-xs font-mono">
                            <thead>
                                <tr className="border-b border-white/8 text-gray-600 text-[9px] uppercase tracking-widest">
                                    <th className="text-left py-2 pl-2">#</th>
                                    <th className="text-left py-2">Company</th>
                                    <th className="text-right py-2">Total Equity</th>
                                    <th className="text-right py-2">Brand</th>
                                    <th className="text-right py-2">Tech</th>
                                    <th className="text-right py-2 pr-2">Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((c, i) => {
                                    const ts = c.comp_display_level + c.comp_optics_level + c.comp_tracking_level + c.comp_processor_level;
                                    const eq = c.shareholders_equity + c.retained_earnings;
                                    const isMe = c.company_id === companyId;
                                    return (
                                        <tr key={c.company_id}
                                            className={`border-b border-white/5 transition ${isMe ? "bg-cyan-400/5 border-l-2 border-l-cyan-400" : "hover:bg-white/3"}`}>
                                            <td className="py-3 pl-2 font-bold text-base">
                                                <span className={i === 0 ? "text-amber-400" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-600" : "text-gray-700"}>
                                                    #{c.rank}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                <p className="font-bold text-white">{c.name} {isMe && <span className="text-cyan-400 text-[10px]">(You)</span>}</p>
                                                <p className="text-[9px] text-gray-600">{c.is_ai ? "AI" : "Player"} · {c.is_frozen ? "🔴 Frozen" : "🟢 Active"}</p>
                                            </td>
                                            <td className={`py-3 text-right tabular-nums ${eq >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(eq)}</td>
                                            <td className="py-3 text-right text-fuchsia-400 tabular-nums">{c.brand_equity}</td>
                                            <td className="py-3 text-right text-amber-400 tabular-nums">{ts}/12</td>
                                            <td className="py-3 text-right pr-2 font-bold text-white tabular-nums">{parseInt(c.score).toLocaleString()}</td>
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
