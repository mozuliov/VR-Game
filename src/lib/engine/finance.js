import { COMPONENT_COSTS, ASSEMBLY_COST, RD_MAINTENANCE_FEE_PER_LEVEL } from './constants';

export const calculateUnitBuildCost = (company) => {
    let cost = ASSEMBLY_COST;
    cost += COMPONENT_COSTS.display[company.comp_display_level].cost;
    cost += COMPONENT_COSTS.optics[company.comp_optics_level].cost;
    cost += COMPONENT_COSTS.tracking[company.comp_tracking_level].cost;
    cost += COMPONENT_COSTS.processor[company.comp_processor_level].cost;
    return cost;
};

export const calculateMaxProductionCapacity = (netFixedAssets) => {
    if (netFixedAssets <= 0) return 0;
    return Math.floor(netFixedAssets / 100);
};

export const calculateRecurringRnDFee = (company) => {
    const levelsAbove1 =
        (company.comp_display_level - 1) +
        (company.comp_optics_level - 1) +
        (company.comp_tracking_level - 1) +
        (company.comp_processor_level - 1);
    return levelsAbove1 * RD_MAINTENANCE_FEE_PER_LEVEL;
};

/**
 * Compute a full financial ledger for one company for one quarter.
 *
 * @param {object} company  - Current company state (before this quarter)
 * @param {object|null} prevLedger  - { accounts_receivable, accounts_payable } from last quarter. null = Q1.
 * @param {object} d  - Decision data for this quarter:
 *   { unitsSold, unitsProduced, price, brandSpend, marketingSpend,
 *     capEx, rdUpgradeFees, newDebt_CreditLine, newDebt_BankLoan,
 *     repayment_CreditLine, repayment_BankLoan }
 */
export const computeLedger = (company, prevLedger, d) => {
    const unitBuildCost = calculateUnitBuildCost(company);

    // ── P&L ────────────────────────────────────────────────
    const B1 = d.unitsSold * d.price;
    const B2 = d.unitsSold * unitBuildCost;
    const B3 = B1 - B2; // Gross Profit

    const B4 = (d.marketingSpend || 0) + (d.brandSpend || 0); // OpEx
    const rdMaintenance = calculateRecurringRnDFee(company);
    const B5 = (d.rdUpgradeFees || 0) + rdMaintenance; // R&D

    // Depreciation: 12.5% of Gross, accumulated capped at 80%
    const grossAssets = Number(company.fixed_assets_gross || 0) + Number(d.capEx || 0); // New gross
    const maxAccum = grossAssets * 0.80; // cap based on new gross
    const remaining = Math.max(0, maxAccum - Number(company.accumulated_depreciation || 0));
    const potential = Number(company.fixed_assets_gross || 0) * 0.125; // Depreciate old base
    const B6 = Math.min(potential, remaining); // Depreciation

    const B7 = B3 - (B4 + B5 + B6); // EBIT

    // Debt balances after this quarter's activity
    let newCreditLine = Math.max(0, (company.credit_line || 0) + (d.newDebt_CreditLine || 0) - (d.repayment_CreditLine || 0));
    let newBankLoan = Math.max(0, (company.bank_loan || 0) + (d.newDebt_BankLoan || 0) - (d.repayment_BankLoan || 0));

    const B8 = (newCreditLine * 0.03) + (newBankLoan * 0.015); // Interest
    const B9 = B7 - B8; // Net Income

    // ── CASH FLOW ──────────────────────────────────────────
    const C1 = (B1 * 0.70) + (prevLedger?.accounts_receivable || 0);
    const totalBuildCost = d.unitsProduced * unitBuildCost;
    const C2 = (totalBuildCost * 0.50) + (prevLedger?.accounts_payable || 0);
    const C3 = B4 + B5;
    const C4 = B8;
    const C5 = C1 - (C2 + C3 + C4); // CFO

    const C6 = d.capEx || 0; // CFI
    const C7 = ((d.newDebt_CreditLine || 0) + (d.newDebt_BankLoan || 0)) -
        ((d.repayment_CreditLine || 0) + (d.repayment_BankLoan || 0));
    const C8 = 0;
    const C9 = C7 + C8; // CFF
    const C10 = C5 - C6 + C9; // Net Change in Cash

    // ── BALANCE SHEET ──────────────────────────────────────
    const A1 = (company.cash || 0) + C10;
    const A2 = B1 * 0.30;       // AR = 30% of this quarter's revenue
    const A3 = 0;
    const newInventoryUnits = Math.max(0, (company.inventory_units || 0) + d.unitsProduced - d.unitsSold);
    const A4 = newInventoryUnits * unitBuildCost;
    const A5 = A1 + A2 + A3 + A4;

    const A6 = Number(company.fixed_assets_gross || 0) + Number(d.capEx || 0);
    const A7 = Number(company.accumulated_depreciation || 0) + B6;
    const A8 = A6 - A7;
    const A9 = A5 + A8;

    const A10 = totalBuildCost * 0.50; // AP = 50% of current build cost
    const A11 = newCreditLine;
    const A12 = A10 + A11;
    const A13 = newBankLoan;
    const A14 = A13;
    const A15 = A12 + A14;

    const A16 = company.shareholders_equity || 500000;
    const A17 = (company.retained_earnings || 0) + B9;
    const A18 = A16 + A17;

    // Guardrails
    const debtRatio = A9 > 0 ? (A15 / A9) : 1;
    const isLiquidityFreeze = A1 <= 0 || debtRatio > 0.50;

    return {
        P_L: { B1, B2, B3, B4, B5, B6, B7, B8, B9 },
        CFO: { C1, C2, C3, C4, C5, C6, C7, C8, C9, C10 },
        BS: {
            A1, A2, A3, A4, A5,
            A6, A7, A8, A9,
            A10, A11, A12, A13, A14, A15,
            A16, A17, A18,
        },
        inventory_units: newInventoryUnits,
        unitBuildCost,
        isLiquidityFreeze,
    };
};
