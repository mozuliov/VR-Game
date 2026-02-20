# VR Nexus: Silicon & Senses – Game Specification

## 0. Starting Conditions
Every company begins the simulation with the following baseline, funded entirely by the initial Seed Round:

| Parameter | Starting Value |
| :--- | :--- |
| **Starting Cash** | $500,000 |
| **Initial Fixed Assets (Gross)** | $200,000 |
| **Starting Component Level** | Level 1 (all four components) |
| **Starting Inventory** | 0 units |
| **Starting Brand Equity** | 10 points |
| **Starting Accounts Receivable** | $0 (Q1 only — see Section 6, Note on Q1) |
| **Starting Accounts Payable** | $0 (Q1 only — see Section 6, Note on Q1) |
| **Starting Debt** | $0 |

> **Seed Round**: Each company has received a $500,000 seed investment from venture capital prior to the simulation. This appears as initial **Shareholders' Equity** on the Balance Sheet.

---

## 1. Game Concept & Objective
The year is 2032. The Virtual Reality market is no longer a niche hobby for gamers—it is the new frontier of human interaction, work, and existence itself. But the landscape is fractured. Two colossal monopolies have strangled innovation for a decade: **Apex Optic**, the elite gatekeeper of unaffordable high-end immersion, and **ValueVirtua**, the purveyor of cheap, nausea-inducing casual headsets. The world is hungry for a third option—a device that balances performance, price, and soul.

You are the founder of a stealth-mode startup with a prototype that could change everything. Leading a team of brilliant engineers and ruthless strategists, you have secured a seed round to enter the "VR Nexus" arena. Your mission is simple but dangerous: design a headset that disrupts the duopoly, manage your volatile cash flow, and survive long enough to become the new market standard. Defeat the titans, outmaneuver rival startups, or bankrupt your company trying. The simulation begins now.

- **Game Duration**: 8 Quarters (2 Fiscal Years).
- **Winning Condition**: The company with the highest Weighted Score at the end of Quarter 8 wins.
- **Weighted Score Formula**: $Score = (0.4 \times \text{Total Equity}) + (0.4 \times \text{Current Market Share}) + (0.2 \times \text{Brand Equity})$

> **Note on Equity vs. Profit**: The winning metric uses **Total Equity** (Shareholders' Equity + Retained Earnings), not quarterly Net Income. This rewards sustained long-term asset building and discourages strategies that sacrifice financial health for short-term revenue spikes.

---

## 2. The Product: Headset Configuration
Every headset requires four core components. The combination of these components determines your **Unit Cost**, your **Tech Score**, and your **Product Appeal**.

| Component | Level 1 (Budget) | Level 2 (Mid-Range) | Level 3 (Premium) |
|-----------|------------------|---------------------|-------------------|
| Display | LCD ($80) | OLED ($150) | Micro-OLED ($300) |
| Optics | Fresnel ($20) | Aspheric ($60) | Pancake ($120) |
| Tracking | 3-DoF ($30) | 6-DoF Inside-out ($100) | 6-DoF + Eye Tracking ($250) |
| Processor | Mobile Lite ($50) | Standard SoC ($120) | High-Performance ($280) |

- **Assembly Cost**: A flat $50 per unit (added to component costs to determine total Unit Build Cost).
- **Research & Development (R&D)**: Upgrading a component by one level requires a one-time **R&D Upgrade Fee** of $50,000. You cannot skip levels; each upgrade must be purchased sequentially.
- **R&D Maintenance Cost**: Each quarter, a company incurs a **recurring maintenance fee of $5,000 per component level above Level 1** (e.g., two components at Level 2 and one at Level 3 = $15,000/quarter). This represents the ongoing engineering effort to sustain advanced technology.

### Tech Score
The **Tech Score** is a single numeric value representing the overall quality of a headset's components, used directly in the Market Engine formula (Section 3).

| Component Level | Tech Points Contributed |
| :--- | :--- |
| Level 1 | 1 point |
| Level 2 | 2 points |
| Level 3 | 3 points |

$$\text{Tech Score} = \sum \text{Tech Points across all four components}$$

- **Minimum Tech Score**: 4 (all Level 1)
- **Maximum Tech Score**: 12 (all Level 3)

### 2.5 Production Capacity
Production volume each quarter is physically limited by a company's **Net Fixed Assets**. To produce more headsets, players must invest in Fixed Assets (factories, assembly lines, tooling).

$$\text{Max Production Capacity (units/quarter)} = \frac{\text{Net Fixed Assets}}{100}$$

> **Example**: A company with $200,000 in Net Fixed Assets (Gross $200,000 − $0 Accumulated Depreciation) can produce a maximum of **2,000 units** that quarter. After 4 quarters of depreciation, if Net Fixed Assets fall to $100,000, capacity drops to 1,000 units.

**Key implication**: All players begin with a maximum capacity of **2,000 units/quarter**. To scale above this, Capital Expenditures (Fixed Asset purchases) are required.

### 2.6 The Lag Rule
All decisions submitted at the end of Quarter N take effect at the **start of Quarter N+1**. Nothing happens instantaneously:

- **Component Upgrades**: R&D must be paid in Quarter N; the new component level is available for production from Quarter N+1.
- **Production Volume Changes**: Units ordered for production in Q1 are available for sale in Q2.
- **Fixed Asset Purchases**: New assets become operational (and begin depreciating) in the quarter *after* purchase.
- **Financing**: Loans drawn in Quarter N are available as cash beginning Quarter N+1.

---

## 3. The Market Engine (Technician Logic)
The simulation uses a Logit Model for demand. Each company's sales are determined by their **Attractiveness Score ($A$):**

$$A = \frac{\text{Tech Score}}{\text{Price}} \times \text{Brand Equity}$$

**Market Demand Calculation:**
- **Total Market Size**: Starts at 10,000 units/quarter, growing each round by a rate set by the GM (default: **7%/quarter**; range: 0–10%). During a Market Shock event, the GM may set growth to 0% or negative.
- **Individual Share**: $\text{Company Share} = \frac{A_{\text{your company}}}{\sum A_{\text{all companies}}}$
- **Units Sold**: Company Share × Total Market Size (capped by available inventory).
- **The "Stockout" Rule**: If your demand exceeds your current inventory, those customers spill over to your competitors, starting with the next most "attractive" headset.

### 3.5 Brand Equity
Brand Equity represents the cumulative reputation and recognition of a company's headset in the market. It feeds directly into the Attractiveness Score and the final Weighted Scoring Formula.

**Accumulation**: Brand Equity increases by **1 point per $1,000 of Brand Spend** each quarter.

**Decay**: If Brand Spend in a given quarter is **less than $5,000**, Brand Equity decays by **5% of its current value** (rounded down). Spending $0 on brand results in decay but does not destroy Brand Equity entirely.

**Cap**: Brand Equity is capped at **200 points** to prevent a runaway leader from becoming unstoppable through brand alone.

> **Example**: A company with 50 Brand Equity points that spends $10,000 on Brand Marketing this quarter gains 10 points → **60 points**. A competitor with 100 points who spends nothing decays: 100 × 0.95 = **95 points**.

### 3.6 AI Competitors

Two AI-controlled companies anchor the market from the start of the game. Their behavior is scripted and predictable once learned, but they react to competitive pressure.

#### Apex Optic — "The Premium Titan"
| Attribute | Value |
| :--- | :--- |
| Starting Tech Score | 12 (all Level 3 components) |
| Starting Price | $1,800/unit |
| Starting Brand Equity | 150 points |
| Starting Market Share | ~35% of initial market |

**Behavior Rules:**
1. Apex Optic **never lowers its price** below $1,500. It competes on prestige.
2. If any player company achieves a Tech Score of **11 or 12**, Apex Optic increases its Brand Spend by $20,000 the following quarter.
3. Apex Optic does not invest in Fixed Assets during the simulation — it is assumed to already be at full capacity and represents legacy infrastructure.

#### ValueVirtua — "The Budget King"
| Attribute | Value |
| :--- | :--- |
| Starting Tech Score | 4 (all Level 1 components) |
| Starting Price | $180/unit |
| Starting Brand Equity | 60 points |
| Starting Market Share | ~30% of initial market |

**Behavior Rules:**
1. ValueVirtua **matches the lowest player price** if any player's price falls within 10% of its own. It protects the budget segment aggressively.
2. If its market share drops below 15%, ValueVirtua lowers its price by $10/unit the following quarter.
3. ValueVirtua never upgrades its components — it is permanently locked to Level 1.

> **Opening Market**: The remaining ~35% of the initial 10,000-unit market is split among all player companies based on their Attractiveness Scores at the start of Q1.

---

## 4. Financing Options

### Guardrails (Applies to All Financing)
- **The 50% Rule**: A company's **Total Debt** (Credit Line + Bank Loan) cannot exceed **50% of Total Assets** at the end of any quarter. This enforces solvency discipline.
- **Technical Default**: If a company exceeds the 50% Debt Rule or their Cash balance reaches $0, the GM places them under a **Liquidity Freeze**: Marketing and R&D spending are frozen at $0 until solvency is restored. The company may still produce and sell.

### 1. Bank Loan — Best for purchasing Fixed Assets
* **Terms**: Low interest (**6% APR / 1.5% per quarter**), fixed 8-quarter repayment schedule.
* **Interest**: Calculated on the remaining loan balance each quarter.
* **Use case**: Capital Expenditures — buying factories, tooling, and assembly equipment.

### 2. Revolving Credit Line — Best for managing Inventory Fluctuations
* **Terms**: Higher interest (**12% APR / 3% per quarter**), balance can be drawn or paid down freely each quarter.
* **Use case**: Bridging short-term cash flow gaps caused by timing differences between paying for production and collecting from sales.

---

## 5. The "Time-Machine" Engine (Technician Specs)
To support rollbacks and historical lookups, the application will use a **Versioned State System**.

**Logging**: Every round's data is saved as a unique JSON object in a history table within the database (e.g., SQLite or other DB).

- **Round_ID**: 4
- **Timestamp**: 2026-02-13...
- **State_Data**: {Full snapshot of all companies, AI, and Market stats}

**Time Travel:** Players can toggle a "Historical View" on their dashboard to see any previous month's P&L to identify where their strategy shifted.

**The Rollback (GM Only):** If a mistake is made or a "What If" scenario is requested, the GM can select a previous Round_ID. The engine will delete all subsequent entries and set the "Current State" back to that ID. **Shadow KPIs** (the deleted timeline's data) are retained in a separate log, allowing the GM to compare the "Old Timeline" vs. the "New Timeline" in the War Room briefing.

---

## 6. Advanced Financial Architecture
The simulation tracks a sophisticated accounting ledger for every company.

> **Note on Q1 Edge Cases**: In Quarter 1, there is no prior period data. Accounts Receivable (AR) and Accounts Payable (AP) both open at **$0**. Cash Collected (C1) = Current Sales × 70% only. Cash Paid for Inventory (C2) = Current Build Costs × 50% only.

### A. Detailed Balance Sheet

- **A1 — Cash**: Liquid capital for operations.
- **A2 — Accounts Receivable (AR)**: 30% of sales revenue from the previous quarter (customers on 30-day credit terms). *Q1 opening balance: $0.*
- **A3 — Prepaid Amounts**: Future component deposits or prepaid insurance premiums.
- **A4 — Inventory**: Value of unsold headsets carried at Unit Build Cost (FIFO).
- **A5 — Total Current Assets**: Sum(A1 + A2 + A3 + A4)
- **A6 — Fixed Assets (Gross)**: Historical purchase price of all equipment and property (never decreases).
- **A7 — Accumulated Depreciation**: Total depreciation charged against Fixed Assets to date (Contra-Asset — reduces book value).
- **A8 — Net Fixed Assets (Total Long-Term Assets)**: A6 − A7. This value drives Production Capacity (see Section 2.5).
- **A9 — Total Assets**: A5 + A8
- **A10 — Accounts Payable (AP)**: 50% of component costs from the current quarter are deferred and due next quarter. *Q1 opening balance: $0.*
- **A11 — Credit Line**: Flexible high-interest revolving debt (current balance drawn).
- **A12 — Total Current Liabilities**: A10 + A11
- **A13 — Bank Loan**: Fixed-term debt with scheduled principal repayments.
- **A14 — Total Long-Term Liabilities**: Value of A13
- **A15 — Total Liabilities**: A12 + A14
- **A16 — Shareholders' Equity**: Initial seed investment ($500,000) plus any subsequent capital injections.
- **A17 — Retained Earnings**: Cumulative Net Income (or loss) from all previous quarters.
- **A18 — Total Equity**: A16 + A17

> **Balance Sheet Check**: Total Assets (A9) must always equal Total Liabilities + Total Equity (A15 + A18). Any discrepancy indicates a calculation error.

### B. Profit & Loss (P&L) Statement

| Line | Item | Calculation |
| :--- | :--- | :--- |
| **B1** | **Revenue** | Units Sold × Unit Price |
| **B2** | **Cost of Goods Sold (COGS)** | Units Sold × Unit Build Cost |
| **B3** | **Gross Profit** | B1 − B2 |
| **B4** | **Operating Expenses (OpEx)** | Marketing Spend + Brand Spend |
| **B5** | **R&D Expenses** | One-time Upgrade Fees paid this quarter + Recurring Maintenance ($5,000 × number of component levels above Level 1) |
| **B6** | **Depreciation Expense** | **12.5% of Fixed Assets Gross (A6) per quarter**, capped at 80% of original asset value (a 20% salvage value is retained) |
| **B7** | **Operating Income (EBIT)** | B3 − (B4 + B5 + B6) |
| **B8** | **Interest Expense** | (Credit Line Balance × 3%) + (Bank Loan Balance × 1.5%) |
| **B9** | **Net Income** | B7 − B8 |

> **Note on Depreciation (B6)**: The 12.5% quarterly rate is intentional — it reflects the rapid obsolescence of VR hardware. Accumulated Depreciation (A7) is capped at **80% of A6** (gross value), preserving a 20% salvage value so companies are never left with zero productive assets.

### C. Cash Flow Statement

| Line | Item | Calculation |
| :--- | :--- | :--- |
| **C1** | **Cash Collected from Customers** | (Current Revenue × 70%) + (Previous Quarter AR) |
| **C2** | **Cash Paid for Inventory** | (Current Build Costs × 50%) + (Previous Quarter AP) |
| **C3** | **Cash Paid for OpEx & R&D** | Marketing Spend + Brand Spend + R&D Upgrade Fees + R&D Maintenance |
| **C4** | **Cash Paid for Interest** | Total Interest Accrued this quarter (B8) |
| **C5** | **Cash Flow from Operations (CFO)** | C1 − (C2 + C3 + C4) |
| **C6** | **Capital Expenditures (CFI)** | Cash spent purchasing Fixed Assets this quarter |
| **C7** | **Debt Activity** | New Loans/Credit Drawn − Principal Repayments |
| **C8** | **Equity Activity** | Stock Issued − Dividends Paid |
| **C9** | **Cash Flow from Financing (CFF)** | C7 + C8 |
| **C10** | **Net Change in Cash** | C5 − C6 + C9 |

> **Cash Reconciliation**: Opening Cash + Net Change in Cash (C10) = Closing Cash (A1). If these don't match, there is an error in the cash flow inputs.

---

## 7. Interface & Technical Specs

### The Dashboard for Players
The player dashboard is the primary interface for making decisions and managing the company. This dashboard shows one company's data only.
The player dashboard is accessed by entering a **unique Company ID** at the welcome screen.

* **Decision Hub**: Sliders for Price, Production Volume, Component selection, Brand Spend, and Debt management.
* **Historical Trends**: Graphical charts showing Market Share, Net Income, and Equity growth over all played quarters.
* **Competitive Intelligence**: A "Market View" showing competitors' previous quarter prices and Tech Scores (not their financials).
* **Lookups**: Players can toggle back to view any previous quarter's full financial suite (P&L, Balance Sheet, Cash Flow).

### The Interface for Game Master
The Game Master interface is protected and accessible only by entering a **secret password** at the welcome screen.

**The Game Master interface consists of the following screens:**
* **Leaderboard**: Rankings by Total Equity, Market Share, and Weighted Score.
* **Configurations**: Adjust market parameters, company attributes, and external shocks.
    * Setting up the **number of companies** the game is running for.
    * Setting the **quarterly market growth rate** (default 7%).
    * Triggering **External Shock events** (see Section 8).
* **Rollbacks (GM Only)**: The GM can revert the game to a previous quarter. The engine deletes future entries but retains "Shadow KPIs" so the GM can discuss the "Old Timeline" vs. the "New Timeline."

---

## 8. Game Master "War Room" Briefing
The transition between quarters is marked by a comprehensive market review led by the GM. This briefing is the primary educational moment of the simulation.

1. **The Leaderboard**: Rankings by Total Equity, Market Share, and current Weighted Score.

2. **Competitive Benchmarking**: A side-by-side comparison of Fixed Asset Turnover, Inventory Days, and Gross Margin.

3. **Market Shifts**: The GM introduces **External Shocks** — unexpected events that change the competitive landscape. Examples:
   - *"Quarter 3: A global chipset shortage increases Level 3 Processor costs by 20% for one quarter."*
   - *"Quarter 5: A breakthrough in OLED yields reduces Level 2 Display costs by 15% permanently."*
   - *"Quarter 6: A consumer advocacy report damages ValueVirtua's brand — their Brand Equity is halved."*

4. **The "Pivot" Discussion**: The GM highlights a company that successfully managed their Credit Line during a slump versus one that fell into a "Debt Spiral," using the Cash Flow Statements as evidence.

5. **Shadow KPI Review (Post-Rollback Only)**: If a rollback occurred, the GM presents the "Old Timeline" KPIs alongside the new results to drive a structured "What If" discussion.