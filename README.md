# 🎮 VR Nexus: Silicon & Senses
### *A High-Fidelity Corporate Strategy Simulation*

**VR Nexus** is a competitive business simulation, where players act as the executive board of a VR hardware startup. Over the course of **8 Quarters (2 Fiscal Years)**, teams must navigate the complexities of hardware R&D, manufacturing logistics, and aggressive corporate finance to dominate the market.

---

## 🚀 Game Objective
Maximize the **Company Valuation** by the end of Quarter 8. Success is measured by a weighted score of:
* **40% Cumulative Equity** (Retained Earnings + Initial Capital)
* **40% Market Share** (Current sales volume vs. competitors)
* **20% Brand Equity** (Accumulated marketing and product quality)

---

## 🛠 Features

### 1. Advanced Financial Engine
The simulation runs on a professional-grade accounting core that generates three interconnected reports every quarter:
* **Profit & Loss (P&L):** Tracks Revenue, COGS, OpEx, and **12.5% Quarterly Depreciation**.
* **Balance Sheet:** Real-time tracking of Assets (Cash, AR, Inventory, Fixed Assets), Liabilities (AP, Credit Line, Loans), and Equity.
* **Cash Flow Statement:** Reconciles Net Income to actual cash on hand, accounting for inventory fluctuations and debt service.



### 2. Strategic Hardware Configuration
Players build their product by selecting components across four categories: **Display, Optics, Tracking, and Processor**. Each level increases the "Attractiveness" of the device but raises the Bill of Materials (BOM) and requires R&D investment.

### 3. Market Dynamics & AI
* **Logit Demand Model:** Customer choices are driven by a Price-to-Performance ratio.
* **The "Lag" Factor:** Decisions made in Q1 impact the inventory and tech available in Q2.
* **AI Titans:** Compete against **Apex Optic** (Premium Leader) and **ValueVirtua** (Budget King).

### 4. The "Time Machine" Database
* **Versioned State System:** Every quarter's data is saved as a unique JSON snapshot in SQLite.
* **Rollback Capability:** The Game Master can revert the entire simulation to a previous quarter to explore "What If" scenarios.
* **Persistence:** Historical KPI trends remain accessible even after a timeline rollback.

---

## 📐 Operational Rules

### Financing & Debt Guardrails
* **Bank Loan:** 6% APR, fixed 8-quarter repayment. Best for Factory (Fixed Asset) expansion.
* **Revolving Credit Line:** 12% APR, flexible draw/repayment. Best for managing inventory gaps.
* **The 50% Rule:** Total Debt cannot exceed 50% of Total Assets.
* **Technical Default:** If a company exceeds the debt limit or runs out of cash, Marketing and R&D spending are frozen by the GM until solvency is restored.

### Production Capacity
Production is limited by **Net Fixed Assets**. To produce more headsets, players must invest in Fixed Assets, which subsequently increases quarterly depreciation expenses.

---

## 📋 The Game Loop
1. **Analysis:** Players review previous P&L, Cash Flow, and Balance Sheets.
2. **Decision:** Teams submit Price, Production Volume, Component Levels, and Financing moves.
3. **Execution:** The GM triggers the engine, calculating market share and updating the ledger.
4. **Briefing:** The GM leads a "War Room" session, analyzing the **Efficiency Frontier** (Price vs. Tech) and market shifts.

---

## 💻 Technical Stack
* **Language:** Python 3.x
* **Logic:** Custom classes for `MarketEngine` and `FinancialStatements`.
* **Database:** SQLite (JSON versioning)
* **Interface:** Designed for Replit (Web-based Dashboards)

---

## 🚦 Getting Started
1. **Fork** this repository to your Replit account.
2. Ensure `requirements.txt` dependencies are installed.
3. Run `main.py` to initialize the Game Master dashboard.
4. Create company IDs for each player group.

---
*Developed for strategic thinkers and future tech moguls.*
