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
  tagging3dDays: number;
  reportDays: number;
  dronePilotType: 'internal' | 'external';
}

export interface TravelData {
  executionType: 'internal' | 'contractor';
  travellingMembers: number;
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
  profitMarginPercent: number; // default: 30
  marginMethod?: 'markup' | 'gross'; // 'markup' (on cost) or 'gross' (gross return)
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

  // Travel costs
  flightCost: number;
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

  // Sums
  totalCost: number;
  profitAmount: number;
  subtotal: number;
  gstAmount: number;
  finalPrice: number;

  // Rates per m2
  costPerM2: number;
  sellPricePerM2: number;
  finalRatePerM2: number;
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
  profitMarginPercent: number;
  marginMethod?: 'markup' | 'gross';
  
  // Stored outputs
  totalCost: number;
  profitAmount: number;
  subtotal: number;
  finalPrice: number;
  totalFacadeArea: number;
  costPerM2: number;
  sellPricePerM2: number;
  finalRatePerM2: number;
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
}
