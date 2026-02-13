# VR Nexus: Silicon & Senses – Game Specification
## 1. Game Concept & Objective
**VR Nexus** is a multi-round strategic simulation where players act as CEOs of VR hardware startups. You compete against other human teams and two AI-driven titans: **Apex Optic** (The Premium Leader) and **ValueVirtua** (The Budget King).
- **Winning Condition**: The company with the highest Weighted Score at the end of the final round wins.
- **Weighted Score Formula**: $Score = (0.4 \times \text{Cumulative Profit}) + (0.4 \times \text{Current Market Share}) + (0.2 \times \text{Brand Equity})$.

## 2. The Product: Headset Configuration
Every headset requires four core components. The combination of these components determines your **Unit Cost** and your **Product Appeal**.

| Component | Level 1 (Budget) | Level 2 (Mid-Range) | Level 3 (Premium) |
|-----------|------------------|---------------------|-------------------|
| Display | LCD ($80) | OLED ($150) | Micro-OLED ($300) |
| Optics | Fresnel ($20) | Aspheric ($60) | Pancake ($120) |
| Tracking | 3-DoF ($30) | 6-DoF Inside-out ($100) | 6-DoF + Eye Tracking ($250) |
| Processor | Mobile Lite ($50) | Standard SoC ($120) | High-Performance ($280) |

- **Assembly Cost**: A flat $50 per unit.
- **Research & Development (R&D)**: Upgrading a component level requires a one-time "R&D Fee" of $50,000 per level.

## 3. The Market Engine (Technician Logic)
The simulation uses a Logit Model for demand. Each company’s sales are determined by their **Attractiveness Score ($A$):**
$$A = \frac{\text{Tech Specs}}{\text{Price}} \times \text{Brand Marketing}$$
**Market Demand Calculation:**
- **Total Market Size**: Starts at 10,000 units/month, growing by 5-10% each round.
- **Individual Share**: $\text{Company Share} = \frac{A_{your\_company}}{\sum A_{all\_companies}}$
- **The "Stockout" Rule**: If your demand exceeds your current inventory, those customers go to your competitors (spillover), starting with the next most "attractive" headset.

## 4. Financing Options
1. **Bank Loan**: Best for purchasing Fixed Assets.

* Terms: Low interest (e.g., 6% APR), fixed 8-quarter repayment schedule.

2. **Revolving Credit Line**: Best for managing Inventory Fluctuations.

* Terms: Higher interest (e.g., 12% APR), balance can be paid down or drawn at will based on cash flow needs.

## 5. The "Time-Machine" Engine (Technician Specs)
To support rollbacks and historical lookups, the application will use a **Versioned State System**.

**Logging**: Every round's data is saved as a unique JSON object in a history table within the database (e.g., SQLite or other DB).

- **Round_ID**: 4
- **Timestamp**: 2026-02-13...
- **State_Data**: {Full snapshot of all companies, AI, and Market stats}

**Time Travel:** Players can toggle a "Historical View" on their dashboard to see any previous month’s P&L to identify where their strategy shifted.

**The Rollback (GM Only):** If a mistake is made or a "What If" scenario is requested, the GM can select a previous Round_ID. The engine will delete all subsequent entries and set the "Current State" back to that ID.

## 6. Advanced Financial Architecture
The simulation tracks a sophisticated accounting ledger for every company.

### A. Detailed Balance Sheet

**Category** | **Line Items**
--- | ---
**Assets** | **Cash**: Liquid capital for operations.
| **Accounts Receivable (AR)**: 30% of sales from the previous quarter (collected this quarter).
| **Prepaid Amounts**: Future component deposits or insurance.
| **Inventory**: Value of unsold headsets at cost.
| **Fixed Assets**: Gross Historical Value minus Accumulated Depreciation.
**Liabilities** | **Accounts Payable (AP)**: 50% of component costs (due next quarter).
| **Credit Line**: Flexible high-interest revolving debt.
| **Bank Loan**: Fixed-term debt with scheduled principal repayments.
**Equity** | **Shareholders' Equity**: Initial investment + any capital injections.
| **Retained Earnings**: Cumulative net income/loss from all previous quarters.

### B. Profit & Loss (P&L) Statement

**Revenue**: (Units Sold × Unit Price)

**Cost of Goods Sold (COGS)**: (Units Sold × Unit Build Cost)

**Gross Profit**: Revenue - COGS

**Operating Expenses (OpEx)**: * Marketing & Brand Spend

**R&D Maintenance/Upgrades**

**Depreciation Expense**: 12.5% of Fixed Assets (Straight-line).

**Operating Income (EBIT)**: Gross Profit - OpEx

**Interest Expense**: (Credit Line Balance × Rate) + (Bank Loan Balance × Rate)

**Net Income**: EBIT - Interest Expense

### C. Cash Flow Statement

**Cash Flow from Operations (CFO)**:
*   **Cash Collected from Customers**: (Current Sales × 70%) + (Previous AR)
*   **Cash Paid for Inventory/Suppliers**: (Current Build Costs × 50%) + (Previous AP)
*   **Cash Paid for OpEx**: (Marketing Spend + R&D Upgrade Fees)
*   **Cash Paid for Interest**: (Total Interest Accrued)

**Cash Flow from Investing (CFI)**:
*   **Capital Expenditures**: (Cash spent purchasing Fixed Assets)

**Cash Flow from Financing (CFF)**:
*   **Debt Activity**: (New Loans Taken - Principal Repayments)
*   **Equity Activity**: (Stock Issued - Dividends Paid)

## 7. Game Master "War Room" Briefing
The transition between quarters is marked by a comprehensive market review led by the GM.

1. The Leaderboard: Rankings by Total Equity and Market Share.

2. Competitive Benchmarking: A side-by-side comparison of Fixed Asset Turnover and Inventory Days.

3. Market Shifts: The GM introduces "External Shocks" (e.g., "Quarter 5: A breakthrough in OLED yields reduces Level 2 Display costs by 15%").

4. The "Pivot" Discussion: The GM highlights a company that successfully managed their Credit Line during a slump versus one that fell into a "Debt Spiral."