import React from 'react';
import { EstimateInputs, EstimateResults } from '../types';
import { Logo } from './Logo';
import { 
  X, 
  Printer, 
  MapPin, 
  Calendar, 
  Building, 
  FileText, 
  ChevronRight, 
  Award, 
  Grid3X3,
  TrendingUp,
  Coins
} from 'lucide-react';
import { COMPLEXITY_BASE, ZONE_FACTORS, LOCATION_ZONES } from '../constants';

interface PrintQuotePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  inputs: EstimateInputs;
  results: EstimateResults;
  quoteId: string;
}

export default function PrintQuotePreview({
  isOpen,
  onClose,
  inputs,
  results,
  quoteId
}: PrintQuotePreviewProps) {
  if (!isOpen) return null;

  const formattedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const baseComplexityObj = COMPLEXITY_BASE.find(c => c.id === inputs.complexity.baseLevelId);
  const droneRestrictionObj = ZONE_FACTORS.find(z => z.id === inputs.complexity.droneRestrictionId);
  const locationObj = LOCATION_ZONES.find(l => l.id === inputs.complexity.locationId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto no-print">
      <div 
        className="bg-slate-100 rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-4 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dynamic Interactive Toolbar (Hidden when printing) */}
        <div className="bg-aimms-dark px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 border-b border-aimms-blue/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-aimms-sky animate-pulse"></div>
            <div>
              <h3 className="text-white font-display font-bold text-base">Quote Print Preview</h3>
              <p className="text-slate-400 text-xs">A4 styled estimate document generator ready for PDF export</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
               onClick={handlePrint}
               className="flex items-center gap-2 bg-aimms-blue hover:bg-aimms-sky text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-md shadow-aimms-blue/20 cursor-pointer border border-aimms-sky/20"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl text-sm font-semibold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

        {/* Scalable print-sheet container */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-200 flex justify-center">
          {/* A4 styled printable sheet */}
          <div id="printable-quote-sheet" className="bg-white text-slate-800 w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-12 shadow-md border border-slate-300 rounded-md relative flex flex-col justify-between print:border-none print:shadow-none print:p-0 print:m-0">
            
            <div>
              {/* Header Letterhead */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Logo variant="brand" className="h-[38px] w-auto" />
                    <span className="text-slate-300 text-lg font-light">|</span>
                    <span className="text-xs tracking-wider text-slate-500 font-mono font-bold uppercase">ESTIMATE OFFICE</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium max-w-sm">
                    Advanced Inspection & Management Methods System
                  </p>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Sydney, New South Wales, Australia
                  </p>
                </div>
                
                <div className="text-right">
                  <div className="inline-block bg-aimms-blue text-white font-mono text-xs font-bold px-3 py-1 rounded mb-2 shadow-xs">
                    REF: #{quoteId.substring(0, 8).toUpperCase()}
                  </div>
                  <p className="text-xs text-slate-500 flex items-center justify-end gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    {formattedDate}
                  </p>
                </div>
              </div>

              {/* Recipient / Project info */}
              <div className="grid grid-cols-2 gap-8 bg-slate-50 border border-slate-200 p-5 rounded-lg mb-8">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                    PROJECT PROFILE
                  </span>
                  <h4 className="text-sm font-semibold text-slate-800">
                    {inputs.projectInfo.name || "Untitled AIMMS Project"}
                  </h4>
                  <p className="text-xs text-slate-500 flex items-start gap-1 max-w-xs leading-relaxed">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                    {inputs.projectInfo.address || "Address not provided, Australia"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                    REGION & STATE
                  </span>
                  <h4 className="text-sm font-semibold text-slate-800">
                    Jurisdiction: {inputs.projectInfo.state || "NSW"}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Travel Zone Rate: {locationObj?.label || "NSW (Local)"} <br />
                    Location Factor: <strong className="font-mono">{results.locationFactor}x</strong>
                  </p>
                </div>
              </div>

              {/* Specifications Block */}
              <div className="mb-8">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 mb-3 border-b pb-1">
                  I. Project Geometry & Dimensional Parameters
                </h3>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-500 uppercase block font-medium">Total Floors</span>
                    <strong className="text-sm text-slate-800 font-mono">{inputs.geometry.numFloors} floors</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-500 uppercase block font-medium">Est. Height</span>
                    <strong className="text-sm text-slate-800 font-mono">{inputs.geometry.buildingHeight} m</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-500 uppercase block font-medium">Est. Perimeter</span>
                    <strong className="text-sm text-slate-800 font-mono">{inputs.geometry.buildingPerimeter} m</strong>
                  </div>
                  <div className="bg-aimms-blue p-2.5 rounded text-white font-semibold">
                    <span className="text-[10px] text-sky-100/90 uppercase block font-bold">Total Facade Area</span>
                    <strong className="text-xs font-mono text-sky-200">{results.totalFacadeArea.toLocaleString()} m²</strong>
                  </div>
                </div>

                {inputs.geometry.useSegments && inputs.geometry.segments.length > 0 && (
                  <div className="mt-3">
                    <table className="w-full text-left text-xs border border-slate-100">
                      <thead>
                        <tr className="bg-slate-100 font-semibold text-slate-700">
                          <th className="p-1.5 pl-3">Segment Name</th>
                          <th className="p-1.5 text-right">Perimeter (m)</th>
                          <th className="p-1.5 text-right">Height (m)</th>
                          <th className="p-1.5 text-right pr-3">Area (m²)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inputs.geometry.segments.map((seg, idx) => (
                          <tr key={seg.id} className="border-b border-slate-100">
                            <td className="p-1.5 pl-3 text-slate-600 font-medium">Segment {idx + 1}</td>
                            <td className="p-1.5 text-right font-mono text-slate-600">{seg.perimeter}m</td>
                            <td className="p-1.5 text-right font-mono text-slate-600">{seg.height}m</td>
                            <td className="p-1.5 text-right font-mono font-semibold text-slate-800 pr-3">{(seg.perimeter * seg.height).toLocaleString()}m²</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Factors and Complexity Category */}
              <div className="mb-8">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 mb-3 border-b pb-1">
                  II. Complexity Coefficients & Project Category
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  {/* Category Card */}
                  <div className="border border-slate-200 rounded p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">PROJECT CATEGORY</span>
                      <h4 className="text-xl font-display font-extrabold text-slate-900 mt-1">
                        Category {results.category}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                      Determined dynamically by building complexity. Sub-multiplier of <strong className="font-mono">{results.categoryMultiplier}x</strong> is applied.
                    </p>
                  </div>

                  {/* Coefficients Lists */}
                  <div className="col-span-2 border border-slate-200 rounded p-4 space-y-2">
                    <div className="flex justify-between items-center text-xs pb-1.5 border-b border-dashed">
                      <span className="text-slate-500">Base Complexity ({inputs.complexity.baseLevelId === 'level4' ? 'Lvl 4' : 'Lvl' + (baseComplexityObj?.level || 1)})</span>
                      <strong className="font-mono font-medium text-slate-800">{results.complexityBaseFactor.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between items-center text-xs pb-1.5 border-b border-dashed">
                      <span className="text-slate-500">Accumulated Design Adjustments ({inputs.complexity.adjustments.length})</span>
                      <strong className="font-mono text-slate-800">+{results.complexityAdjustmentsTotal.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between items-center text-xs pb-1.5 border-b border-dashed font-bold">
                      <span className="text-slate-800">Derived Total Complexity Score</span>
                      <span className="font-mono text-slate-900">{results.totalFactor.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {inputs.complexity.adjustments.map(adj => (
                        <span key={adj} className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-semibold uppercase">
                          {adj}
                        </span>
                      ))}
                      {inputs.complexity.adjustments.length === 0 && (
                        <span className="text-[11px] italic text-slate-400">No additional structural adjustments</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Costing Breakdowns */}
              <div className="mb-8">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 mb-3 border-b pb-1">
                  III. Cost Estimation Breakdown
                </h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-aimms-blue text-white font-mono font-bold uppercase text-[9px] tracking-wider text-left">
                      <th className="p-2 py-2.5 pl-3 rounded-l">Service Category / Execution Area</th>
                      <th className="p-2 text-right">Details</th>
                      <th className="p-2 text-right pr-3 rounded-r">Cost (AUD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 pl-3 font-semibold text-slate-800">
                        Preliminaries & Fixed System Costs
                      </td>
                      <td className="p-2.5 text-right text-slate-500">
                        Section A Directs + Section B Indirects Standard
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-900 font-medium pr-3">
                        ${results.preliminariesCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 pl-3 font-semibold text-slate-800">
                        Variable Inspection & Modeling Execution
                      </td>
                      <td className="p-2.5 text-right text-slate-500 leading-normal">
                        {inputs.execution.inspectionDays} Inspections / {inputs.execution.teamSize} Team / {inputs.execution.reportDays} Report Days (Adjusted)
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-900 font-medium pr-3">
                        ${results.totalExecutionCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 pl-3 font-semibold text-slate-800">
                        Mobilisation & Field Team Travel
                      </td>
                      <td className="p-2.5 text-right text-slate-500">
                        {inputs.travel.travellingMembers || inputs.execution.teamSize} Travelers / {inputs.travel.accommodationNights} Nights / {inputs.travel.travelDays} Travel Days
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-900 font-medium pr-3">
                        ${results.totalTravelCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    {inputs.meeting.required && (
                      <tr className="border-b border-slate-200">
                        <td className="p-2.5 pl-3 font-semibold text-slate-800">
                          Estimator on-site & Client Consultation
                        </td>
                        <td className="p-2.5 text-right text-slate-500">
                          {inputs.meeting.accommodationType === 'separate' ? "With independent room lodging" : "Lodging with team/none"}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-900 font-medium pr-3">
                          ${results.totalEstimatorCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-slate-50 font-bold border-b border-slate-300">
                      <td className="p-3 pl-3 text-slate-900">
                        Total Direct & Administrative Project Cost
                      </td>
                      <td className="p-3"></td>
                      <td className="p-3 text-right font-mono text-slate-900 pr-3">
                        ${results.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Combined Profit and Final Price Block */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                {/* Metrics */}
                <div className="border border-slate-200 rounded p-4 space-y-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block pb-1 border-b">
                    CALCULATED METRICS & UNIT RATES
                  </span>
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-505 text-slate-500">Direct Cost / m² (Execution only):</span>
                    <span className="font-mono text-slate-800">${results.costPerM2.toFixed(2)} AUD</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium border-b border-dashed pb-1.5">
                    <span className="text-slate-550 text-slate-500">Sale Price / m² (Directs + Margin):</span>
                    <span className="font-mono text-slate-800">${results.sellPricePerM2.toFixed(2)} AUD</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold pt-1 text-slate-900">
                    <span>Final Client Rate / m² (with GST):</span>
                    <span className="font-mono font-semibold">${results.finalRatePerM2.toFixed(2)} AUD</span>
                  </div>
                </div>

                {/* Final Tax Invoice Summary */}
                <div className="bg-aimms-blue text-white p-4 rounded space-y-2 flex flex-col justify-between shadow-sm">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-sky-100 font-mono">
                      <span>Total Base Cost:</span>
                      <span>${results.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs text-sky-100 font-mono">
                      <span>Approved Profit ({inputs.profitMarginPercent}% {inputs.marginMethod === 'gross' ? 'Gross Return' : 'Markup'}):</span>
                      <span>+${results.profitAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs text-sky-100 font-mono border-b border-sky-800/80 pb-1.5">
                      <span>Subtotal (Net Price):</span>
                      <span>${results.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs text-sky-100 font-mono">
                      <span>GST (10.0%):</span>
                      <span>+${results.gstAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-baseline border-t border-sky-800 pt-2">
                    <span className="text-xs uppercase font-extrabold tracking-wider text-sky-300 font-display">
                      TOTAL OFFERED PRICE
                    </span>
                    <span className="text-lg font-mono font-extrabold text-sky-300">
                      ${results.finalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Print Footer Agreement / Signature */}
            <div className="border-t border-slate-200 pt-10 text-[9px] text-slate-400 text-center space-y-4">
              <div className="grid grid-cols-2 gap-16 px-4 mb-2">
                <div className="text-left border-t border-dashed border-slate-300 pt-2 space-y-0.5">
                  <p className="font-bold text-slate-550 text-slate-500 uppercase">Prepared By</p>
                  <p className="font-semibold text-slate-700">AIMMS Estimator Office representative</p>
                </div>
                <div className="text-left border-t border-dashed border-slate-300 pt-2 space-y-0.5">
                  <p className="font-bold text-slate-550 text-slate-500 uppercase">Client Acceptance (Signature)</p>
                  <p className="font-semibold text-slate-400 italic">Date: ____ / ____ / 2026</p>
                </div>
              </div>
              <p className="leading-relaxed leading-normal px-2">
                Disclaimer: This estimate of façade inspection has been generated based on current standard AIMMS logistics variables, building dimensions supplied, and structural complexities mapped. Cost structure has a standard 10% contingency factored on Section A direct planning components. Final project pricing is subject to safety authorization and weather clearance operations. Valid for 60 days.
              </p>
              <p className="font-mono text-[8px] text-slate-300 uppercase">
                AIMMS Project Estimator Tool &bull; Secured Document Hash: {quoteId}
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
