import { 
  FLOORS_FACTORS, 
  AREA_FACTORS, 
  COMPLEXITY_BASE, 
  COMPLEXITY_ADJ, 
  ZONE_FACTORS, 
  LOCATION_ZONES, 
  DRONE_PILOT_RATES, 
  EXEC_RATES, 
  PRELIMINARIES_COST,
  CATEGORY_RULES
} from '../constants';
import { EstimateInputs, EstimateResults } from '../types';

export function calculateEstimate(inputs: EstimateInputs): EstimateResults {
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
  const floorsFactorObj = FLOORS_FACTORS.find(f => geometry.numFloors <= f.max) || FLOORS_FACTORS[FLOORS_FACTORS.length - 1];
  const floorsFactor = floorsFactorObj.factor;

  // Area factor
  const areaFactorObj = AREA_FACTORS.find(f => totalFacadeArea <= f.max) || AREA_FACTORS[AREA_FACTORS.length - 1];
  const areaFactor = areaFactorObj.factor;

  // Complexity base factor
  const baseObj = COMPLEXITY_BASE.find(c => c.id === complexity.baseLevelId) || COMPLEXITY_BASE[0];
  let complexityBaseFactor = baseObj.factor;
  if (baseObj.level === 4 && complexity.customLevel4Factor !== undefined) {
    complexityBaseFactor = complexity.customLevel4Factor;
  }

  // Complexity adjustments total
  const complexityAdjustmentsTotal = complexity.adjustments.reduce((acc, adjId) => {
    const adjObj = COMPLEXITY_ADJ.find(a => a.id === adjId);
    return acc + (adjObj ? adjObj.factor : 0);
  }, 0);

  // Total factor = Complexity Base Factor + Adjustments
  const totalFactor = Number((complexityBaseFactor + complexityAdjustmentsTotal).toFixed(2));

  // Drone restriction factor
  const droneObj = ZONE_FACTORS.find(z => z.id === complexity.droneRestrictionId) || ZONE_FACTORS[0];
  const droneRestrictionFactor = droneObj.factor;

  // Location / travel zone factor
  const locObj = LOCATION_ZONES.find(l => l.id === complexity.locationId) || LOCATION_ZONES[0];
  const locationFactor = locObj.zoneFactor;

  // Category and multiplier (determined by Total Factor)
  const catRule = CATEGORY_RULES.find(r => totalFactor <= r.maxFactor) || CATEGORY_RULES[CATEGORY_RULES.length - 1];
  const category = catRule.category;
  const categoryMultiplier = catRule.multiplier;

  // 3. Execution Costs (Variable Direct Costs)
  const dailyTeamCost = EXEC_RATES.teamLeader + (Math.max(1, execution.teamSize) - 1) * EXEC_RATES.teamWorker;
  const inspectionCost = execution.inspectionDays * dailyTeamCost;
  const nfcCost = execution.nfcDays * dailyTeamCost;
  const tagging3dCost = execution.tagging3dDays * EXEC_RATES.tagging3dHrsDay * EXEC_RATES.tagging3dHr;
  const reportCost = execution.reportDays * EXEC_RATES.reportHrsDay * EXEC_RATES.reportHrRate;
  
  const pilotCostBase = DRONE_PILOT_RATES[execution.dronePilotType] || 300;
  // Apply location and drone restriction factors to drone pilot costs as complexity escalates
  const dronePilotCost = pilotCostBase * droneRestrictionFactor;

  let totalExecutionCost = inspectionCost + nfcCost + tagging3dCost + reportCost + dronePilotCost;

  // Apply floors and facade area factors: taller/larger buildings cost more to execute
  totalExecutionCost = totalExecutionCost * floorsFactor * areaFactor;

  // Apply location factor multiplier to execution labor when we are remote/regional
  totalExecutionCost = totalExecutionCost * locationFactor;

  // Apply category multiplier as well to the entire execution cost
  totalExecutionCost = totalExecutionCost * categoryMultiplier;

  // 4. Travel & Mobilisation Costs
  // Based on the selected locationId zone
  const travelZone = LOCATION_ZONES.find(l => l.id === complexity.locationId) || LOCATION_ZONES[0];
  
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
    const meetingZone = LOCATION_ZONES.find(l => l.id === meeting.travelScenarioId) || LOCATION_ZONES[0];
    
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

  // 6. Preliminaries Cost
  const preliminariesCost = PRELIMINARIES_COST;

  // 7. Overall Sums
  const totalCost = preliminariesCost + totalExecutionCost + totalTravelCost + totalEstimatorCost;
  
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
