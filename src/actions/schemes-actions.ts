'use server'

export interface Campaign {
    id: string;
    name: string;
    type: string;
    start: string;
    end: string;
    participants: number;
    status: string;
}

export interface Sku {
    skuCode: string;
    brand: string;
    model: string;
    description: string;
    mrp: string;
    points: string;
    totalPoints: string;
}

export interface ProductHierarchy {
    [key: string]: {
        name: string;
        subcategories: {
            [key: string]: {
                name: string;
                skus: { [key: string]: string }
            }
        }
    }
}

const activeCampaigns = [
    { id: '#CMP-001', name: 'Monsoon Fan Special', type: 'Booster', start: '2023-06-01', end: '2023-06-30', participants: 342, status: 'Active' },
    { id: '#CMP-002', name: 'Summer LED Campaign', type: 'Slab Based', start: '2023-05-15', end: '2023-07-15', participants: 278, status: 'Active' },
    { id: '#CMP-003', name: 'Festive Lighting Sale', type: 'Cross-Sell', start: '2023-06-10', end: '2023-08-10', participants: 156, status: 'Active' },
    { id: '#CMP-004', name: 'New Electrician Onboarding', type: 'Booster', start: '2023-06-01', end: '2023-07-31', participants: 89, status: 'Active' },
    { id: '#CMP-005', name: 'Switch & Socket Special', type: 'Slab Based', start: '2023-06-05', end: '2023-07-05', participants: 234, status: 'Active' },
];

const skuData = [
    { skuCode: 'STL-FAN-001', brand: 'STURLITE', model: 'CEILING FAN 1200MM', description: 'CEILING FAN WITH REMOTE', mrp: '2899', points: '57.98', totalPoints: '60' },
    { skuCode: 'STL-FAN-002', brand: 'STURLITE', model: 'CEILING FAN 1400MM', description: 'CEILING FAN WITH REMOTE', mrp: '3299', points: '65.98', totalPoints: '70' },
    { skuCode: 'STL-LGT-001', brand: 'STURLITE', model: 'LED BULB 9W', description: 'LED BULB COOL WHITE', mrp: '199', points: '3.98', totalPoints: '5' },
    { skuCode: 'STL-LGT-002', brand: 'STURLITE', model: 'LED BULB 12W', description: 'LED BULB WARM WHITE', mrp: '249', points: '4.98', totalPoints: '5' },
    { skuCode: 'STL-SWT-001', brand: 'STURLITE', model: 'SWITCH 2 MODULE', description: 'MODULAR SWITCH 2 MODULE', mrp: '399', points: '7.98', totalPoints: '10' },
    { skuCode: 'STL-SWT-002', brand: 'STURLITE', model: 'SWITCH 4 MODULE', description: 'MODULAR SWITCH 4 MODULE', mrp: '599', points: '11.98', totalPoints: '15' },
    { skuCode: 'STL-MCB-001', brand: 'STURLITE', model: 'MCB 16A', description: 'MINIATURE CIRCUIT BREAKER', mrp: '299', points: '5.98', totalPoints: '10' },
    { skuCode: 'STL-MCB-002', brand: 'STURLITE', model: 'MCB 32A', description: 'MINIATURE CIRCUIT BREAKER', mrp: '399', points: '7.98', totalPoints: '10' },
    { skuCode: 'STL-WIR-001', brand: 'STURLITE', model: 'WIRE 1.5SQMM', description: 'COPPER WIRE 90MTRS', mrp: '1899', points: '37.98', totalPoints: '40' },
    { skuCode: 'STL-WIR-002', brand: 'STURLITE', model: 'WIRE 2.5SQMM', description: 'COPPER WIRE 90MTRS', mrp: '2899', points: '57.98', totalPoints: '60' },
];

const productHierarchy = {
    fans: {
        name: "Fans",
        subcategories: {
            "ceiling-fans": {
                name: "Ceiling Fans",
                skus: {
                    "STL-FAN-001": "STL-FAN-001 - STURLITE CEILING FAN 1200MM",
                    "STL-FAN-002": "STL-FAN-002 - STURLITE CEILING FAN 1400MM"
                }
            },
            "table-fans": {
                name: "Table Fans",
                skus: {}
            },
            "pedestal-fans": {
                name: "Pedestal Fans",
                skus: {}
            }
        }
    },
    lighting: {
        name: "Lighting",
        subcategories: {
            "led-bulbs": {
                name: "LED Bulbs",
                skus: {
                    "STL-LGT-001": "STL-LGT-001 - STURLITE LED BULB 9W",
                    "STL-LGT-002": "STL-LGT-002 - STURLITE LED BULB 12W"
                }
            },
            "led-tubes": {
                name: "LED Tubes",
                skus: {}
            }
        }
    },
    switches: {
        name: "Switches",
        subcategories: {
            "modular-switches": {
                name: "Modular Switches",
                skus: {
                    "STL-SWT-001": "STL-SWT-001 - STURLITE SWITCH 2 MODULE",
                    "STL-SWT-002": "STL-SWT-002 - STURLITE SWITCH 4 MODULE"
                }
            }
        }
    },
    wires: {
        name: "Wires",
        subcategories: {
            "copper-wires": {
                name: "Copper Wires",
                skus: {
                    "STL-WIR-001": "STL-WIR-001 - STURLITE WIRE 1.5SQMM",
                    "STL-WIR-002": "STL-WIR-002 - STURLITE WIRE 2.5SQMM"
                }
            }
        }
    },
    mcbs: {
        name: "MCBs",
        subcategories: {
            "miniature-breakers": {
                name: "Miniature Circuit Breakers",
                skus: {
                    "STL-MCB-001": "STL-MCB-001 - STURLITE MCB 16A",
                    "STL-MCB-002": "STL-MCB-002 - STURLITE MCB 32A"
                }
            }
        }
    }
};

export async function getSchemesDataAction() {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
        activeCampaigns,
        skuData,
        productHierarchy
    };
}
