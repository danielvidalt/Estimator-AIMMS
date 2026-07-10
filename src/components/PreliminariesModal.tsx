import React from 'react';
import { X, HelpCircle, DollarSign, RefreshCw, Layers } from 'lucide-react';

interface PrelimLineItem {
  label: string;
  cost: number;
}

interface PreliminariesModalProps {
  isOpen: boolean;
  onClose: () => void;
  customPrelims: number;
  onOverride: (value: number) => void;
  onReset: () => void;
  defaultPrelims: number;
  detailsA: PrelimLineItem[];
  detailsB: PrelimLineItem[];
  subtotalA: number;
  contingencyA: number;
  totalA: number;
  totalB: number;
}

export default function PreliminariesModal({
  isOpen,
  onClose,
  customPrelims,
  onOverride,
  onReset,
  defaultPrelims,
  detailsA,
  detailsB,
  subtotalA,
  contingencyA,
  totalA,
  totalB
}: PreliminariesModalProps) {
  if (!isOpen) return null;

  const isOverridden = customPrelims !== defaultPrelims;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-8 max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 className="text-xl font-display font-bold">Preliminaries Detail</h3>
              <p className="text-slate-400 text-xs">Standard fixed costs compiled per project (AIMMS Cost - General)</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Overrides block */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="text-sm font-semibold text-slate-800 block">
                  Preliminaries Total Cost
                </label>
                <p className="text-xs text-slate-500">
                  Fixed system standard: <strong className="font-mono text-slate-700">${defaultPrelims.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-mono">$</span>
                  <input
                    type="number"
                    value={customPrelims}
                    onChange={(e) => onOverride(parseFloat(e.target.value) || 0)}
                    className="w-36 pl-7 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  />
                </div>
                {isOverridden && (
                  <button
                    onClick={onReset}
                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Reset to default system tariff"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {isOverridden && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200/50 rounded-lg p-2.5 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>You are overriding the system standard preliminaries. This value will be used in calculations instead of the default rate.</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Section A */}
            <div className="space-y-3">
              <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                <h4 className="font-display font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-mono">A</span>
                  Section A — Direct Costs
                </h4>
                <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  ${totalA.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-xs space-y-2 max-h-64 overflow-y-auto pr-1">
                {detailsA.map((item, idx) => (
                  <div key={idx} className="flex justify-between p-1.5 hover:bg-slate-50 rounded transition border-b border-dashed border-slate-100">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="font-mono text-slate-800 font-medium">${item.cost.toFixed(2)}</span>
                  </div>
                ))}
                <div className="pt-2 flex justify-between text-slate-500 font-medium">
                  <span>Subtotal Section A:</span>
                  <span>${subtotalA.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Contingency amount (10%):</span>
                  <span>${contingencyA.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Section B */}
            <div className="space-y-3">
              <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                <h4 className="font-display font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-xs font-mono">B</span>
                  Section B — Indirect Costs (Prorated)
                </h4>
                <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  ${totalB.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-xs space-y-2 max-h-64 overflow-y-auto pr-1">
                {detailsB.map((item, idx) => (
                  <div key={idx} className="flex justify-between p-1.5 hover:bg-slate-50 rounded transition border-b border-dashed border-slate-100">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="font-mono text-slate-800 font-medium">${item.cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
}
