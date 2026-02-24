import sqlite3 from 'sqlite3';
import path from 'path';

// Connect to SQLite DB
const dbPath = path.resolve(process.cwd(), 'game.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (!err) {
        db.run("PRAGMA busy_timeout = 5000");
    }
});

// Promisify for async/await usage
export const runQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

export const getQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

export const allQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Initialize the database tables
export const initDb = async () => {
    const createCompaniesTable = `
    CREATE TABLE IF NOT EXISTS companies (
        company_id TEXT PRIMARY KEY,
        name TEXT,
        is_ai BOOLEAN DEFAULT 0,
        cash REAL DEFAULT 500000,
        accounts_receivable REAL DEFAULT 0,
        prepaid_amounts REAL DEFAULT 0,
        inventory_units INTEGER DEFAULT 0,
        fixed_assets_gross REAL DEFAULT 200000,
        accumulated_depreciation REAL DEFAULT 0,
        accounts_payable REAL DEFAULT 0,
        credit_line REAL DEFAULT 0,
        bank_loan REAL DEFAULT 0,
        shareholders_equity REAL DEFAULT 500000,
        retained_earnings REAL DEFAULT 0,

        comp_display_level INTEGER DEFAULT 1,
        comp_optics_level INTEGER DEFAULT 1,
        comp_tracking_level INTEGER DEFAULT 1,
        comp_processor_level INTEGER DEFAULT 1,

        brand_equity REAL DEFAULT 10,
        is_frozen INTEGER DEFAULT 0,

        -- Player decisions for NEXT quarter (Lag Rule)
        prev_price REAL DEFAULT 0,
        prev_production_volume INTEGER DEFAULT 0,
        prev_brand_spend REAL DEFAULT 0,
        prev_capex REAL DEFAULT 0,
        prev_rd_upgrade_fees REAL DEFAULT 0,
        prev_credit_draw REAL DEFAULT 0,
        prev_credit_repay REAL DEFAULT 0,
        prev_loan_draw REAL DEFAULT 0,
        prev_loan_repay REAL DEFAULT 0,
        last_q_ledger TEXT
    );`;

    const createMarketStateTable = `
    CREATE TABLE IF NOT EXISTS market_state (
        id INTEGER PRIMARY KEY DEFAULT 1,
        current_quarter INTEGER DEFAULT 1,
        market_size INTEGER DEFAULT 10000,
        growth_rate_percent REAL DEFAULT 7.0
    );`;

    const createHistoryTable = `
    CREATE TABLE IF NOT EXISTS history_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        round_id INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        state_data TEXT NOT NULL,
        timeline_status TEXT DEFAULT 'active'
    );`;

    const createShocksTable = `
    CREATE TABLE IF NOT EXISTS shocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        applied_quarter INTEGER,
        effect_json TEXT
    );`;

    await runQuery(createCompaniesTable);
    await runQuery(createMarketStateTable);
    await runQuery(createHistoryTable);
    await runQuery(createShocksTable);
};

export default db;
