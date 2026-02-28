export const COMPONENT_COSTS = {
    display: {
        1: { name: 'LCD', cost: 120, techScore: 1 },
        2: { name: 'OLED', cost: 240, techScore: 2 },
        3: { name: 'Micro-OLED', cost: 480, techScore: 3 }
    },
    optics: {
        1: { name: 'Fresnel', cost: 40, techScore: 1 },
        2: { name: 'Aspheric', cost: 110, techScore: 2 },
        3: { name: 'Pancake', cost: 210, techScore: 3 }
    },
    tracking: {
        1: { name: '3-DoF', cost: 60, techScore: 1 },
        2: { name: '6-DoF Inside-out', cost: 170, techScore: 2 },
        3: { name: '6-DoF + Eye Tracking', cost: 380, techScore: 3 }
    },
    processor: {
        1: { name: 'Mobile Lite', cost: 90, techScore: 1 },
        2: { name: 'Standard SoC', cost: 200, techScore: 2 },
        3: { name: 'High-Performance', cost: 430, techScore: 3 }
    }
};

// Assembly + QA + packaging + inbound logistics per unit
export const ASSEMBLY_COST = 120;

// One-time R&D fee to upgrade a component by one level
// Realistic: small team 3-4 engineers × 6–9 months ≈ $150k
export const RD_UPGRADE_FEE = 150000;

// Recurring quarterly engineering effort to MAINTAIN each advanced component level
// ~1 senior engineer per component level above baseline = ~$50k salary / 4 quarters ≈ $15k/level/quarter
export const RD_MAINTENANCE_FEE_PER_LEVEL = 15000;

// Fixed quarterly factory & operations overhead (rent, utilities, non-R&D headcount, insurance)
// Realistic for a small hardware startup: ~$80k/quarter
export const FIXED_OVERHEAD = 80000;

export const BRAND_EQUITY_CAP = 200;
export const BANK_LOAN_INTEREST_RATE = 0.015; // 1.5% per quarter (6% APR)
export const CREDIT_LINE_INTEREST_RATE = 0.03; // 3% per quarter (12% APR)
export const DEPRECIATION_RATE = 0.125; // 12.5% per quarter
export const DEPRECIATION_CAP = 0.8;   // Max 80% accumulated depreciation
