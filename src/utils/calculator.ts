import {
  COMPLEXITY_BASE,
  COMPLEXITY_ADJ,
  ZONE_FACTORS,
  LOCATION_ZONES,
  DRONE_PILOT_RATES,
  CATEGORY_RULES
} from '../constants';
import { EstimateInputs, EstimateResults, PricingConfig } from '../types';

export interface PreliminariesBreakdown {
  subtotalA: number;
  contingencyA: number;
  totalA: number;
  totalB: number;
  total: number;
}

export function getPreliminariesBreakdown(config: PricingConfig): PreliminariesBreakdown {
  const subtotalA = config.prelimDetailsA.reduce((acc, cost) => acc + cost, 0);
  const contingencyA = subtotalA * 0.10;
  const totalA = subtotalA + contingencyA;
  const totalB = config.prelimDetailsB.reduce((acc, cost) => acc + cost, 0);
  return { subtotalA, contingencyA, totalA, totalB, total: totalA + totalB };
}

export function getPreliminariesCost(config: PricingConfig): number {
  return getPreliminariesBreakdown(config).total;
}

export function calculateEstimate(inputs: EstimateInputs, config: PricingConfig): EstimateResults {
  const {
    projectInfo,
    geometry,
    complexity,
    execution,
    travel,
    meeting,
    profitMarginPercent,
  } = inputs;

  // 1. Calculate Facade Area
  let totalFacadeArea = 0;
  if (geometry.useSegments) {
    totalFacadeArea = geometry.segments.reduce((acc, seg) => {
      const area = seg.perimeter * seg.height;
      return acc + (isNaN(area) ? 0 : area);
    }, 0);
  } else {
    totalFacadeArea = geometry.directFacadeArea || (geometry.buildingPerimeter * geometry.buildingHeight) || 0;
  }

  // 2. Lookup Factors
  // Floors factor
  const floorsIdx = config.floorsMaxThresholds.findIndex(max => geometry.numFloors <= max);
  const floorsFactor = floorsIdx === -1
    ? config.floorsFactors[config.floorsFactors.length - 1]
    : config.floorsFactors[floorsIdx];

  // Area factor
  const areaIdx = config.areaMaxThresholds.findIndex(max => totalFacadeArea <= max);
  const areaFactor = areaIdx === -1
    ? config.areaFactors[config.areaFactors.length - 1]
    : config.areaFactors[areaIdx];

  // Complexity base factor
  const baseIdx = COMPLEXITY_BASE.findIndex(c => c.id === complexity.baseLevelId);
  const baseObj = baseIdx >= 0 ? COMPLEXITY_BASE[baseIdx] : COMPLEXITY_BASE[0];
  let complexityBaseFactor = baseIdx >= 0 ? config.complexityBaseFactors[baseIdx] : config.complexityBaseFactors[0];
  if (baseObj.level === 4 && complexity.customLevel4Factor !== undefined) {
    complexityBaseFactor = complexity.customLevel4Factor;
  }

  // Complexity adjustments total
  const complexityAdjustmentsTotal = complexity.adjustments.reduce((acc, adjId) => {
    const idx = COMPLEXITY_ADJ.findIndex(a => a.id === adjId);
    return acc + (idx >= 0 ? config.complexityAdjFactors[idx] : 0);
  }, 0);

  // Total factor = Complexity Base Factor + Adjustments
  const totalFactor = Number((complexityBaseFactor + complexityAdjustmentsTotal).toFixed(2));

  // Drone restriction factor
  const droneIdx = ZONE_FACTORS.findIndex(z => z.id === complexity.droneRestrictionId);
  const droneRestrictionFactor = droneIdx >= 0 ? config.zoneFactors[droneIdx] : config.zoneFactors[0];

  // Location / travel zone factor
  const locIdx = LOCATION_ZONES.findIndex(l => l.id === complexity.locationId);
  const locationZoneCfg = locIdx >= 0 ? config.locationZones[locIdx] : config.locationZones[0];
  const locationFactor = locationZoneCfg.zoneFactor;

  // Category and multiplier (determined by Total Factor)
  const catIdx = config.categoryMaxFactors.findIndex(max => totalFactor <= max);
  const catRule = catIdx === -1 ? CATEGORY_RULES[CATEGORY_RULES.length - 1] : CATEGORY_RULES[catIdx];
  const categoryMultiplier = catIdx === -1
    ? config.categoryMultipliers[config.categoryMultipliers.length - 1]
    : config.categoryMultipliers[catIdx];
  const category = catRule.category;

  // 3. Execution Costs (Variable Direct Costs)
  const dailyTeamCost = config.execRates.teamLeader + (Math.max(1, execution.teamSize) - 1) * config.execRates.teamWorker;
  const inspectionCost = execution.inspectionDays * dailyTeamCost;
  const nfcCost = execution.nfcDays * dailyTeamCost;
  const tagging3dCost = execution.tagging3dDays * config.execRates.tagging3dHrsDay * config.execRates.tagging3dHr;
  const reportCost = execution.reportDays * config.execRates.reportHrsDay * config.execRates.reportHrRate;

  const pilotCostBase = config.dronePilotRates[execution.dronePilotType] ?? DRONE_PILOT_RATES[execution.dronePilotType] ?? 300;
  // Apply location and drone restriction factors to drone pilot costs as complexity escalates
  const dronePilotCost = pilotCostBase * droneRestrictionFactor;

  let totalExecutionCost = inspectionCost + nfcCost + tagging3dCost + reportCost + dronePilotCost;

  // Apply floors and facade area factors: taller/larger buildings cost more to execute
  totalExecutionCost = totalExecutionCost * floorsFactor * areaFactor;

  // Apply location factor multiplier to execution labor when we are remote/regional
  totalExecutionCost = totalExecutionCost * locationFactor;

  // Apply category multiplier as well to the entire execution cost
  totalExecutionCost = totalExecutionCost * categoryMultiplier;

  // 3b. NFC Tags (materials + per-tag installation). Driven by how many
  // facades get tagged, not by the fixed preliminaries -- flat quantity x
  // unit price, no factor multipliers applied.
  const nfcTagCount = Math.max(0, execution.nfcFacadeCount) * config.nfcRates.tagsPerFacade;
  const nfcTagsMaterialCost = nfcTagCount * config.nfcRates.tagPrice;
  const nfcTagsInstallCost = nfcTagCount * config.nfcRates.installPricePerTag;
  const totalNfcTagsCost = nfcTagsMaterialCost + nfcTagsInstallCost;

  // 4. Travel & Mobilisation Costs
  // Based on the selected locationId zone
  const travelZone = locationZoneCfg;

  // Flights (round trip per person travelling)
  const numTravelers = travel.travellingMembers >= 0 ? travel.travellingMembers : execution.teamSize;
  const flightCost = travelZone.flight * numTravelers;

  // Accommodation (rate * nights * travelers) - wait, if lodging is Airbnb, often it's per house,
  // but let's stick to the spec's: Accom Rate * Nights * Team Size or simply per night.
  // The spec says: Accommodation = Accom Rate * Nights * Team Size
  const accommodationCost = travelZone.accom * travel.accommodationNights * (numTravelers || 1);

  // Daily allowance (daily rate * travel days * travelers)
  const dailyAllowanceCost = travelZone.allowance * travel.travelDays * numTravelers;

  let totalTravelCost = flightCost + accommodationCost + dailyAllowanceCost + travel.equipmentTransportCost;

  // If contractor execution type and there is a contractor labor override, add it
  if (travel.executionType === 'contractor' && travel.contractorLabourCostOverride !== undefined) {
    // Override or add to execution? Let's check spec: "Contractor Labour Cost override ($/day) - visible/added"
    // Usually means replacing or adding. Let's make it clear: we add it as part of overall travel/contractor mobilisation.
    totalTravelCost += (travel.contractorLabourCostOverride * execution.inspectionDays);
  }

  // 5. Estimator / Client Meeting
  let estimatorFlightCost = 0;
  let estimatorAccommodationCost = 0;
  let estimatorDailyAllowanceCost = 0;

  if (meeting.required) {
    const meetingIdx = LOCATION_ZONES.findIndex(l => l.id === meeting.travelScenarioId);
    const meetingZone = meetingIdx >= 0 ? config.locationZones[meetingIdx] : config.locationZones[0];

    // Flight for 1 estimator
    estimatorFlightCost = meetingZone.flight;

    // Accommodation for 1 estimator based on option
    if (meeting.accommodationType === 'separate') {
      // Rates based on meeting zone
      // Let's use travel.accommodationNights as default or default to 1 night if none provided
      const nights = travel.accommodationNights || 1;
      estimatorAccommodationCost = meetingZone.accom * nights;
    } else if (meeting.accommodationType === 'team') {
      estimatorAccommodationCost = 0; // Already covered by the team room/Airbnb budget
    } else {
      estimatorAccommodationCost = 0;
    }

    // Daily allowance
    estimatorDailyAllowanceCost = meetingZone.allowance * meeting.dailyAllowanceDays;
  }

  const totalEstimatorCost = estimatorFlightCost + estimatorAccommodationCost + estimatorDailyAllowanceCost;

  // 6. Preliminaries Cost (derived live from the itemized line items)
  const preliminariesCost = getPreliminariesCost(config);

  // 7. Overall Sums
  const totalCost = preliminariesCost + totalExecutionCost + totalTravelCost + totalEstimatorCost + totalNfcTagsCost;

  const profitMarginPercentFraction = profitMarginPercent / 100;

  let profitAmount = 0;
  if (inputs.marginMethod === 'gross') {
    // Gross Return (Margin on Sales price)
    // subtotal = totalCost / (1 - fraction)
    // profit = subtotal - totalCost
    if (profitMarginPercentFraction >= 1) {
      profitAmount = totalCost * 99; // fail-safe for 100% margin
    } else {
      profitAmount = (totalCost / (1 - profitMarginPercentFraction)) - totalCost;
    }
  } else {
    // Default: Markup on Cost
    profitAmount = totalCost * profitMarginPercentFraction;
  }

  const subtotal = totalCost + profitAmount;
  const gstAmount = subtotal * 0.10; // 10%
  const finalPrice = subtotal + gstAmount;

  // 8. Rates per m2
  // Adjust Cost = Execution Cost (the variable cost of executing, without prelims or travel)
  const adjustCost = totalExecutionCost;

  const costPerM2 = totalFacadeArea > 0 ? (adjustCost / totalFacadeArea) : 0;

  let sellPricePerM2 = 0;
  if (totalFacadeArea > 0) {
    if (inputs.marginMethod === 'gross') {
      if (profitMarginPercentFraction >= 1) {
        sellPricePerM2 = (adjustCost + (adjustCost * 99)) / totalFacadeArea;
      } else {
        sellPricePerM2 = (adjustCost / (1 - profitMarginPercentFraction)) / totalFacadeArea;
      }
    } else {
      sellPricePerM2 = (adjustCost + (adjustCost * profitMarginPercentFraction)) / totalFacadeArea;
    }
  }

  const finalRatePerM2 = totalFacadeArea > 0 ? (finalPrice / totalFacadeArea) : 0;

  return {
    totalFacadeArea,
    floorsFactor,
    areaFactor,
    complexityBaseFactor,
    complexityAdjustmentsTotal,
    totalFactor,
    droneRestrictionFactor,
    locationFactor,
    category,
    categoryMultiplier,
    dailyTeamCost,
    inspectionCost,
    nfcCost,
    tagging3dCost,
    reportCost,
    dronePilotCost,
    totalExecutionCost,
    nfcTagsMaterialCost,
    nfcTagsInstallCost,
    totalNfcTagsCost,
    flightCost,
    accommodationCost,
    dailyAllowanceCost,
    totalTravelCost,
    estimatorFlightCost,
    estimatorAccommodationCost,
    estimatorDailyAllowanceCost,
    totalEstimatorCost,
    preliminariesCost,
    totalCost,
    profitAmount,
    subtotal,
    gstAmount,
    finalPrice,
    costPerM2,
    sellPricePerM2,
    finalRatePerM2,
  };
}
