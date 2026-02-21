import { COMPONENT_COSTS } from './constants';

export const calculateTechScore = (company) => {
    let score = 0;
    score += COMPONENT_COSTS.display[company.comp_display_level].techScore;
    score += COMPONENT_COSTS.optics[company.comp_optics_level].techScore;
    score += COMPONENT_COSTS.tracking[company.comp_tracking_level].techScore;
    score += COMPONENT_COSTS.processor[company.comp_processor_level].techScore;
    return score;
};

export const calculateAttractiveness = (techScore, price, brandEquity) => {
    // If price is 0 (someone messed up), return 0 to prevent division by zero
    if (price <= 0) return 0;
    return (techScore / price) * brandEquity;
};

export const applyBrandEquityChanges = (company, brandSpend) => {
    let newBrandEquity = company.brand_equity;

    // Brand gain
    const pointsGained = Math.floor(brandSpend / 1000);
    newBrandEquity += pointsGained;

    // Brand decay
    if (brandSpend < 5000) {
        const decay = Math.floor(newBrandEquity * 0.05);
        newBrandEquity -= decay;
    }

    // Cap at 200
    if (newBrandEquity > 200) {
        newBrandEquity = 200;
    }
    // Prevent negative brand equity
    if (newBrandEquity < 0) {
        newBrandEquity = 0;
    }

    return newBrandEquity;
};

export const allocateSales = (companies, totalMarketSize) => {
    let remainingMarket = totalMarketSize;
    let unsatisfiedDemand = 0;

    // 1. Calculate Attractiveness for each company
    const activeCompanies = companies.filter(c => c.prev_price > 0);

    // Sort companies by Attractiveness descending (for the stockout rule)
    activeCompanies.sort((a, b) => b.attractiveness - a.attractiveness);

    // Initial logit allocation
    let totalAttractiveness = activeCompanies.reduce((sum, c) => sum + c.attractiveness, 0);

    for (const company of activeCompanies) {
        const share = totalAttractiveness > 0 ? (company.attractiveness / totalAttractiveness) : 0;
        let demand = Math.round(share * totalMarketSize);
        company.initial_demand = demand;
        company.actual_sales = 0;
    }

    // Process sales & stockouts
    for (const company of activeCompanies) {
        let demandToFulfill = company.initial_demand + unsatisfiedDemand;

        let availableInventory = company.inventory_units;
        // We add units built in prev quarter to current inventory in finance.js prior to this step

        if (demandToFulfill <= availableInventory) {
            // Can fulfill all
            company.actual_sales = demandToFulfill;
            unsatisfiedDemand = 0;
        } else {
            // Stockout
            company.actual_sales = availableInventory;
            unsatisfiedDemand = demandToFulfill - availableInventory;
        }
    }

    return activeCompanies;
};
