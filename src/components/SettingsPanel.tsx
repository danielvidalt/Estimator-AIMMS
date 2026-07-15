import React, { useEffect, useState } from 'react';
import { Save, RefreshCw, Settings, AlertTriangle, Eye, Pencil, X } from 'lucide-react';
import {
  FLOORS_FACTORS,
  AREA_FACTORS,
  COMPLEXITY_BASE,
  COMPLEXITY_ADJ,
  ZONE_FACTORS,
  LOCATION_ZONES,
  PRELIM_DETAILS_A,
  PRELIM_DETAILS_B,
  CATEGORY_RULES,
  DEFAULT_PRICING_CONFIG
} from '../constants';
import { PricingConfig } from '../types';
import { getPreliminariesBreakdown } from '../utils/calculator';

interface SettingsPanelProps {
  config: PricingConfig;
  onSave: (next: PricingConfig) => void;
  readOnly?: boolean;
}

function Section({ title, index, children }: { title: string; index: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs font-bold shadow-2xs">
          {index}
        </span>
        <h2 className="text-base font-display font-extrabold text-slate-900 tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ParamRow({
  label,
  sublabel,
  children,
}: {
  key?: string | number;
  label: string;
  sublabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-b-0">
      <div className="min-w-0">
        <p className="text-xs sm:text-sm font-bold text-slate-700 truncate">{label}</p>
        {sublabel && <p className="text-[11px] text-slate-400">{sublabel}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">{children}</div>
    </div>
  );
}

function NumField({
  value,
  onChange,
  prefix,
  suffix,
  step = 0.01,
}: {
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
}) {
  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">{prefix}</span>
      )}
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={`w-28 bg-white border border-slate-200 rounded-lg py-1.5 text-sm text-slate-800 font-mono text-right focus:outline-none focus:ring-2 focus:ring-aimms-blue/20 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
          prefix ? 'pl-6 pr-2' : 'px-2'
        } ${suffix ? 'pr-6' : ''}`}
      />
      {suffix && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">{suffix}</span>
      )}
    </div>
  );
}

function NoLimitBadge() {
  return (
    <span className="w-28 text-right text-xs font-mono text-slate-400 italic pr-2">No limit</span>
  );
}

export default function SettingsPanel({ config, onSave, readOnly = false }: SettingsPanelProps) {
  const [buffer, setBuffer] = useState<PricingConfig>(config);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setBuffer(config);
  }, [config]);

  // Admins start in the same locked/view state as everyone else; "Edit"
  // unlocks the fields, and saving re-locks them automatically.
  const locked = readOnly || !isEditing;

  const handleSave = () => {
    onSave(buffer);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setBuffer(config);
    setIsEditing(false);
  };

  const setArrayValue = (key: keyof PricingConfig, idx: number, value: number) => {
    setBuffer(prev => {
      const arr = [...(prev[key] as number[])];
      arr[idx] = value;
      return { ...prev, [key]: arr };
    });
  };

  const setLocationZone = (idx: number, field: 'zoneFactor' | 'flight' | 'accom' | 'allowance', value: number) => {
    setBuffer(prev => {
      const zones = prev.locationZones.map((z, i) => (i === idx ? { ...z, [field]: value } : z));
      return { ...prev, locationZones: zones };
    });
  };

  const setDronePilotRate = (field: 'internal' | 'external', value: number) => {
    setBuffer(prev => ({ ...prev, dronePilotRates: { ...prev.dronePilotRates, [field]: value } }));
  };

  const setExecRate = (field: keyof PricingConfig['execRates'], value: number) => {
    setBuffer(prev => ({ ...prev, execRates: { ...prev.execRates, [field]: value } }));
  };

  const setNfcRate = (field: keyof PricingConfig['nfcRates'], value: number) => {
    setBuffer(prev => ({ ...prev, nfcRates: { ...prev.nfcRates, [field]: value } }));
  };

  const breakdown = getPreliminariesBreakdown(buffer);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-16">
      <div className="lg:col-span-2 bg-aimms-dark text-white rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-sky-300 shrink-0" />
          <div>
            <h1 className="text-base font-display font-black">Pricing Engine Settings</h1>
            <p className="text-xs text-slate-350 mt-0.5">
              {readOnly
                ? 'View only. Sign in as admin to edit these numbers.'
                : isEditing
                  ? 'IDs and labels stay fixed; only the numbers ($ and factors) are editable. Changes apply to every estimate as soon as you save.'
                  : 'View only. Click Edit to make changes.'}
            </p>
          </div>
        </div>
        {readOnly ? (
          <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800/60 shrink-0">
            <Eye className="w-3.5 h-3.5" />
            View only
          </span>
        ) : !isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-aimms-blue text-white hover:opacity-90 active:scale-95 transition cursor-pointer shrink-0"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white active:scale-95 hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button
              onClick={() => setBuffer(DEFAULT_PRICING_CONFIG)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white active:scale-95 hover:bg-slate-800 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset to factory defaults
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-aimms-blue text-white hover:opacity-90 active:scale-95 transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save changes
            </button>
          </div>
        )}
      </div>

      <fieldset disabled={locked} className="contents">

      <Section title="Floors Factor" index="01">
        {FLOORS_FACTORS.map((row, idx) => (
          <ParamRow key={row.label} label={row.label}>
            {idx < buffer.floorsMaxThresholds.length ? (
              <NumField
                step={1}
                value={buffer.floorsMaxThresholds[idx]}
                onChange={(v) => setArrayValue('floorsMaxThresholds', idx, v)}
                suffix="max"
              />
            ) : (
              <NoLimitBadge />
            )}
            <NumField value={buffer.floorsFactors[idx]} onChange={(v) => setArrayValue('floorsFactors', idx, v)} suffix="x" />
          </ParamRow>
        ))}
      </Section>

      <Section title="Facade Area Factor" index="02">
        {AREA_FACTORS.map((row, idx) => (
          <ParamRow key={row.label} label={row.label}>
            {idx < buffer.areaMaxThresholds.length ? (
              <NumField
                step={1}
                value={buffer.areaMaxThresholds[idx]}
                onChange={(v) => setArrayValue('areaMaxThresholds', idx, v)}
                suffix="m²"
              />
            ) : (
              <NoLimitBadge />
            )}
            <NumField value={buffer.areaFactors[idx]} onChange={(v) => setArrayValue('areaFactors', idx, v)} suffix="x" />
          </ParamRow>
        ))}
      </Section>

      <Section title="Complexity Base Levels" index="03">
        {COMPLEXITY_BASE.map((row, idx) => (
          <ParamRow key={row.id} label={`Lvl ${row.level} — ${row.label.split(',')[0]}`}>
            <NumField
              value={buffer.complexityBaseFactors[idx]}
              onChange={(v) => setArrayValue('complexityBaseFactors', idx, v)}
              suffix="x"
            />
          </ParamRow>
        ))}
      </Section>

      <Section title="Complexity Adjustments" index="04">
        {COMPLEXITY_ADJ.map((row, idx) => (
          <ParamRow key={row.id} label={row.label}>
            <NumField
              value={buffer.complexityAdjFactors[idx]}
              onChange={(v) => setArrayValue('complexityAdjFactors', idx, v)}
              prefix="+"
            />
          </ParamRow>
        ))}
      </Section>

      <Section title="Drone Zone Restriction" index="05">
        {ZONE_FACTORS.map((row, idx) => (
          <ParamRow key={row.id} label={row.label}>
            <NumField value={buffer.zoneFactors[idx]} onChange={(v) => setArrayValue('zoneFactors', idx, v)} suffix="x" />
          </ParamRow>
        ))}
      </Section>

      <Section title="Drone Pilot Rates" index="06">
        <ParamRow label="Internal Pilot">
          <NumField prefix="$" value={buffer.dronePilotRates.internal} onChange={(v) => setDronePilotRate('internal', v)} />
        </ParamRow>
        <ParamRow label="External Pilot">
          <NumField prefix="$" value={buffer.dronePilotRates.external} onChange={(v) => setDronePilotRate('external', v)} />
        </ParamRow>
      </Section>

      <Section title="Location / Travel Zones" index="07">
        {LOCATION_ZONES.map((row, idx) => (
          <div key={row.id} className="py-2.5 border-b border-slate-50 last:border-b-0 space-y-2">
            <p className="text-xs sm:text-sm font-bold text-slate-700">{row.label}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Zone Factor</span>
                <NumField
                  value={buffer.locationZones[idx].zoneFactor}
                  onChange={(v) => setLocationZone(idx, 'zoneFactor', v)}
                  suffix="x"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Flight</span>
                <NumField prefix="$" value={buffer.locationZones[idx].flight} onChange={(v) => setLocationZone(idx, 'flight', v)} />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Accom / night</span>
                <NumField prefix="$" value={buffer.locationZones[idx].accom} onChange={(v) => setLocationZone(idx, 'accom', v)} />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Allowance / day</span>
                <NumField prefix="$" value={buffer.locationZones[idx].allowance} onChange={(v) => setLocationZone(idx, 'allowance', v)} />
              </div>
            </div>
          </div>
        ))}
        <ParamRow label="Car Fuel Rate" sublabel="$/km, round trip, charged instead of a flight for car travellers">
          <NumField prefix="$" value={buffer.carFuelRatePerKm} onChange={(v) => setBuffer(prev => ({ ...prev, carFuelRatePerKm: v }))} />
        </ParamRow>
      </Section>

      <Section title="Execution / Labor Rates" index="08">
        <ParamRow label="Team Leader" sublabel="$/day">
          <NumField prefix="$" value={buffer.execRates.teamLeader} onChange={(v) => setExecRate('teamLeader', v)} />
        </ParamRow>
        <ParamRow label="Team Worker" sublabel="$/day">
          <NumField prefix="$" value={buffer.execRates.teamWorker} onChange={(v) => setExecRate('teamWorker', v)} />
        </ParamRow>
        <ParamRow label="Report Work" sublabel="$/hour">
          <NumField prefix="$" value={buffer.execRates.reportHrRate} onChange={(v) => setExecRate('reportHrRate', v)} />
        </ParamRow>
        <ParamRow label="Report Hours/Day">
          <NumField step={1} value={buffer.execRates.reportHrsDay} onChange={(v) => setExecRate('reportHrsDay', v)} />
        </ParamRow>
        <ParamRow label="3D Tagging" sublabel="$/hour">
          <NumField prefix="$" value={buffer.execRates.tagging3dHr} onChange={(v) => setExecRate('tagging3dHr', v)} />
        </ParamRow>
        <ParamRow label="3D Tagging Hours/Day">
          <NumField step={1} value={buffer.execRates.tagging3dHrsDay} onChange={(v) => setExecRate('tagging3dHrsDay', v)} />
        </ParamRow>
      </Section>

      <Section title="NFC Tags" index="09">
        <ParamRow label="Tags per Facade">
          <NumField step={1} value={buffer.nfcRates.tagsPerFacade} onChange={(v) => setNfcRate('tagsPerFacade', v)} />
        </ParamRow>
        <ParamRow label="Tag Price" sublabel="$/tag, materials">
          <NumField prefix="$" value={buffer.nfcRates.tagPrice} onChange={(v) => setNfcRate('tagPrice', v)} />
        </ParamRow>
        <ParamRow label="Install Price" sublabel="$/tag, installation">
          <NumField prefix="$" value={buffer.nfcRates.installPricePerTag} onChange={(v) => setNfcRate('installPricePerTag', v)} />
        </ParamRow>
      </Section>

      <Section title="Category Rules" index="10">
        {CATEGORY_RULES.map((row, idx) => (
          <ParamRow key={row.category} label={row.label}>
            {idx < buffer.categoryMaxFactors.length ? (
              <NumField
                value={buffer.categoryMaxFactors[idx]}
                onChange={(v) => setArrayValue('categoryMaxFactors', idx, v)}
                suffix="max"
              />
            ) : (
              <NoLimitBadge />
            )}
            <NumField
              value={buffer.categoryMultipliers[idx]}
              onChange={(v) => setArrayValue('categoryMultipliers', idx, v)}
              suffix="x"
            />
          </ParamRow>
        ))}
      </Section>

      <Section title="Preliminaries — Section A (Direct Costs)" index="11">
        {PRELIM_DETAILS_A.map((item, idx) => (
          <ParamRow key={item.label} label={item.label}>
            <NumField prefix="$" value={buffer.prelimDetailsA[idx]} onChange={(v) => setArrayValue('prelimDetailsA', idx, v)} />
          </ParamRow>
        ))}
        <div className="pt-2 space-y-1 text-xs text-slate-500 font-medium">
          <div className="flex justify-between">
            <span>Subtotal Section A:</span>
            <span className="font-mono text-slate-700">${breakdown.subtotalA.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Contingency (10%):</span>
            <span className="font-mono text-slate-700">${breakdown.contingencyA.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-700">
            <span>Total Section A:</span>
            <span className="font-mono">${breakdown.totalA.toFixed(2)}</span>
          </div>
        </div>
      </Section>

      <Section title="Preliminaries — Section B (Indirect Costs)" index="12">
        {PRELIM_DETAILS_B.map((item, idx) => (
          <ParamRow key={item.label} label={item.label}>
            <NumField prefix="$" value={buffer.prelimDetailsB[idx]} onChange={(v) => setArrayValue('prelimDetailsB', idx, v)} />
          </ParamRow>
        ))}
        <div className="pt-2 flex justify-between text-xs font-bold text-slate-700">
          <span>Total Section B:</span>
          <span className="font-mono">${breakdown.totalB.toFixed(2)}</span>
        </div>
      </Section>

      </fieldset>

      <div className="lg:col-span-2 bg-aimms-blue/5 border border-aimms-blue/20 rounded-3xl p-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preliminaries Total (A + B)</p>
          <p className="text-2xl font-mono font-black text-aimms-blue">
            ${breakdown.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="flex items-start gap-2 text-xs text-slate-500 max-w-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <span>These changes apply to all new calculations as soon as you save. Quotes already saved in the history are not recalculated.</span>
        </div>
      </div>
    </div>
  );
}
