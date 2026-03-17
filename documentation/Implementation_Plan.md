# Implementation Plan: VR Nexus

This plan translates `Game Concept.md` into actionable development phases for the Replit environment.

---

## Phase 1: Authentication & Access Control
- **Player Dashboard**: Show a welcome screen with a **Company ID** input. Each input uniquely loads one company's isolated data view. Players must not see other companies' financials.
- **GM Interface**: Show a separate **secret password** field on the welcome screen to unlock the GM panel. Session-protect all GM routes.
- **State Management**: Persist session state securely across page reloads.

---

## Phase 2: Database Schema & Data Models

### 2.1 Starting Conditions
Initialize each company record with the following seed values when the GM creates a new game:

| Parameter | Value |
| :--- | :--- |
| Starting Cash (A1) | $500,000 |
| Fixed Assets Gross (A6) | $200,000 |
| All Component Levels | Level 1 |
| Inventory | 0 units |
| Brand Equity | 10 points |
| AR, AP, Debt | $0 |
| Shareholders' Equity (A16) | $500,000 |

### 2.2 Financial Line Item Schema
Map all financial output columns to the standardized reference codes:
- **Balance Sheet**: `A1` (Cash) through `A18` (Total Equity). Note: `A8` is now **Net Fixed Assets** = A6 − A7, and it drives Production Capacity (see Phase 3.2).
- **Profit & Loss**: `B1` (Revenue) through `B9` (Net Income).
- **Cash Flow Statement**: `C1` (Cash Collected) through `C10` (Net Change in Cash).

### 2.3 Key Formula Updates
Implement the following formulas precisely:
- **B5 – R&D Expenses**: One-time Upgrade Fee (if any) + Recurring Maintenance Fee (`$5,000 × total component levels above Level 1` per quarter).
- **B6 – Depreciation**: `12.5% × A6 (Gross)` per quarter, with Accumulated Depreciation (A7) capped at `80% of A6`. Preserve a 20% salvage value — do not depreciate past this floor.
- **B8 – Interest Expense**: `(Credit Line Balance × 3%) + (Bank Loan Balance × 1.5%)` per quarter.
- **Scoring Formula**: $Score = (0.4 \times \text{Total Equity A18}) + (0.4 \times \text{Current Market Share}) + (0.2 \times \text{Brand Equity})$

### 2.4 Q1 Edge Case Handling
In Quarter 1, no prior-period data exists. Enforce these overrides:
- AR (A2) opens at $0 → `C1 = Current Revenue × 70%` only (no prior AR to collect).
- AP (A10) opens at $0 → `C2 = Current Build Costs × 50%` only (no prior AP to pay).

### 2.5 Game State Versioning ("Time Machine")
- Every end-of-quarter cycle saves a full JSON snapshot (`Round_ID`, `Timestamp`, `State_Data`) to a SQLite history table.
- **Rollback**: When the GM rolls back to a prior `Round_ID`, flag all subsequent records as `timeline: "shadow"` rather than hard-deleting them. These **Shadow KPIs** are surfaced in the War Room briefing view (see Phase 5).

---

## Phase 3: Core Game Engine

### 3.1 Tech Score Engine
Calculate a **Tech Score** for each company every quarter:
- Each component level contributes its level number as points (Level 1 → 1 pt, Level 2 → 2 pts, Level 3 → 3 pts).
- `Tech Score = sum of points across all four components` (range: 4–12).

### 3.2 Production Capacity Engine
- `Max Production Capacity (units/quarter) = Net Fixed Assets (A8) ÷ 100`
- All companies begin at **2,000 units/quarter** (from $200,000 starting Net Fixed Assets).
- Capacity decreases as accumulated depreciation erodes A8; players must buy Fixed Assets (CapEx) to scale up.
- Production Volume submitted by the player is hard-capped at `Max Production Capacity`.

### 3.3 The Lag Rule
All decisions submitted at end-of-quarter N take effect at the **start of Quarter N+1**. Enforce this delay for:
- **Component upgrades**: R&D fee deducted in Q_N; new component level active from Q_{N+1}.
- **Production Volume**: Units built in Q_N enter inventory at start of Q_{N+1}.
- **Fixed Asset purchases**: CapEx paid in Q_N; asset becomes operational and begins depreciating in Q_{N+1}.
- **Financing draws**: Loan cash available from Q_{N+1}.

### 3.4 Market Engine (Logit Model)
$$A = \frac{\text{Tech Score}}{\text{Price}} \times \text{Brand Equity}$$
- `Company Share = A_company ÷ Σ A_all_companies`
- `Units Sold = Company Share × Total Market Size` (capped by available inventory).
- **Stockout Rule**: Unfilled demand spills to the next most attractive competitor.
- **Market Growth**: GM-configurable quarterly rate (default 7%, range 0–10%). Can be set negative during a Shock.

### 3.5 Brand Equity Engine
- **Gain**: +1 point per $1,000 of Brand Spend.
- **Decay**: If Brand Spend < $5,000 in a quarter, apply a 5% decay on the current balance (rounded down).
- **Cap**: Hard ceiling of 200 points.

### 3.6 AI Competitor Behavior
Both AI companies are initialized at game start and their state is updated by the engine each quarter.

**Apex Optic — "The Premium Titan"**
- Starting: Tech Score 12, Price $1,800, Brand Equity 150, ~35% market share.
- Never prices below $1,500.
- If any player achieves Tech Score ≥ 11, Apex Optic adds $20,000 to Brand Spend the following quarter.
- Never purchases Fixed Assets (capacity is fixed).

**ValueVirtua — "The Budget King"**
- Starting: Tech Score 4, Price $500, Brand Equity 60, ~30% market share.
- Matches the lowest player price if any player price is within 10% of ValueVirtua's own.
- If market share drops below 15%, reduces price by $10/unit the next quarter.
- Never upgrades components (permanently Level 1).

### 3.7 Financing Guardrails
Enforce after each quarter's calculations:
- **50% Rule**: `Total Debt (A11 + A13) ≤ 50% of Total Assets (A9)`. Reject any draw that would breach this.
- **Liquidity Freeze ("Technical Default")**: If Cash (A1) reaches $0 or the 50% rule is breached, freeze Marketing and R&D spending at $0 for the following quarter. Company may still produce and sell.

---

## Phase 4: Player Dashboard

Implement the four UI sections:

1. **Decision Hub** — Input widgets submitted at end of each quarter:
   - Sliders/inputs for: **Price**, **Production Volume**, **Brand Spend**.
   - Component upgrade selectors (Display, Optics, Tracking, Processor) with R&D fee displayed.
   - Financing controls: draw/repay Credit Line, request Bank Loan, enter CapEx amount.

2. **Historical Trends** — Charts over all played quarters:
   - Market Share, Net Income (B9), and Total Equity (A18).

3. **Competitive Intelligence** — "Market View" panel showing per competitor (including AIs):
   - Previous quarter Price and Tech Score only. **Financials are hidden.**

4. **Financial Lookups** — Toggleable historical ledger:
   - Full P&L, Balance Sheet, and Cash Flow Statement for any prior quarter.

---

## Phase 5: Game Master (GM) Interface

### 5.1 Leaderboard
- Real-time rankings by Total Equity (A18), Market Share, and calculated **Weighted Score**.

### 5.2 Configurations Panel
- **Number of Companies**: Set before game starts.
- **Market Growth Rate**: Set the quarterly % growth (default 7%).
- **External Shock Events**: Trigger shock events that modify component costs, Brand Equity, or market size for one or more quarters. Document examples from the spec:
  - Chipset shortage: Level 3 Processor cost +20% for 1 quarter.
  - OLED breakthrough: Level 2 Display cost −15% permanently.
  - Brand damage: ValueVirtua Brand Equity halved.

### 5.3 Rollback & Shadow KPI Controls
- Dropdown to select a prior `Round_ID`.
- On rollback: records after the selected round are flagged `shadow`; the engine resets to the chosen state.
- **Shadow KPI comparison view**: Side-by-side display of Old Timeline vs. New Timeline KPIs for the War Room.

---

## Phase 6: War Room Briefing View

Build a read-only GM-facing end-of-quarter briefing screen with:
1. **Leaderboard**: Total Equity, Market Share, Weighted Score rankings.
2. **Competitive Benchmarking**: Fixed Asset Turnover, Inventory Days, Gross Margin per company.
3. **External Shock Log**: Display which shocks are active or queued.
4. **Pivot Case Highlight**: Flag companies in/near Liquidity Freeze vs. those with healthy CFO.
5. **Shadow KPI Review**: Appears only after a rollback — Old vs. New timeline comparison table.
