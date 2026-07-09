import { EstimateInputs } from './types';

// Floors factors
export const FLOORS_FACTORS = [
  { max: 5,   factor: 1.0, label: "≤ 5 floors" },
  { max: 10,  factor: 1.0, label: "6–10 floors" },
  { max: 20,  factor: 1.3, label: "11–20 floors" },
  { max: 50,  factor: 1.7, label: "21–50 floors" },
  { max: Infinity, factor: 2.5, label: "51+ floors" },
];

// Area factors
export const AREA_FACTORS = [
  { max: 4000,     factor: 1.0, label: "0 – 4,000 m²" },
  { max: 10000,    factor: 1.2, label: "4,001 – 10,000 m²" },
  { max: 18000,    factor: 1.4, label: "10,001 – 18,000 m²" },
  { max: Infinity, factor: 1.6, label: "18,001+ m²" },
];

// Complexity base level
export const COMPLEXITY_BASE = [
  { id: "level1", label: "Straight, vertical, easy access", factor: 1.0, level: 1 },
  { id: "level2", label: "Has balconies or minor obstacles", factor: 1.3, level: 2 },
  { id: "level3", label: "Requires diagonal movement or is mostly glass", factor: 1.7, level: 3 },
  { id: "level4", label: "Has overhangs, no anchors or difficult access", factor: 2.65, level: 4 },
];

// Complexity adjustments
export const COMPLEXITY_ADJ = [
  { id: "glass", label: "Glass (predominantly glass)", factor: 0.2 },
  { id: "gutter", label: "Complex Gutter", factor: 0.2 },
  { id: "diagonal", label: "Diagonal", factor: 0.4 },
  { id: "overhang", label: "Overhang", factor: 0.4 },
  { id: "noanchors", label: "No anchors", factor: 0.6 },
  { id: "wind", label: "Wind Loading", factor: 0.8 },
];

// Drone restriction zones
export const ZONE_FACTORS = [
  { id: "none", label: "No restriction", factor: 1.0 },
  { id: "controlled", label: "Controlled", factor: 1.2 },
  { id: "restricted", label: "Restricted", factor: 1.5 },
];

// Location and travel parameters
export const LOCATION_ZONES = [
  { id: "nsw", label: "NSW (Local)", zoneFactor: 1.0, flight: 0, accom: 0, allowance: 0 },
  { id: "regional", label: "Regional (QLD / ACT / SA)", zoneFactor: 1.2, flight: 350, accom: 200, allowance: 60 },
  { id: "remote", label: "Remote (WA / NT / TAS)", zoneFactor: 1.5, flight: 700, accom: 250, allowance: 90 },
];

// Drone pilot rates
export const DRONE_PILOT_RATES = {
  internal: 300,
  external: 700,
};

// Execution / Labor rates
export const EXEC_RATES = {
  teamLeader: 600,   // $/day
  teamWorker: 500,   // $/day
  reportHrRate: 70,  // $/hr
  reportHrsDay: 8,   // hrs/day
  tagging3dHr: 50,   // $/hr
  tagging3dHrsDay: 8, // hrs/day
};

// Fixed prelims details (for transparent show or override in calculations)
export const PRELIM_DETAILS_A = [
  { label: "Planning Drone flight", cost: 50.00 },
  { label: "Back up - drone footage", cost: 25.00 },
  { label: "Modelling time (Polycam)", cost: 50.00 },
  { label: "FCRS + anchor on-site planning", cost: 1040.00 },
  { label: "App design (Glide)", cost: 520.00 },
  { label: "Design Linktree pages", cost: 1200.00 },
  { label: "NFC tags (400 units x $0.50)", cost: 200.00 },
  { label: "Installation pack NFC (400 x $0.10)", cost: 40.00 },
  { label: "Spread Sheet - Report", cost: 500.00 },
  { label: "Deliverables (prints, binding)", cost: 50.00 },
];

export const PRELIM_DETAILS_B = [
  { label: "Drone depreciation (1% of $9,500)", cost: 95.00 },
  { label: "Polycam subscription (monthly x 0.25)", cost: 100.00 },
  { label: "Glide subscription (monthly x 0.25)", cost: 45.00 },
  { label: "Linktree subscription (monthly x 0.25)", cost: 5.75 },
  { label: "Kuula subscription (monthly x 0.25)", cost: 6.00 },
  { label: "AI System optimisation", cost: 100.00 },
  { label: "AIMMS Platform (ProSoftHub dev cost)", cost: 1000.00 },
  { label: "Meeting on-site (2 hrs x $70)", cost: 140.00 },
  { label: "Marketing Content", cost: 12.50 },
  { label: "Electricity", cost: 12.50 },
  { label: "Internet", cost: 8.75 },
  { label: "Office Rent", cost: 100.00 },
];

export const PRELIM_SUBTOTAL_A = 3675.00;
export const PRELIM_CONTINGENCY_A = 367.50; // 10%
export const PRELIM_TOTAL_A = 4042.50;
export const PRELIM_TOTAL_B = 1625.50;
export const PRELIMINARIES_COST = 5668.00; // Total Section A ($4042.50) + Section B ($1625.50)

// Category rules based on total complexity factor
export const CATEGORY_RULES = [
  { maxFactor: 3, category: "C" as const, multiplier: 1.0, color: "text-emerald-600 bg-emerald-50 border-emerald-200", label: "C (Simple)" },
  { maxFactor: 6, category: "B" as const, multiplier: 1.15, color: "text-amber-600 bg-amber-50 border-amber-200", label: "B (Medium)" },
  { maxFactor: Infinity, category: "A" as const, multiplier: 1.3, color: "text-rose-600 bg-rose-50 border-rose-200", label: "A (Highly Complex)" },
];

// Default project input values
export const DEFAULT_INPUTS: EstimateInputs = {
  projectInfo: {
    name: "",
    address: "",
    state: "NSW",
  },
  geometry: {
    numFloors: 10,
    buildingHeight: 30,
    buildingPerimeter: 120,
    useSegments: false,
    segments: [
      { id: "seg-1", perimeter: 40, height: 30, area: 1200 },
      { id: "seg-2", perimeter: 40, height: 30, area: 1200 },
    ],
    directFacadeArea: 3600,
  },
  complexity: {
    baseLevelId: "level1",
    customLevel4Factor: 2.65,
    adjustments: [],
    droneRestrictionId: "none",
    locationId: "nsw",
  },
  execution: {
    inspectionDays: 5,
    teamSize: 2,
    nfcDays: 2,
    tagging3dDays: 2,
    reportDays: 3,
    dronePilotType: "internal",
  },
  travel: {
    executionType: "internal",
    travellingMembers: 2,
    accommodationNights: 4,
    travelDays: 6,
    equipmentTransportCost: 0,
  },
  meeting: {
    required: false,
    travelScenarioId: "nsw",
    accommodationType: "none",
    dailyAllowanceDays: 0,
  },
  profitMarginPercent: 30,
  marginMethod: 'markup',
};

// Initial project history seeding to simulate PROJECT HISTORY from spreadsheet
export const INITIAL_HISTORY = [
  {
    id: "quote-1",
    date: "2026-05-10",
    month: "2026-05",
    projectInfo: {
      name: "SouthPoint Tower",
      address: "19-21 Central Road, Miranda NSW 2228",
      state: "NSW",
    },
    geometry: {
      numFloors: 15,
      buildingHeight: 45,
      buildingPerimeter: 160,
      useSegments: false,
      segments: [],
      directFacadeArea: 7200,
    },
    complexity: {
      baseLevelId: "level2",
      customLevel4Factor: 2.65,
      adjustments: ["glass", "gutter"],
      droneRestrictionId: "controlled",
      locationId: "nsw",
    },
    execution: {
      inspectionDays: 6,
      teamSize: 2,
      nfcDays: 1,
      tagging3dDays: 2,
      reportDays: 3,
      dronePilotType: "internal" as const,
    },
    travel: {
      executionType: "internal" as const,
      travellingMembers: 0,
      accommodationNights: 0,
      travelDays: 0,
      equipmentTransportCost: 0,
    },
    meeting: {
      required: false,
      travelScenarioId: "nsw",
      accommodationType: "none" as const,
      dailyAllowanceDays: 0,
    },
    profitMarginPercent: 30,
    totalCost: 15348.00,
    profitAmount: 4604.40,
    subtotal: 19952.40,
    finalPrice: 21947.64,
    totalFacadeArea: 7200,
    costPerM2: 2.13,
    sellPricePerM2: 2.77,
    finalRatePerM2: 3.05,
    category: "C" as const,
    status: "Won" as const,
  },
  {
    id: "quote-2",
    date: "2026-05-24",
    month: "2026-05",
    projectInfo: {
      name: "Broadbeach Landmark",
      address: "88 Surf Parade, Broadbeach QLD 4218",
      state: "QLD",
    },
    geometry: {
      numFloors: 25,
      buildingHeight: 80,
      buildingPerimeter: 220,
      useSegments: true,
      segments: [
        { id: "seg-base", perimeter: 220, height: 50, area: 11000 },
        { id: "seg-tower", perimeter: 140, height: 30, area: 4200 },
      ],
      directFacadeArea: 15200,
    },
    complexity: {
      baseLevelId: "level3",
      customLevel4Factor: 2.65,
      adjustments: ["diagonal", "wind", "noanchors"],
      droneRestrictionId: "restricted",
      locationId: "regional",
    },
    execution: {
      inspectionDays: 8,
      teamSize: 3,
      nfcDays: 3,
      tagging3dDays: 4,
      reportDays: 5,
      dronePilotType: "external" as const,
    },
    travel: {
      executionType: "internal" as const,
      travellingMembers: 3,
      accommodationNights: 10,
      travelDays: 11,
      equipmentTransportCost: 450,
    },
    meeting: {
      required: true,
      travelScenarioId: "regional",
      accommodationType: "separate" as const,
      dailyAllowanceDays: 3,
    },
    profitMarginPercent: 40,
    totalCost: 38245.50,
    profitAmount: 15298.20,
    subtotal: 53543.70,
    finalPrice: 58898.07,
    totalFacadeArea: 15200,
    costPerM2: 2.52,
    sellPricePerM2: 3.52,
    finalRatePerM2: 3.87,
    category: "B" as const,
    status: "Quoted" as const,
  }
];
