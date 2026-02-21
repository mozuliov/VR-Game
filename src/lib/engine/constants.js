export const COMPONENT_COSTS = {
    display: {
        1: { name: 'LCD', cost: 80, techScore: 1 },
        2: { name: 'OLED', cost: 150, techScore: 2 },
        3: { name: 'Micro-OLED', cost: 300, techScore: 3 }
    },
    optics: {
        1: { name: 'Fresnel', cost: 20, techScore: 1 },
        2: { name: 'Aspheric', cost: 60, techScore: 2 },
        3: { name: 'Pancake', cost: 120, techScore: 3 }
    },
    tracking: {
        1: { name: '3-DoF', cost: 30, techScore: 1 },
        2: { name: '6-DoF Inside-out', cost: 100, techScore: 2 },
        3: { name: '6-DoF + Eye Tracking', cost: 250, techScore: 3 }
    },
    processor: {
        1: { name: 'Mobile Lite', cost: 50, techScore: 1 },
        2: { name: 'Standard SoC', cost: 120, techScore: 2 },
        3: { name: 'High-Performance', cost: 280, techScore: 3 }
    }
};

export const ASSEMBLY_COST = 50;
export const RD_UPGRADE_FEE = 50000;
export const RD_MAINTENANCE_FEE_PER_LEVEL = 5000;
export const BRAND_EQUITY_CAP = 200;
export const BANK_LOAN_INTEREST_RATE = 0.015; // 1.5% per quarter
export const CREDIT_LINE_INTEREST_RATE = 0.03; // 3% per quarter
export const DEPRECIATION_RATE = 0.125; // 12.5% per quarter
export const DEPRECIATION_CAP = 0.8; // Max 80%
