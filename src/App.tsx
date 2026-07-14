import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { LogOut } from 'lucide-react';
import { 
  Calculator, 
  MapPin, 
  Building, 
  Layers, 
  Plane, 
  Users, 
  Calendar, 
  DollarSign, 
  Sparkles, 
  Plus, 
  Trash2, 
  Copy, 
  Save, 
  Printer, 
  Eye, 
  Undo2, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Sliders, 
  Briefcase, 
  FileCheck, 
  History, 
  TrendingUp, 
  Coins,
  LayoutGrid,
  TrendingDown,
  RefreshCw,
  FolderOpen,
  ChevronRight,
  Settings,
  Lock,
  ShieldCheck,
  X
} from 'lucide-react';

import {
  DEFAULT_INPUTS,
  INITIAL_HISTORY,
  COMPLEXITY_BASE,
  COMPLEXITY_ADJ,
  ZONE_FACTORS,
  LOCATION_ZONES,
  CATEGORY_RULES,
  DEFAULT_PRICING_CONFIG,
  PRELIM_DETAILS_A,
  PRELIM_DETAILS_B
} from './constants';
import { EstimateInputs, SavedQuote, Segment, PricingConfig } from './types';
import { calculateEstimate, getPreliminariesCost, getPreliminariesBreakdown, computeScenario, PricingScenario } from './utils/calculator';
import PreliminariesModal from './components/PreliminariesModal';
import PrintQuotePreview from './components/PrintQuotePreview';
import SettingsPanel from './components/SettingsPanel';
import { Logo } from './components/Logo';
import { FieldTooltip } from './components/FieldTooltip';
import AdminLogin from './components/AdminLogin';
import { ADMIN_EMAIL } from './lib/adminConfig';
import { fetchQuotes, upsertQuote, upsertQuotes, deleteQuote } from './lib/quotesService';
import { fetchAppState, saveAppState } from './lib/appStateService';
import { fetchPricingConfig, savePricingConfig } from './lib/pricingConfigService';
import { supabase } from './lib/supabaseClient';

interface AppProps {
  session: Session;
}

export default function App({ session }: AppProps) {
  // --- States ---
  const [inputs, setInputs] = useState<EstimateInputs>(() => {
    // Attempt load latest working draft or default
    try {
      const cachedDraft = localStorage.getItem('aimms_current_draft');
      return cachedDraft ? JSON.parse(cachedDraft) : DEFAULT_INPUTS;
    } catch {
      return DEFAULT_INPUTS;
    }
  });

  const [customPrelims, setCustomPrelims] = useState<number>(() => {
    try {
      const cachedPrelims = localStorage.getItem('aimms_custom_prelims');
      return cachedPrelims ? parseFloat(cachedPrelims) : getPreliminariesCost(DEFAULT_PRICING_CONFIG);
    } catch {
      return getPreliminariesCost(DEFAULT_PRICING_CONFIG);
    }
  });

  const [history, setHistory] = useState<SavedQuote[]>(() => {
    try {
      const cachedHistory = localStorage.getItem('aimms_project_history');
      if (cachedHistory) {
        return JSON.parse(cachedHistory);
      }
      // Populate defaults if cache is empty
      localStorage.setItem('aimms_project_history', JSON.stringify(INITIAL_HISTORY));
      return INITIAL_HISTORY;
    } catch {
      return INITIAL_HISTORY;
    }
  });

  const [config, setConfig] = useState<PricingConfig>(DEFAULT_PRICING_CONFIG);

  // Sidebar expanded settings, alerts state, modals
  const [isPrelimModalOpen, setIsPrelimModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const isAdmin = session.user.email === ADMIN_EMAIL;

  const handleExitAdmin = async () => {
    await supabase.auth.signOut();
    await supabase.auth.signInAnonymously();
  };
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Quick navigation scroll steps or tabs
  const [activeTab, setActiveTab] = useState<'calculator' | 'history' | 'settings'>('calculator');

  // Whether the initial pull from Supabase has completed (gates outbound sync
  // so we don't push stale local-cache defaults over real remote data).
  const [isHydrated, setIsHydrated] = useState(false);
  const supabaseErrorShownRef = useRef(false);

  const reportSupabaseError = (err: unknown) => {
    console.error('Supabase sync error:', err);
    if (!supabaseErrorShownRef.current) {
      supabaseErrorShownRef.current = true;
      triggerNotification(
        'No se pudo sincronizar con Supabase (verifica que ejecutaste la migración SQL). Los cambios se guardan solo en este navegador.',
        'error'
      );
    }
  };

  // --- Sync Cache (localStorage: instant paint + offline fallback) ---
  useEffect(() => {
    localStorage.setItem('aimms_current_draft', JSON.stringify(inputs));
  }, [inputs]);

  useEffect(() => {
    localStorage.setItem('aimms_custom_prelims', customPrelims.toString());
  }, [customPrelims]);

  useEffect(() => {
    localStorage.setItem('aimms_project_history', JSON.stringify(history));
  }, [history]);

  // --- Hydrate from Supabase (source of truth once reachable) ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const remoteHistory = await fetchQuotes();
        if (cancelled) return;
        if (remoteHistory.length > 0) {
          setHistory(remoteHistory);
        } else {
          await upsertQuotes(history);
        }
      } catch (err) {
        if (!cancelled) reportSupabaseError(err);
      }

      try {
        const { draft, customPrelims: remotePrelims } = await fetchAppState();
        if (cancelled) return;
        if (draft) {
          setInputs(draft);
        }
        if (remotePrelims !== null && remotePrelims !== undefined) {
          setCustomPrelims(remotePrelims);
        }
        if (!draft) {
          await saveAppState(inputs, customPrelims);
        }
      } catch (err) {
        if (!cancelled) reportSupabaseError(err);
      }

      try {
        const remoteConfig = await fetchPricingConfig();
        if (cancelled) return;
        if (remoteConfig) {
          // Merge onto defaults so a config row saved before a newer field
          // existed (e.g. nfcRates) never leaves that field undefined --
          // that used to crash the render with no ErrorBoundary to catch it.
          setConfig({
            ...DEFAULT_PRICING_CONFIG,
            ...remoteConfig,
            dronePilotRates: { ...DEFAULT_PRICING_CONFIG.dronePilotRates, ...remoteConfig.dronePilotRates },
            execRates: { ...DEFAULT_PRICING_CONFIG.execRates, ...remoteConfig.execRates },
            nfcRates: { ...DEFAULT_PRICING_CONFIG.nfcRates, ...remoteConfig.nfcRates },
          });
        } else {
          await savePricingConfig(DEFAULT_PRICING_CONFIG);
        }
      } catch (err) {
        if (!cancelled) reportSupabaseError(err);
      } finally {
        if (!cancelled) setIsHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Runs once on mount to pull remote state; intentionally excludes
    // inputs/customPrelims/history from deps (they're only read as the
    // initial seed value if Supabase has nothing yet).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Debounced push of draft + prelims to Supabase ---
  useEffect(() => {
    if (!isHydrated) return;
    const timer = setTimeout(() => {
      saveAppState(inputs, customPrelims).catch(reportSupabaseError);
    }, 800);
    return () => clearTimeout(timer);
  }, [inputs, customPrelims, isHydrated]);

  // Alert dismiss helper
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // --- Calculations ---
  const preliminariesDefault = useMemo(() => getPreliminariesCost(config), [config]);

  const results = useMemo(() => {
    const baseCalculated = calculateEstimate(inputs, config);

    // Override preliminaries dynamically
    if (customPrelims !== preliminariesDefault) {
      const diff = customPrelims - preliminariesDefault;
      const totalCost = baseCalculated.totalCost + diff;
      return {
        ...baseCalculated,
        preliminariesCost: customPrelims,
        totalCost,
      };
    }

    return baseCalculated;
  }, [inputs, customPrelims, config, preliminariesDefault]);

  // Independent Markup / Gross Return pricing scenarios -- either, both, or
  // neither is active depending on what the user filled in. Both are
  // derived fresh from the same cost-side results, so switching preliminary
  // overrides or execution inputs keeps them in sync automatically.
  const markupScenario: PricingScenario | null = useMemo(() => (
    inputs.markupPercent != null
      ? computeScenario('markup', inputs.markupPercent, results.totalCost, results.totalExecutionCost, results.totalFacadeArea)
      : null
  ), [inputs.markupPercent, results.totalCost, results.totalExecutionCost, results.totalFacadeArea]);

  const grossScenario: PricingScenario | null = useMemo(() => (
    inputs.grossReturnPercent != null
      ? computeScenario('gross', inputs.grossReturnPercent, results.totalCost, results.totalExecutionCost, results.totalFacadeArea)
      : null
  ), [inputs.grossReturnPercent, results.totalCost, results.totalExecutionCost, results.totalFacadeArea]);

  // --- Actions & Handlers ---
  const triggerNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
  };

  const updateProjectInfo = (field: string, value: string) => {
    setInputs(prev => ({
      ...prev,
      projectInfo: {
        ...prev.projectInfo,
        [field]: value
      }
    }));
  };

  const updateGeometry = (field: string, value: any) => {
    setInputs(prev => ({
      ...prev,
      geometry: {
        ...prev.geometry,
        [field]: value
      }
    }));
  };

  const handleAddSegment = () => {
    const newSegment: Segment = {
      id: `seg-${Date.now()}`,
      perimeter: 40,
      height: 25,
      area: 1000
    };
    setInputs(prev => ({
      ...prev,
      geometry: {
        ...prev.geometry,
        segments: [...prev.geometry.segments, newSegment]
      }
    }));
    triggerNotification("Facial segment added. Define height & perimeter.", "info");
  };

  const handleUpdateSegment = (id: string, field: 'perimeter' | 'height', value: number) => {
    setInputs(prev => {
      const updatedSegments = prev.geometry.segments.map(seg => {
        if (seg.id === id) {
          const nextSeg = { ...seg, [field]: value };
          nextSeg.area = nextSeg.perimeter * nextSeg.height;
          return nextSeg;
        }
        return seg;
      });
      return {
        ...prev,
        geometry: {
          ...prev.geometry,
          segments: updatedSegments
        }
      };
    });
  };

  const handleDeleteSegment = (id: string) => {
    setInputs(prev => ({
      ...prev,
      geometry: {
        ...prev.geometry,
        segments: prev.geometry.segments.filter(s => s.id !== id)
      }
    }));
    triggerNotification("Segment deleted.", "info");
  };

  const updateComplexity = (field: string, value: any) => {
    setInputs(prev => {
      // If we change location, adjust the meeting travel zone to match as a high quality default
      if (field === 'locationId') {
        return {
          ...prev,
          complexity: { ...prev.complexity, [field]: value },
          meeting: { ...prev.meeting, travelScenarioId: value }
        };
      }
      return {
        ...prev,
        complexity: {
          ...prev.complexity,
          [field]: value
        }
      };
    });
  };

  const handleToggleAdjustment = (adjId: string) => {
    setInputs(prev => {
      const adjs = [...prev.complexity.adjustments];
      const index = adjs.indexOf(adjId);
      if (index >= 0) {
        adjs.splice(index, 1);
      } else {
        adjs.push(adjId);
      }
      return {
        ...prev,
        complexity: { ...prev.complexity, adjustments: adjs }
      };
    });
  };

  const updateExecution = (field: string, value: any) => {
    setInputs(prev => {
      // If teamSize changes, also keep travel travellingMembers in sync unless manually modified
      if (field === 'teamSize') {
        const nextVal = parseInt(value) || 1;
        return {
          ...prev,
          execution: { ...prev.execution, [field]: nextVal },
          travel: { ...prev.travel, travellingMembers: nextVal }
        };
      }
      return {
        ...prev,
        execution: {
          ...prev.execution,
          [field]: parseInt(value) || 0
        }
      };
    });
  };

  const updateTravel = (field: string, value: any) => {
    setInputs(prev => ({
      ...prev,
      travel: {
        ...prev.travel,
        [field]: typeof value === 'number' ? value : value
      }
    }));
  };

  const updateMeeting = (field: string, value: any) => {
    setInputs(prev => ({
      ...prev,
      meeting: {
        ...prev.meeting,
        [field]: value
      }
    }));
  };

  const handleSaveQuote = () => {
    if (!inputs.projectInfo.name.trim()) {
      triggerNotification("Please enter a Project Name to save the quote.", "error");
      return;
    }
    if (inputs.markupPercent == null && inputs.grossReturnPercent == null) {
      triggerNotification("Please set a Markup % or Gross Return % before saving.", "error");
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const monthStr = todayStr.substring(0, 7);

    if (editingId) {
      // Update existing
      const existing = history.find(q => q.id === editingId);
      if (!existing) return;
      const updatedQuote: SavedQuote = {
        ...existing,
        date: todayStr,
        month: monthStr,
        projectInfo: inputs.projectInfo,
        geometry: inputs.geometry,
        complexity: inputs.complexity,
        execution: inputs.execution,
        travel: inputs.travel,
        meeting: inputs.meeting,
        markupPercent: inputs.markupPercent,
        grossReturnPercent: inputs.grossReturnPercent,
        totalCost: results.totalCost,
        totalFacadeArea: results.totalFacadeArea,
        costPerM2: results.costPerM2,
        category: results.category,
      };
      setHistory(prev => prev.map(q => (q.id === editingId ? updatedQuote : q)));
      upsertQuote(updatedQuote).catch(reportSupabaseError);
      setEditingId(null);
      triggerNotification(`Quote "${inputs.projectInfo.name}" updated successfully!`);
    } else {
      // Add new
      const newQuote: SavedQuote = {
        id: `quote-${Date.now()}`,
        date: todayStr,
        month: monthStr,
        projectInfo: inputs.projectInfo,
        geometry: inputs.geometry,
        complexity: inputs.complexity,
        execution: inputs.execution,
        travel: inputs.travel,
        meeting: inputs.meeting,
        markupPercent: inputs.markupPercent,
        grossReturnPercent: inputs.grossReturnPercent,
        totalCost: results.totalCost,
        totalFacadeArea: results.totalFacadeArea,
        costPerM2: results.costPerM2,
        category: results.category,
        status: 'Quoted',
      };
      setHistory(prev => [newQuote, ...prev]);
      upsertQuote(newQuote).catch(reportSupabaseError);
      triggerNotification(`New quote "${inputs.projectInfo.name}" saved to History!`);
    }
  };

  const handleLoadQuote = (quote: SavedQuote) => {
    setInputs({
      projectInfo: quote.projectInfo,
      geometry: quote.geometry,
      complexity: quote.complexity,
      execution: quote.execution,
      travel: quote.travel,
      meeting: quote.meeting,
      markupPercent: quote.markupPercent,
      grossReturnPercent: quote.grossReturnPercent,
    });
    setEditingId(quote.id);
    setActiveTab('calculator');
    // Scroll smoothly to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    triggerNotification(`Loaded "${quote.projectInfo.name}" for live modeling.`, "success");
  };

  const handleDuplicateQuote = (quote: SavedQuote) => {
    const duplicated: SavedQuote = {
      ...quote,
      id: `quote-${Date.now()}`,
      projectInfo: {
        ...quote.projectInfo,
        name: `${quote.projectInfo.name} (Copy)`
      },
      date: new Date().toISOString().split('T')[0],
    };
    setHistory(prev => [duplicated, ...prev]);
    upsertQuote(duplicated).catch(reportSupabaseError);
    triggerNotification(`Duplicated "${quote.projectInfo.name}" successfully!`);
  };

  const handleDeleteQuote = (id: string, name: string) => {
    if (confirm(`Are you sure you want to permanently delete the estimate for "${name}"?`)) {
      setHistory(prev => prev.filter(q => q.id !== id));
      deleteQuote(id).catch(reportSupabaseError);
      if (editingId === id) {
        setEditingId(null);
      }
      triggerNotification(`Deleted "${name}" from estimate archive.`, "error");
    }
  };

  const handleUpdateStatus = (id: string, newStatus: SavedQuote['status']) => {
    setHistory(prev => prev.map(q => {
      if (q.id === id) {
        const updated = { ...q, status: newStatus };
        upsertQuote(updated).catch(reportSupabaseError);
        return updated;
      }
      return q;
    }));
    triggerNotification(`Quote status updated to "${newStatus}"`, "info");
  };

  const handleResetCalculator = () => {
    if (confirm("Reset the estimator? All current draft values will be restored to defaults.")) {
      setInputs(DEFAULT_INPUTS);
      setCustomPrelims(preliminariesDefault);
      setEditingId(null);
      triggerNotification("Calculator reset to vanilla template parameters.", "info");
    }
  };

  const handleSaveConfig = (next: PricingConfig) => {
    setConfig(next);
    savePricingConfig(next)
      .then(() => triggerNotification("Pricing configuration saved.", "success"))
      .catch(reportSupabaseError);
  };

  // Pre-calculations for display
  const baseComplexityDetails = COMPLEXITY_BASE.find(c => c.id === inputs.complexity.baseLevelId) || COMPLEXITY_BASE[0];
  const activeZoneObj = LOCATION_ZONES.find(l => l.id === inputs.complexity.locationId) || LOCATION_ZONES[0];
  const isLocalZone = inputs.complexity.locationId === 'nsw';
  const catRuleColor = CATEGORY_RULES.find(r => results.category === r.category) || CATEGORY_RULES[2];

  const prelimBreakdown = getPreliminariesBreakdown(config);
  const prelimDetailsAWithCosts = PRELIM_DETAILS_A.map((item, idx) => ({
    label: item.label,
    cost: config.prelimDetailsA[idx],
  }));
  const prelimDetailsBWithCosts = PRELIM_DETAILS_B.map((item, idx) => ({
    label: item.label,
    cost: config.prelimDetailsB[idx],
  }));

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans antialiased relative selection:bg-emerald-100 selection:text-emerald-900 pb-16">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl border border-slate-800 animate-slide-up max-w-sm">
          <span className={`w-2 h-2 rounded-full ${
            notification.type === 'success' ? 'bg-emerald-400' :
            notification.type === 'error' ? 'bg-rose-400' : 'bg-blue-400'
          }`}></span>
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
      )}

      {/* Header section with brand accent */}
      <header className="bg-aimms-dark text-white border-b border-aimms-blue/30 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/5 p-1 px-2 rounded-xl">
              <Logo variant="light" className="h-11 w-auto hover:opacity-95 transition" />
            </div>
            <div className="h-10 w-px bg-slate-700/50 self-center hidden sm:block"></div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-wide text-white uppercase flex items-center gap-1.5 leading-none">
                Project Estimator
              </h1>
            </div>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-1.5 bg-slate-800/60 p-1.5 rounded-2xl border border-slate-700/50">
            <button
              onClick={() => setActiveTab('calculator')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition duration-150 cursor-pointer ${
                activeTab === 'calculator' 
                  ? 'bg-aimms-blue text-white shadow-md shadow-aimms-blue/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Active Estimate</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition duration-150 relative cursor-pointer ${
                activeTab === 'history' 
                  ? 'bg-aimms-blue text-white shadow-md shadow-aimms-blue/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span>History Log</span>
              {history.length > 0 && (
                <span className="bg-aimms-sky text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {history.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition duration-150 cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-aimms-blue text-white shadow-md shadow-aimms-blue/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>

          {/* Discreet admin access -- no account needed for regular use */}
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <>
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin
                </span>
                <button
                  onClick={handleExitAdmin}
                  title="Exit admin mode"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsAdminModalOpen(true)}
                title="Admin sign in"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Primary Container / Wrapper */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {activeTab === 'calculator' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: Inputs (Sections 0 to 5) arranged as a gorgeous Bento Grid layout */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
              
              {/* Draft Status Indicator */}
              {editingId && (
                <div className="md:col-span-2 bg-amber-50 border-2 border-amber-200 text-amber-900 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-100 p-2.5 rounded-xl text-amber-700">
                      <FolderOpen className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-base font-bold">Modifying Existing Estimate</p>
                      <p className="text-sm text-amber-800 font-medium mt-0.5">
                        You are currently editing a saved record. Click "Save Estimate" to overwrite.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingId(null);
                      setInputs(DEFAULT_INPUTS);
                      triggerNotification("Cleared editing state. Started new draft.", "info");
                    }}
                    className="bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 rounded-xl py-2 px-4 text-xs sm:text-sm font-bold transition duration-200 cursor-pointer shadow-xs hover:border-amber-400"
                  >
                    Exit Edit Mode
                  </button>
                </div>
              )}

              {/* SECTION 0: Project Details */}
              <section className="md:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900 transition-all duration-300 group-hover:bg-aimms-blue" />
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs font-bold shadow-2xs">
                    00
                  </span>
                  <h2 className="text-base font-display font-extrabold text-slate-900 tracking-tight">Project Overview</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Project Name / ID
                    </label>
                    <input
                      type="text"
                      value={inputs.projectInfo.name}
                      onChange={(e) => updateProjectInfo('name', e.target.value)}
                      placeholder="e.g. SouthPoint Tower"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-aimms-blue/20 focus:border-aimms-blue placeholder-slate-400 font-semibold transition bg-slate-50/30 hover:bg-white"
                    />
                  </div>
                  
                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Building Address
                    </label>
                    <input
                      type="text"
                      value={inputs.projectInfo.address}
                      onChange={(e) => updateProjectInfo('address', e.target.value)}
                      placeholder="e.g. 19-21 Central Rd, Miranda"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-aimms-blue/20 focus:border-aimms-blue placeholder-slate-400 font-semibold transition bg-slate-50/30 hover:bg-white"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      State / Territory
                    </label>
                    <div className="relative">
                      <select
                        value={inputs.projectInfo.state}
                        onChange={(e) => updateProjectInfo('state', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50/30 hover:bg-white rounded-xl text-slate-800 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-aimms-blue/20 focus:border-aimms-blue font-bold transition cursor-pointer appearance-none"
                      >
                        {["NSW", "QLD", "VIC", "ACT", "SA", "WA", "NT", "TAS"].map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                        <ChevronRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION 1: Geometry & Size */}
              <section className="md:col-span-1 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900 transition-all duration-300 group-hover:bg-aimms-blue" />
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs font-bold shadow-2xs">
                      01
                    </span>
                    <h2 className="text-base font-display font-extrabold text-slate-900 tracking-tight">Geometry & Size</h2>
                  </div>
                  
                  {/* Segmented Geometry Toggle */}
                  <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 self-start sm:self-auto">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Segmented Area?</span>
                    <button
                      onClick={() => updateGeometry('useSegments', !inputs.geometry.useSegments)}
                      className={`relative inline-flex h-4.5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        inputs.geometry.useSegments ? 'bg-aimms-blue' : 'bg-slate-300'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        inputs.geometry.useSegments ? 'translate-x-4.5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 transition">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Total Floors
                      </label>
                      <span className="text-[10px] font-black text-aimms-blue bg-aimms-light px-1.5 py-0.5 rounded font-mono">
                        {results.floorsFactor === 1.0 ? '1.00x' : `${results.floorsFactor.toFixed(2)}x`}
                      </span>
                    </div>
                    <input
                      type="number"
                      value={inputs.geometry.numFloors}
                      onChange={(e) => updateGeometry('numFloors', Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full bg-white px-3 py-2 border border-slate-200 rounded-lg text-slate-850 text-sm md:text-base font-bold focus:outline-none focus:ring-2 focus:ring-aimms-blue/20 font-mono text-center"
                    />
                  </div>

                  <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 transition">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Total Height (m)
                    </label>
                    <input
                      type="number"
                      value={inputs.geometry.buildingHeight}
                      onChange={(e) => updateGeometry('buildingHeight', Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-white px-3 py-2 border border-slate-200 rounded-lg text-slate-850 text-sm md:text-base font-bold focus:outline-none focus:ring-2 focus:ring-aimms-blue/20 font-mono text-center"
                    />
                  </div>

                  <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 transition sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Base Perimeter (meters)
                    </label>
                    <input
                      type="number"
                      value={inputs.geometry.buildingPerimeter}
                      disabled={inputs.geometry.useSegments}
                      onChange={(e) => updateGeometry('buildingPerimeter', Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-white px-3 py-2 border border-slate-200 rounded-lg text-slate-850 text-sm md:text-base font-bold focus:outline-none focus:ring-2 focus:ring-aimms-blue/20 font-mono disabled:opacity-50 text-center"
                    />
                  </div>
                </div>

                {inputs.geometry.useSegments ? (
                  // Segmented display active
                  <div className="bg-slate-900 text-white rounded-2xl p-4.5 space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-200">Segmented Blocks</h4>
                        <p className="text-xs text-slate-400 mt-0.5">Custom heights/perimeters</p>
                      </div>
                      <button
                        onClick={handleAddSegment}
                        className="flex items-center gap-1.5 bg-aimms-sky hover:bg-aimms-accent text-white px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>

                    {inputs.geometry.segments.length > 0 ? (
                      <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                        {inputs.geometry.segments.map((seg, index) => (
                          <div 
                            key={seg.id} 
                            className="bg-slate-800 p-3 rounded-xl flex items-center gap-3 border border-slate-700/50"
                          >
                            <span className="text-xs font-mono font-bold text-slate-400 shrink-0">
                              #{index + 1}
                            </span>
                            
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <span className="text-[10px] text-slate-400 block font-bold uppercase">Perim (m)</span>
                                <input
                                  type="number"
                                  value={seg.perimeter}
                                  onChange={(e) => handleUpdateSegment(seg.id, 'perimeter', parseFloat(e.target.value) || 0)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white text-center font-mono focus:outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] text-slate-400 block font-bold uppercase">Height (m)</span>
                                <input
                                  type="number"
                                  value={seg.height}
                                  onChange={(e) => handleUpdateSegment(seg.id, 'height', parseFloat(e.target.value) || 0)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white text-center font-mono focus:outline-none"
                                />
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteSegment(seg.id)}
                              className="text-slate-400 hover:text-rose-400 p-1.5 rounded hover:bg-slate-700 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-xs italic text-slate-450">
                        No segments. Add one to split base.
                      </div>
                    )}
                  </div>
                ) : (
                  // Direct facade area, auto-calculated (read-only)
                  <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-200">
                    <div className="flex flex-col gap-1 mb-2 text-left">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Direct Facade Area (m²)
                      </label>
                      <span className="text-xs text-slate-400 font-medium">
                        Auto-calculated: {inputs.geometry.buildingPerimeter}m × {inputs.geometry.buildingHeight}m
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        disabled
                        value={inputs.geometry.buildingPerimeter * inputs.geometry.buildingHeight}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-500 text-sm md:text-base font-bold focus:outline-none font-mono text-center bg-slate-100 cursor-not-allowed"
                      />
                    </div>
                  </div>
                )}
                
                {results.totalFacadeArea <= 0 && (
                  <div className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl p-3 flex gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 animate-pulse" />
                    <span>Facade area is <strong>0 m²</strong>. Needs height, perimeter or segments.</span>
                  </div>
                )}
              </section>

              {/* SECTION 2: Complexity */}
              <section className="md:col-span-1 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900 transition-all duration-300 group-hover:bg-aimms-blue" />
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs font-bold shadow-2xs">
                    02
                  </span>
                  <h2 className="text-base font-display font-extrabold text-slate-900 tracking-tight">Complexity & Conditions</h2>
                </div>

                {/* Complexity Base cards */}
                <div className="space-y-3">
                  <div className="relative inline-block group/tip">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider cursor-help">
                      1. Base Complexity Level
                    </label>
                    <FieldTooltip
                      align="left"
                      text="Building complexity level, based on inspection and rope access work considerations."
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {COMPLEXITY_BASE.map((lvl, lvlIdx) => {
                      const isSelected = inputs.complexity.baseLevelId === lvl.id;
                      return (
                        <div
                          key={lvl.id}
                          onClick={() => updateComplexity('baseLevelId', lvl.id)}
                          className={`p-2.5 rounded-xl border-2 text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-aimms-blue text-white border-aimms-blue shadow-md shadow-aimms-blue/20 ring-2 ring-aimms-blue/30 ring-offset-2'
                              : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                              isSelected ? 'bg-aimms-dark text-sky-200' : 'bg-slate-100 text-slate-600'
                            }`}>
                              Lvl {lvl.level}
                            </span>
                            <p className="text-xs sm:text-sm font-bold leading-tight">
                              {lvl.label.split(',')[0]}
                            </p>
                          </div>
                          <span className="text-sm font-mono font-black shrink-0">
                            {lvl.id === 'level4' && inputs.complexity.customLevel4Factor
                              ? `${inputs.complexity.customLevel4Factor.toFixed(2)}x`
                              : `${config.complexityBaseFactors[lvlIdx].toFixed(2)}x`
                            }
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Level 4 Custom Factor Fine-tuning */}
                  {inputs.complexity.baseLevelId === 'level4' && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-fade-in">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-slate-500 text-xs uppercase font-extrabold">Lvl 4 Multiplier Slider:</span>
                        <strong className="font-mono text-slate-900 text-sm">
                          {inputs.complexity.customLevel4Factor !== undefined ? inputs.complexity.customLevel4Factor : 2.65}x
                        </strong>
                      </div>
                      <input
                        type="range"
                        min="2.3"
                        max="3.0"
                        step="0.05"
                        value={inputs.complexity.customLevel4Factor !== undefined ? inputs.complexity.customLevel4Factor : 2.65}
                        onChange={(e) => updateComplexity('customLevel4Factor', parseFloat(e.target.value))}
                        className="w-full accent-aimms-blue h-1 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Adjustments checklists */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      2. Design Adjustments
                    </label>
                    <span className="text-xs font-mono font-bold text-aimms-blue bg-aimms-light px-2 py-0.5 rounded">
                      +{results.complexityAdjustmentsTotal.toFixed(2)} Sum
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {COMPLEXITY_ADJ.map((adj, adjIdx) => {
                      const isActive = inputs.complexity.adjustments.includes(adj.id);
                      return (
                        <button
                          key={adj.id}
                          onClick={() => handleToggleAdjustment(adj.id)}
                          className={`p-2.5 rounded-xl border-2 text-xs font-bold text-left transition flex items-start justify-between gap-1.5 cursor-pointer ${
                            isActive
                              ? 'bg-aimms-blue border-aimms-blue text-white shadow-md shadow-aimms-blue/20'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <span className="flex items-start gap-1.5 min-w-0">
                            {isActive && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                            <span className="font-extrabold">{adj.label}</span>
                          </span>
                          <span className={`font-mono text-[10px] font-black shrink-0 px-1.5 py-0.5 rounded ${
                            isActive ? 'bg-aimms-dark text-sky-200' : 'bg-slate-100 text-slate-500'
                          }`}>
                            +{config.complexityAdjFactors[adjIdx]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Drone zones and state location */}
                <div className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        3. Drone Zone Restriction
                      </label>
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {results.droneRestrictionFactor > 1.0 ? `+${Math.round((results.droneRestrictionFactor - 1) * 100)}%` : 'Reg Rate'}
                      </span>
                    </div>
                    <div className="relative">
                      <select
                        value={inputs.complexity.droneRestrictionId}
                        onChange={(e) => updateComplexity('droneRestrictionId', e.target.value)}
                        className="w-full pl-3.5 pr-8 py-2.5 border border-slate-200 bg-white rounded-xl text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer appearance-none"
                      >
                        {ZONE_FACTORS.map((z, zIdx) => (
                          <option key={z.id} value={z.id}>
                            {z.label} ({config.zoneFactors[zIdx]}x)
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                        <ChevronRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        4. Project Location Zone
                      </label>
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {results.locationFactor > 1.0 ? `${results.locationFactor}x` : '1.0x'}
                      </span>
                    </div>
                    <div className="relative">
                      <select
                        value={inputs.complexity.locationId}
                        onChange={(e) => updateComplexity('locationId', e.target.value)}
                        className="w-full pl-3.5 pr-8 py-2.5 border border-slate-200 bg-white rounded-xl text-slate-805 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer appearance-none"
                      >
                        {LOCATION_ZONES.map((loc, locIdx) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.label} (Flights: ${config.locationZones[locIdx].flight})
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                        <ChevronRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION 3: Execution */}
              <section className="md:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900 transition-all duration-300 group-hover:bg-aimms-blue" />
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs font-bold shadow-2xs">
                    03
                  </span>
                  <div className="flex-1 flex flex-col sm:flex-row justify-between items-start sm:items-baseline">
                    <h2 className="text-base font-display font-extrabold text-slate-900 tracking-tight">Execution Scope (Variable Costs)</h2>
                    <span className="text-xs sm:text-sm text-aimms-blue font-bold bg-aimms-light px-2.5 py-1 rounded font-mono">Daily Labor Rate: ${results.dailyTeamCost}/day</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3.5">
                  <div className="relative group/tip space-y-1.5 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 transition">
                    <FieldTooltip
                      align="left"
                      text="Days the inspection takes (rope access). This item does not include drone flights as inspection time."
                    />
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Inspection Days
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={inputs.execution.inspectionDays}
                      onChange={(e) => updateExecution('inspectionDays', e.target.value)}
                      className="w-full bg-white px-2 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm md:text-base text-center font-bold font-mono focus:outline-none focus:ring-2 focus:ring-aimms-blue/20"
                    />
                  </div>

                  <div className="relative group/tip space-y-1.5 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 transition">
                    <FieldTooltip
                      text="Number of people on the facade technicians team (rope access). Usually a minimum of 2 people."
                    />
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Team Size
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={inputs.execution.teamSize}
                      onChange={(e) => updateExecution('teamSize', e.target.value)}
                      className="w-full bg-white px-2 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm md:text-base text-center font-bold font-mono focus:outline-none focus:ring-2 focus:ring-aimms-blue/20"
                    />
                  </div>

                  <div className="relative group/tip space-y-1.5 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 transition">
                    <FieldTooltip
                      text="Days it takes to install the NFC tags on the building. Depends on whether only one tag is installed per drop (rooftop only) or one per section/quadrant (e.g. L1/D1, L5/D2), and whether it's installed on all 4 facades or only some."
                    />
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      NFC Inst. Days
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={inputs.execution.nfcDays}
                      onChange={(e) => updateExecution('nfcDays', e.target.value)}
                      className="w-full bg-white px-2 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm md:text-base text-center font-bold font-mono focus:outline-none focus:ring-2 focus:ring-aimms-blue/20"
                    />
                  </div>

                  <div className="relative group/tip space-y-1.5 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 transition">
                    <FieldTooltip
                      text="Location of the NFC tags: whether across the entire building or only on a particular facade. Determines how many tags are installed, which is reflected in the cost."
                    />
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      NFC Facades
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={inputs.execution.nfcFacadeCount}
                      onChange={(e) => updateExecution('nfcFacadeCount', e.target.value)}
                      className="w-full bg-white px-2 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm md:text-base text-center font-bold font-mono focus:outline-none focus:ring-2 focus:ring-aimms-blue/20"
                    />
                  </div>

                  <div className="relative group/tip space-y-1.5 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 transition">
                    <FieldTooltip
                      text="Days it takes to mark all defects found during the inspection on the 3D model. Usually ranges from 2 to 4 working days depending on the number of defects found."
                    />
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      3D model (days)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={inputs.execution.tagging3dDays}
                      onChange={(e) => updateExecution('tagging3dDays', e.target.value)}
                      className="w-full bg-white px-2 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm md:text-base text-center font-bold font-mono focus:outline-none focus:ring-2 focus:ring-aimms-blue/20"
                    />
                  </div>

                  <div className="relative group/tip space-y-1.5 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 transition">
                    <FieldTooltip
                      align="right"
                      text="Days it takes to put together the facade remedial report."
                    />
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Report Days
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={inputs.execution.reportDays}
                      onChange={(e) => updateExecution('reportDays', e.target.value)}
                      className="w-full bg-white px-2 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm md:text-base text-center font-bold font-mono focus:outline-none focus:ring-2 focus:ring-aimms-blue/20"
                    />
                  </div>
                </div>

                {/* Drone Pilot operator selector */}
                <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <h4 className="text-xs sm:text-sm font-black text-slate-850 uppercase tracking-wider">Drone Pilot operator</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Internal vs professional subcontractor rates</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-200/80 p-1.5 rounded-xl shrink-0">
                    <div className="relative group/tip">
                      <button
                        onClick={() => setInputs(prev => ({ ...prev, execution: { ...prev.execution, dronePilotType: 'internal' } }))}
                        className={`px-4 py-2.5 rounded-lg text-xs font-bold transition duration-200 cursor-pointer ${
                          inputs.execution.dronePilotType == 'internal'
                            ? 'bg-aimms-blue text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
                        }`}
                      >
                        Internal - $300/day
                      </button>
                      <FieldTooltip
                        align="left"
                        text="Uses a drone pilot from the CPR team (Daniel)."
                      />
                    </div>
                    <div className="relative group/tip">
                      <button
                        onClick={() => setInputs(prev => ({ ...prev, execution: { ...prev.execution, dronePilotType: 'external' } }))}
                        className={`px-4 py-2.5 rounded-lg text-xs font-bold transition duration-200 cursor-pointer ${
                          inputs.execution.dronePilotType == 'external'
                            ? 'bg-aimms-blue text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
                        }`}
                      >
                        Contractor - $700/day
                      </button>
                      <FieldTooltip
                        align="right"
                        text="Uses an external pilot (mainly outside NSW)."
                      />
                    </div>
                  </div>
                </div>

                {/* Labor breakdown micro table */}
                <div className="bg-aimms-dark text-slate-300 rounded-2xl p-5 space-y-3.5 border border-aimms-blue/30">
                  <h4 className="text-white text-xs sm:text-sm uppercase font-bold tracking-wider mb-2 border-b border-aimms-blue/20 pb-2 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-sky-400" />
                    Labour Cost breakdown estimates
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block text-xs uppercase mb-1">Inspection:</span>
                      <strong className="text-white font-mono text-sm sm:text-base font-bold">${results.inspectionCost.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-xs uppercase mb-1">NFC Tagging:</span>
                      <strong className="text-white font-mono text-sm sm:text-base font-bold">${results.nfcCost.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-xs uppercase mb-1">NFC Tags (materials):</span>
                      <strong className="text-white font-mono text-sm sm:text-base font-bold">${results.totalNfcTagsCost.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-xs uppercase font-mono mb-1">3D marking:</span>
                      <strong className="text-white font-mono text-sm sm:text-base font-bold">${results.tagging3dCost.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-xs uppercase font-mono mb-1">Reporting:</span>
                      <strong className="text-white font-mono text-sm sm:text-base font-bold">${results.reportCost.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION 4: Travel & Mobilisation */}
              <section className="md:col-span-1 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900 transition-all duration-300 group-hover:bg-aimms-blue" />
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs font-bold shadow-2xs">
                    04
                  </span>
                  <div className="flex-1 flex flex-col justify-start">
                    <h2 className="text-base font-display font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                      Travel & Mobilisation
                      {isLocalZone && (
                        <span className="relative inline-flex group/tip">
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <FieldTooltip
                            align="center"
                            text="Travel & Mobilisation is locked because the Project Location Zone (section 2) is set to NSW (Local) -- local projects have no flights, accommodation, or travel allowance costs. Switch the zone to Regional or Remote to unlock it."
                          />
                        </span>
                      )}
                    </h2>
                    <span className="text-xs text-slate-500 font-bold block mt-0.5">
                      Flights ${activeZoneObj.flight} &bull; Accom ${activeZoneObj.accom}
                    </span>
                  </div>
                </div>

                <fieldset
                  disabled={isLocalZone}
                  className={`min-w-0 border-0 p-0 m-0 space-y-5 transition-opacity ${isLocalZone ? 'opacity-40 grayscale-[60%] cursor-not-allowed' : ''}`}
                >
                  {/* Execution Type Radio Selector */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Execution Team Source
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1.5 rounded-xl">
                        <button
                          onClick={() => updateTravel('executionType', 'internal')}
                          className={`py-2 rounded-lg text-xs font-bold transition duration-200 cursor-pointer ${
                            inputs.travel.executionType === 'internal'
                              ? 'bg-aimms-blue text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          Internal Team
                        </button>
                        <button
                          onClick={() => updateTravel('executionType', 'contractor')}
                          className={`py-2 rounded-lg text-xs font-bold transition duration-200 cursor-pointer ${
                            inputs.travel.executionType === 'contractor'
                              ? 'bg-aimms-blue text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          Contractor Crew
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Travelling field staff count
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={inputs.travel.travellingMembers}
                        onChange={(e) => updateTravel('travellingMembers', Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm md:text-base font-bold font-mono focus:outline-none focus:ring-2 focus:ring-aimms-blue/20 text-center"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 transition">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-tight block">
                        Nights
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={inputs.travel.accommodationNights}
                        onChange={(e) => updateTravel('accommodationNights', Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-white px-2 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm font-bold text-center font-mono focus:outline-none focus:ring-2 focus:ring-aimms-blue/20"
                      />
                    </div>

                    <div className="space-y-1.5 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 transition">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-tight block">
                        Days
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={inputs.travel.travelDays}
                        onChange={(e) => updateTravel('travelDays', Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-white px-2 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm font-bold text-center font-mono focus:outline-none focus:ring-2 focus:ring-aimms-blue/20"
                      />
                    </div>

                    <div className="space-y-1.5 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 transition">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-tight block">
                        Cargo ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={inputs.travel.equipmentTransportCost}
                        onChange={(e) => updateTravel('equipmentTransportCost', Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full bg-white px-2 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm font-bold text-center font-mono focus:outline-none focus:ring-2 focus:ring-aimms-blue/20"
                      />
                    </div>
                  </div>

                  {inputs.travel.executionType === 'contractor' && (
                    <div className="p-4 bg-rose-50/50 border border-rose-200/50 rounded-2xl space-y-2">
                      <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">Contractor Daily Rate</h4>
                      <p className="text-xs text-rose-700 leading-tight">Optionally specify contractor cost per day override</p>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-rose-600 font-mono text-sm font-bold">$</span>
                        <input
                          type="number"
                          placeholder="Daily contractor rate"
                          value={inputs.travel.contractorLabourCostOverride ?? ""}
                          onChange={(e) => updateTravel('contractorLabourCostOverride', parseFloat(e.target.value) || undefined)}
                          className="w-full pl-7 pr-3 py-2 border border-rose-200 rounded-lg text-slate-800 text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </fieldset>
              </section>

              {/* SECTION 5: Estimator / Client Meeting */}
              <section className="md:col-span-1 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900 transition-all duration-300 group-hover:bg-aimms-blue" />
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs font-bold shadow-2xs">
                      05
                    </span>
                    <h2 className="text-base font-display font-extrabold text-slate-900 tracking-tight">Client Meeting</h2>
                  </div>

                  {/* Required check toggle */}
                  <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Required?</span>
                    <button
                      onClick={() => updateMeeting('required', !inputs.meeting.required)}
                      className={`relative inline-flex h-4.5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        inputs.meeting.required ? 'bg-aimms-blue' : 'bg-slate-300'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        inputs.meeting.required ? 'translate-x-4.5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                {inputs.meeting.required ? (
                  <div className="space-y-4 animate-fade-in text-left">
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Estimator Travel Scenario
                      </label>
                      <div className="relative">
                        <select
                          value={inputs.meeting.travelScenarioId}
                          onChange={(e) => updateMeeting('travelScenarioId', e.target.value)}
                          className="w-full pl-3.5 pr-8 py-2.5 border border-slate-200 bg-white rounded-xl text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-aimms-blue/20 cursor-pointer appearance-none"
                        >
                          {LOCATION_ZONES.map(z => (
                            <option key={z.id} value={z.id}>{z.label}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                          <ChevronRight className="w-4 h-4 rotate-90" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Estimator Accommodation
                      </label>
                      <div className="relative">
                        <select
                          value={inputs.meeting.accommodationType}
                          onChange={(e) => updateMeeting('accommodationType', e.target.value as any)}
                          className="w-full pl-3.5 pr-8 py-2.5 border border-slate-200 bg-white rounded-xl text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-aimms-blue/20 cursor-pointer appearance-none"
                        >
                          <option value="none">No lodging ($0)</option>
                          <option value="team">Included in team Airbnb ($0)</option>
                          <option value="separate">Separate room (Zone rate)</option>
                        </select>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                          <ChevronRight className="w-4 h-4 rotate-90" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase block tracking-wider font-extrabold">
                        Meeting Allowance Days
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={inputs.meeting.dailyAllowanceDays}
                        onChange={(e) => updateMeeting('dailyAllowanceDays', Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm md:text-base font-bold font-mono text-center focus:outline-none focus:ring-2 focus:ring-aimms-blue/20"
                      />
                    </div>

                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-2xl p-5 text-center text-xs text-slate-500 italic border border-dashed border-slate-200 leading-relaxed">
                    No technical meeting or separate estimator allocation required. Click toggle to configure travel rates.
                  </div>
                )}
              </section>

              {/* Utility Clear section */}
              <div className="md:col-span-2 flex justify-start pt-2">
                <button
                  type="button"
                  onClick={handleResetCalculator}
                  className="px-6 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-bold transition flex items-center gap-2 cursor-pointer shadow-xs hover:shadow-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Clear / Reset Draft</span>
                </button>
              </div>

            </div>

            {/* RIGHT COLUMN: Sticky summary side-panel (Real-time estimate) */}
            <div className="lg:col-span-4 lg:sticky lg:top-8 space-y-6">

              <div className="bg-white border-2 border-slate-900 rounded-3xl shadow-xl overflow-y-auto flex flex-col lg:max-h-[calc(100vh-4rem)]">
                
                {/* Visual Header card decoration */}
                <div className="bg-aimms-dark text-white p-6 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold py-1 px-3 bg-aimms-blue text-white rounded-full font-mono uppercase tracking-wider">
                      Real-time Estimator
                    </span>
                    <Coins className="w-5 h-5 text-sky-400" />
                  </div>
                  <h3 className="font-display font-black text-xl text-white">
                    {inputs.projectInfo.name || "New Inspection Project"}
                  </h3>
                  <p className="text-slate-400 text-sm flex items-center gap-1 max-w-full font-semibold">
                    <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="flex min-w-0">
                      <span className="truncate">{inputs.projectInfo.address || "Address unspecified"}</span>
                      <span className="shrink-0">, {inputs.projectInfo.state}</span>
                    </span>
                  </p>
                </div>

                {/* Section: Complexity Score Factors */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
                  <div className="flex justify-between items-center text-xs text-slate-450 font-bold uppercase tracking-wider">
                    <span>Complexity scorecard</span>
                    <span className="font-mono text-xs text-slate-500">Totals</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-sm font-bold text-slate-750 text-slate-800 block">Total Complexity Factor:</span>
                      <p className="text-xs text-slate-400 mt-0.5 leading-tight font-medium">Derived from Base factor ({results.complexityBaseFactor.toFixed(2)}) + design adjustments</p>
                    </div>
                    <span className="text-xl font-display font-black text-slate-950 font-mono bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs shrink-0">
                      {results.totalFactor.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 gap-3">
                    <div>
                      <span className="text-sm font-extrabold text-slate-800 block">System Category Rank:</span>
                      <p className="text-xs text-slate-500 mt-0.5 leading-tight font-medium">Category multipliers apply to variable direct costs as safety overhead</p>
                    </div>
                    
                    {/* Badge Category */}
                    <div className={`px-4 py-2 rounded-xl border text-center flex flex-col items-center shadow-xs shrink-0 ${catRuleColor.color}`}>
                      <span className="text-lg font-black font-mono leading-none tracking-tight">
                        {results.category}
                      </span>
                      <span className="text-[10px] font-bold tracking-wider uppercase font-mono mt-1">
                        {results.categoryMultiplier > 1.0 ? `×${results.categoryMultiplier}` : '1.0x Rate'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section: Detailed Direct cost lines */}
                <div className="p-6 border-b border-slate-100 space-y-3.5">
                  <div className="flex justify-between items-center text-xs text-slate-450 font-bold uppercase tracking-wider">
                    <span>Opex breakdown</span>
                    <span className="font-mono text-xs text-slate-500">Subtotals</span>
                  </div>

                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-slate-650 flex items-center gap-1">
                      Preliminaries (Fixed Standard)
                      <button
                        onClick={() => setIsPrelimModalOpen(true)}
                        className="text-slate-400 hover:text-aimms-blue p-0.5 rounded transition cursor-pointer"
                        title="Click to view details or manual override tariff"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </span>
                    <span className="font-mono text-slate-800 font-bold">${results.preliminariesCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-slate-650">Inspection & Analysis:</span>
                    <span className="font-mono text-slate-800 font-bold">${results.totalExecutionCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-slate-650">NFC Tags ({inputs.execution.nfcFacadeCount} facade{inputs.execution.nfcFacadeCount === 1 ? '' : 's'}):</span>
                    <span className="font-mono text-slate-800 font-bold">${results.totalNfcTagsCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-slate-650">Travel Team & Contractor:</span>
                    <span className="font-mono text-slate-800 font-bold">${results.totalTravelCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  {inputs.meeting.required && (
                    <div className="flex justify-between text-sm font-medium border-b border-dashed border-slate-100 pb-2">
                      <span className="text-slate-650">Estimator Consultation meeting:</span>
                      <span className="font-mono text-slate-800 font-bold">${results.totalEstimatorCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-black pt-1.5 border-t border-slate-100 italic">
                    <span className="text-slate-705 text-slate-800">Total Direct Base Cost:</span>
                    <span className="font-mono text-slate-900">${results.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Section: Profit margin configuration & totals */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">

                  {/* Independent Markup / Gross Return inputs -- either, both, or neither */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-aimms-blue" />
                      Profit Margin(s)
                    </label>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Set either, both, or clear one to quote only the other method.
                    </p>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold text-aimms-blue uppercase tracking-wide">Markup %</span>
                          {inputs.markupPercent != null && (
                            <button
                              type="button"
                              onClick={() => setInputs(prev => ({ ...prev, markupPercent: null }))}
                              className="text-slate-300 hover:text-rose-500 cursor-pointer"
                              title="Clear Markup %"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          placeholder="—"
                          value={inputs.markupPercent ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setInputs(prev => ({
                              ...prev,
                              markupPercent: raw === '' ? null : Math.min(100, Math.max(0, parseInt(raw) || 0)),
                            }));
                          }}
                          className="w-full px-2 py-2 border border-slate-200 rounded-lg text-center font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-aimms-blue/20 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Gross Return %</span>
                          {inputs.grossReturnPercent != null && (
                            <button
                              type="button"
                              onClick={() => setInputs(prev => ({ ...prev, grossReturnPercent: null }))}
                              className="text-slate-300 hover:text-rose-500 cursor-pointer"
                              title="Clear Gross Return %"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <input
                          type="number"
                          min={0}
                          max={95}
                          placeholder="—"
                          value={inputs.grossReturnPercent ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setInputs(prev => ({
                              ...prev,
                              grossReturnPercent: raw === '' ? null : Math.min(95, Math.max(0, parseInt(raw) || 0)),
                            }));
                          }}
                          className="w-full px-2 py-2 border border-slate-200 rounded-lg text-center font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {markupScenario || grossScenario ? (
                    <div className="space-y-2">
                      {markupScenario && (
                        <div className="rounded-xl border border-aimms-blue/20 bg-white p-3 space-y-1 text-xs">
                          <div className="font-black text-aimms-blue uppercase tracking-wide text-[11px] pb-1 border-b border-aimms-blue/10">
                            Markup ({markupScenario.percent}% on Cost)
                          </div>
                          <div className="flex justify-between text-slate-600 font-mono">
                            <span>Profit:</span>
                            <span>+${markupScenario.profitAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-slate-600 font-mono">
                            <span>Subtotal:</span>
                            <span>${markupScenario.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-slate-600 font-mono">
                            <span>GST (10%):</span>
                            <span>+${markupScenario.gstAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      )}
                      {grossScenario && (
                        <div className="rounded-xl border border-emerald-600/20 bg-white p-3 space-y-1 text-xs">
                          <div className="font-black text-emerald-700 uppercase tracking-wide text-[11px] pb-1 border-b border-emerald-600/10">
                            Gross Return ({grossScenario.percent}% on Sale)
                          </div>
                          <div className="flex justify-between text-slate-600 font-mono">
                            <span>Profit:</span>
                            <span>+${grossScenario.profitAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-slate-600 font-mono">
                            <span>Subtotal:</span>
                            <span>${grossScenario.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-slate-600 font-mono">
                            <span>GST (10%):</span>
                            <span>+${grossScenario.gstAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic text-center py-3">
                      Set a Markup % or Gross Return % to see pricing.
                    </div>
                  )}

                  {/* HIGHLIGHTED TARGET COST CARD(S) */}
                  {(markupScenario || grossScenario) && (
                    <div className={`grid gap-3 ${markupScenario && grossScenario ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {markupScenario && (
                        <div className="bg-aimms-blue text-white rounded-2xl p-4 shadow-lg border border-aimms-blue/30">
                          <span className="text-[10px] text-sky-200 uppercase font-black tracking-wider block">
                            Final Price (Markup)
                          </span>
                          <p className="text-[10px] text-sky-100/75 leading-tight mt-0.5 font-medium">GST incl.</p>
                          <span className="text-xl font-mono font-black text-white block mt-1">
                            ${markupScenario.finalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      {grossScenario && (
                        <div className="bg-emerald-700 text-white rounded-2xl p-4 shadow-lg border border-emerald-700/30">
                          <span className="text-[10px] text-emerald-100 uppercase font-black tracking-wider block">
                            Final Price (Gross Return)
                          </span>
                          <p className="text-[10px] text-emerald-100/75 leading-tight mt-0.5 font-medium">GST incl.</p>
                          <span className="text-xl font-mono font-black text-white block mt-1">
                            ${grossScenario.finalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Section: Rates and Square meters breakdown metrics */}
                <div className="p-6 space-y-3 bg-white">
                  <div className="flex justify-between items-center text-xs text-slate-450 font-bold uppercase tracking-wider">
                    <span>Performance Rates per m²</span>
                    <span className="font-mono text-xs text-slate-500">
                      {results.totalFacadeArea > 0 ? `${results.totalFacadeArea.toLocaleString()} m²` : '— m²'}
                    </span>
                  </div>

                  {results.totalFacadeArea > 0 ? (
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-550 text-slate-500">Cost Rate / m²:</span>
                        <strong className="font-mono text-slate-800">${results.costPerM2.toFixed(2)} AUD/m²</strong>
                      </div>
                      {markupScenario && (
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-550 text-slate-500">Sale Rate / m² (Markup):</span>
                          <strong className="font-mono text-slate-800">${markupScenario.sellPricePerM2.toFixed(2)} AUD/m²</strong>
                        </div>
                      )}
                      {grossScenario && (
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-550 text-slate-500">Sale Rate / m² (Gross Return):</span>
                          <strong className="font-mono text-slate-800">${grossScenario.sellPricePerM2.toFixed(2)} AUD/m²</strong>
                        </div>
                      )}
                      {markupScenario && (
                        <div className="flex justify-between font-bold border-t border-slate-100 pt-2 text-slate-900 text-sm">
                          <span>Final Rate / m² (Markup, GST incl):</span>
                          <strong className="font-mono">${markupScenario.finalRatePerM2.toFixed(2)} AUD/m²</strong>
                        </div>
                      )}
                      {grossScenario && (
                        <div className="flex justify-between font-bold border-t border-slate-100 pt-2 text-slate-900 text-sm">
                          <span>Final Rate / m² (Gross Return, GST incl):</span>
                          <strong className="font-mono">${grossScenario.finalRatePerM2.toFixed(2)} AUD/m²</strong>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs sm:text-sm text-slate-400 py-1 italic block text-center">
                      Complete geometry parameters to map rate metrics.
                    </div>
                  )}
                </div>

                {/* Foot actionable save and exports */}
                <div className="bg-slate-50 p-5 border-t border-slate-100 grid grid-cols-1 gap-3">
                  <button
                    onClick={handleSaveQuote}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl text-sm font-bold transition shadow-xs cursor-pointer"
                  >
                    <Save className="w-4.5 h-4.5 text-emerald-400" />
                    <span>{editingId ? 'Update Estimate' : 'Save Estimate'}</span>
                  </button>
                  <button
                    onClick={() => {
                      if (results.totalFacadeArea <= 0) {
                        triggerNotification("Please enter geometry values before launching printable preview.", "error");
                        return;
                      }
                      if (!markupScenario && !grossScenario) {
                        triggerNotification("Please set a Markup % or Gross Return % before exporting.", "error");
                        return;
                      }
                      setIsPrintModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-150 border border-slate-300 text-slate-700 py-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer"
                  >
                    <Printer className="w-4.5 h-4.5 text-slate-500" />
                    <span>Export PDF Proposal</span>
                  </button>
                </div>

              </div>

            </div>

          </div>
        ) : activeTab === 'history' ? (
          /* HISTORIAL TABLE VIEW */
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 text-emerald-800 p-2 rounded-xl">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-black text-slate-900">Project History & Archives</h2>
                  <p className="text-xs text-slate-500">Stored estimates database (Quoted, Won, Lost, In Progress)</p>
                </div>
              </div>
            </div>

            {history.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-900 text-white font-mono font-bold text-[10px] tracking-wider uppercase">
                      <th className="p-3 pl-4">Details</th>
                      <th className="p-3">State</th>
                      <th className="p-3 text-right">Total Area</th>
                      <th className="p-3 text-right">Raw Cost</th>
                      <th className="p-3 text-right relative group/tip">
                        <span className="cursor-help">Markup %</span>
                        <FieldTooltip
                          align="left"
                          text="Markup % entered on this quote, applied on top of cost. Shows — if this method wasn't used for this quote."
                        />
                      </th>
                      <th className="p-3 text-right relative group/tip">
                        <span className="cursor-help">Gross Return %</span>
                        <FieldTooltip
                          align="left"
                          text="Gross Return % entered on this quote, applied as a share of the final sale price instead of on top of cost. Independent from Markup % -- shows — if this method wasn't used for this quote."
                        />
                      </th>
                      <th className="p-3 text-right relative group/tip">
                        <span className="cursor-help">Subtotal (Markup)</span>
                        <FieldTooltip
                          text="Net price before GST using this quote's Markup %: Total Cost + (Total Cost x Markup %). Shows — if no Markup % was set."
                        />
                      </th>
                      <th className="p-3 text-right relative group/tip">
                        <span className="cursor-help">Subtotal (Gross)</span>
                        <FieldTooltip
                          text="Net price before GST using this quote's Gross Return %, so the margin % lands on the final sale price instead of on cost. Shows — if no Gross Return % was set."
                        />
                      </th>
                      <th className="p-3 text-right relative group/tip">
                        <span className="cursor-help">Final Price (Markup)</span>
                        <FieldTooltip
                          text="Subtotal (Markup) plus 10% GST. Shows — if no Markup % was set on this quote."
                        />
                      </th>
                      <th className="p-3 text-right relative group/tip">
                        <span className="cursor-help">Final Price (Gross)</span>
                        <FieldTooltip
                          align="right"
                          text="Subtotal (Gross) plus 10% GST. Shows — if no Gross Return % was set on this quote."
                        />
                      </th>
                      <th className="p-3 text-center">Category</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map(quote => {
                      const quoteCat = CATEGORY_RULES.find(r => quote.category === r.category) || CATEGORY_RULES[2];
                      const quoteMarkup = quote.markupPercent != null
                        ? computeScenario('markup', quote.markupPercent, quote.totalCost, 0, quote.totalFacadeArea)
                        : null;
                      const quoteGross = quote.grossReturnPercent != null
                        ? computeScenario('gross', quote.grossReturnPercent, quote.totalCost, 0, quote.totalFacadeArea)
                        : null;
                      return (
                        <tr key={quote.id} className="hover:bg-slate-50/80 transition">
                          
                          {/* Date and Name */}
                          <td className="p-3 pl-4">
                            <div className="font-bold text-slate-900 text-sm">{quote.projectInfo.name}</div>
                            <div className="text-slate-400 text-[10px] flex items-center gap-1 font-semibold leading-none mt-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {quote.date} ({quote.month})
                            </div>
                            <div className="text-slate-500 font-semibold text-[10px] mt-0.5 max-w-xs overflow-hidden text-ellipsis">
                              {quote.projectInfo.address}
                            </div>
                          </td>

                          {/* State */}
                          <td className="p-3 font-semibold text-slate-600">
                            {quote.projectInfo.state}
                          </td>

                          {/* Total Facade Area */}
                          <td className="p-3 text-right font-mono text-slate-800 font-semibold">
                            {quote.totalFacadeArea.toLocaleString()} m²
                          </td>

                          {/* Total Cost */}
                          <td className="p-3 text-right font-mono text-slate-600">
                            ${quote.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Markup % */}
                          <td className="p-3 text-right font-mono text-slate-600">
                            {quote.markupPercent != null ? `${quote.markupPercent}%` : <span className="text-slate-300">—</span>}
                          </td>

                          {/* Gross Return % */}
                          <td className="p-3 text-right font-mono text-slate-600">
                            {quote.grossReturnPercent != null ? `${quote.grossReturnPercent}%` : <span className="text-slate-300">—</span>}
                          </td>

                          {/* Subtotal (Markup) */}
                          <td className="p-3 text-right font-mono text-slate-600">
                            {quoteMarkup ? `$${quoteMarkup.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-slate-300">—</span>}
                          </td>

                          {/* Subtotal (Gross Return) */}
                          <td className="p-3 text-right font-mono text-slate-600">
                            {quoteGross ? `$${quoteGross.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-slate-300">—</span>}
                          </td>

                          {/* Final Price (Markup) */}
                          <td className="p-3 text-right font-mono font-black text-slate-950 text-sm">
                            {quoteMarkup ? `$${quoteMarkup.finalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-slate-300">—</span>}
                          </td>

                          {/* Final Price (Gross Return) */}
                          <td className="p-3 text-right font-mono font-black text-slate-950 text-sm">
                            {quoteGross ? `$${quoteGross.finalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-slate-300">—</span>}
                          </td>

                          {/* Category Badge */}
                          <td className="p-3 text-center">
                            <span className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded ${quoteCat.color}`}>
                              {quote.category}
                            </span>
                          </td>

                          {/* Status Inline Changer */}
                          <td className="p-3 text-center">
                            <select
                              value={quote.status}
                              onChange={(e) => handleUpdateStatus(quote.id, e.target.value as any)}
                              className={`text-[11px] font-semibold tracking-wide rounded-lg px-2 py-1 focus:outline-none border font-semibold ${
                                quote.status === 'Won' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                quote.status === 'Lost' ? 'bg-rose-50 text-rose-700 border-rose-250 border-rose-200' :
                                quote.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              <option value="Quoted">Quoted</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Won">Won</option>
                              <option value="Lost">Lost</option>
                            </select>
                          </td>

                          {/* Row Actions */}
                          <td className="p-3 text-center pr-4">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleLoadQuote(quote)}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                title="Load/Edit Estimate"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDuplicateQuote(quote)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Duplicate"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteQuote(quote.id, quote.projectInfo.name)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border border-dashed border-slate-200 text-center py-12 rounded-2xl bg-slate-50 text-slate-400 font-medium">
                <History className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-sm">No saved estimates found in archives.</p>
                <p className="text-xs text-slate-500 mt-1">Estimations you model and output get listed here for quick retrieval</p>
              </div>
            )}
          </div>
        ) : (
          <SettingsPanel config={config} onSave={handleSaveConfig} readOnly={!isAdmin} />
        )}

      </main>

      {isAdminModalOpen && <AdminLogin onClose={() => setIsAdminModalOpen(false)} />}

      {/* MODALS */}
      <PreliminariesModal
        isOpen={isPrelimModalOpen}
        onClose={() => setIsPrelimModalOpen(false)}
        customPrelims={customPrelims}
        onOverride={(val) => setCustomPrelims(val)}
        onReset={() => setCustomPrelims(preliminariesDefault)}
        defaultPrelims={preliminariesDefault}
        detailsA={prelimDetailsAWithCosts}
        detailsB={prelimDetailsBWithCosts}
        subtotalA={prelimBreakdown.subtotalA}
        contingencyA={prelimBreakdown.contingencyA}
        totalA={prelimBreakdown.totalA}
        totalB={prelimBreakdown.totalB}
      />

      {(markupScenario || grossScenario) && (
        <PrintQuotePreview
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          inputs={inputs}
          results={results}
          scenario={(markupScenario ?? grossScenario)!}
          quoteId={editingId || `draft-${Date.now()}`}
        />
      )}

    </div>
  );
}
