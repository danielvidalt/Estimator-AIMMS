export interface Segment {
  id: string;
  perimeter: number;
  height: number;
  area: number;
}

export interface ProjectInfo {
  name: string;
  address: string;
  state: string;
}

export interface GeometrySize {
  numFloors: number;
  buildingHeight: number;
  buildingPerimeter: number;
  useSegments: boolean;
  segments: Segment[];
  directFacadeArea: number; // used if not using segments
}

export interface ComplexityData {
  baseLevelId: string; // ID referencing COMPLEXITY_BASE
  customLevel4Factor?: number; // 2.3 to 3.0, default 2.65
  adjustments: string[]; // list of active adjustment IDs
  droneRestrictionId: string; // ID referencing ZONE_FACTORS
  locationId: string; // ID referencing LOCATION
}

export interface ExecutionData {
  inspectionDays: number;
  teamSize: number;
  nfcDays: number;
  nfcFacadeCount: number; // number of facades getting NFC tags
  tagging3dDays: number;
  reportDays: number;
  dronePilotType: 'internal' | 'external';
}

export interface TravelData {
  executionType: 'internal' | 'contractor';
  // Split by transport mode -- a team can travel by air, by car, or a mix of
  // both at once, each with its own headcount.
  travelByAirCount: number;
  travelByCarCount: number;
  carDistanceKm: number; // round-trip driving distance, used for fuel cost
  accommodationNights: number;
  travelDays: number;
  equipmentTransportCost: number;
  contractorLabourCostOverride?: number; // visible if contractor
}

export interface EstimatorMeetingData {
  required: boolean;
  travelScenarioId: string; // matches LOCATION travel zone
  accommodationType: 'none' | 'team' | 'separate';
  dailyAllowanceDays: number;
}

export interface EstimateInputs {
  projectInfo: ProjectInfo;
  geometry: GeometrySize;
  complexity: ComplexityData;
  execution: ExecutionData;
  travel: TravelData;
  meeting: EstimatorMeetingData;
  // Independent, optional: either, both, or neither can be set. null means
  // that pricing method isn't used for this estimate.
  markupPercent: number | null;
  grossReturnPercent: number | null;
}

export interface EstimateResults {
  // Areas and dimensions
  totalFacadeArea: number;
  
  // Factors
  floorsFactor: number;
  areaFactor: number;
  complexityBaseFactor: number;
  complexityAdjustmentsTotal: number;
  totalFactor: number;
  droneRestrictionFactor: number;
  locationFactor: number;
  category: 'A' | 'B' | 'C';
  categoryMultiplier: number;

  // Direct costs execution
  dailyTeamCost: number;
  inspectionCost: number;
  nfcCost: number;
  tagging3dCost: number;
  reportCost: number;
  dronePilotCost: number;
  totalExecutionCost: number;

  // NFC tag materials + per-tag installation (driven by nfcFacadeCount, not preliminaries)
  nfcTagsMaterialCost: number;
  nfcTagsInstallCost: number;
  totalNfcTagsCost: number;

  // Travel costs
  flightCost: number;
  carFuelCost: number;
  accommodationCost: number;
  dailyAllowanceCost: number;
  totalTravelCost: number;

  // Estimator meeting costs
  estimatorFlightCost: number;
  estimatorAccommodationCost: number;
  estimatorDailyAllowanceCost: number;
  totalEstimatorCost: number;

  // Preliminaries
  preliminariesCost: number;

  // Sums (cost-side only -- profit/subtotal/final price are computed per
  // pricing scenario, see PricingScenario in utils/calculator.ts, since a
  // single estimate can carry a Markup price, a Gross Return price, or both)
  totalCost: number;

  // Rate per m2 (cost-side only)
  costPerM2: number;
}

export interface SavedQuote {
  id: string;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  projectInfo: ProjectInfo;
  geometry: GeometrySize;
  complexity: ComplexityData;
  execution: ExecutionData;
  travel: TravelData;
  meeting: EstimatorMeetingData;
  markupPercent: number | null;
  grossReturnPercent: number | null;

  // Stored outputs (cost-side only -- Subtotal/GST/Final Price/rates for
  // whichever pricing method(s) were set are derived on demand from
  // totalCost + costPerM2 + totalFacadeArea via computeScenario())
  totalCost: number;
  totalFacadeArea: number;
  costPerM2: number;
  category: 'A' | 'B' | 'C';
  status: 'Quoted' | 'Won' | 'Lost' | 'In Progress';
}

// Editable numeric parameters of the pricing engine. IDs, labels and
// structural fields (category A/B/C, complexity levels) stay fixed in
// constants.ts and are combined with this by index -- this only carries
// the numbers a user is allowed to tune from the Settings tab.
export interface PricingConfig {
  floorsFactors: number[]; // 5 rows, aligned with FLOORS_FACTORS
  floorsMaxThresholds: number[]; // 4 thresholds (last "51+" bracket has no cap)
  areaFactors: number[]; // 4 rows, aligned with AREA_FACTORS
  areaMaxThresholds: number[]; // 3 thresholds (last bracket has no cap)
  complexityBaseFactors: number[]; // 4 rows, aligned with COMPLEXITY_BASE
  complexityAdjFactors: number[]; // 6 rows, aligned with COMPLEXITY_ADJ
  zoneFactors: number[]; // 3 rows, aligned with ZONE_FACTORS (drone restriction)
  locationZones: {
    zoneFactor: number;
    flight: number;
    accom: number;
    allowance: number;
  }[]; // 3 rows, aligned with LOCATION_ZONES
  dronePilotRates: { internal: number; external: number };
  execRates: {
    teamLeader: number;
    teamWorker: number;
    reportHrRate: number;
    reportHrsDay: number;
    tagging3dHr: number;
    tagging3dHrsDay: number;
  };
  prelimDetailsA: number[]; // cost per line item, aligned with PRELIM_DETAILS_A
  prelimDetailsB: number[]; // cost per line item, aligned with PRELIM_DETAILS_B
  categoryMaxFactors: number[]; // 2 thresholds (C, B; "A" has no cap)
  categoryMultipliers: number[]; // 3 rows, aligned with CATEGORY_RULES
  nfcRates: {
    tagsPerFacade: number;
    tagPrice: number; // $ per tag (materials)
    installPricePerTag: number; // $ per tag (installation)
  };
  carFuelRatePerKm: number; // $/km, charged instead of a flight for car travellers
}
