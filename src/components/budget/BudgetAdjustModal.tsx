import { useState, useCallback, useReducer, useEffect, useMemo } from 'react';
import { useAppState } from '../../context/AppContext';
import { DraggableFieldChart } from './DraggableFieldChart';
import { calculateMonthCost } from '../../utils/calculations';
import { formatCurrency } from '../../utils/formatters';
import type { Service, ServiceBudget, BudgetFieldKey } from '../../types';

interface BudgetAdjustModalProps {
  serviceId: string;
  service: Service;
  serviceBudget: ServiceBudget;
  monthLabels: string[];
  color?: string;
  onClose: () => void;
}

type ModalTab = 'visual' | 'table' | 'calcs';
type VisualField = 'consumption' | 'efficiency';

function computeAnnualCost(serviceBudget: ServiceBudget, service: Service): number {
  let total = 0;
  for (let m = 0; m < 12; m++) {
    const e = serviceBudget[m];
    total += calculateMonthCost(
      e.consumption.value, service.unitCost,
      e.efficiency.value, e.overhead.value,
      e.discount.value, service.discountEligible
    );
  }
  return total;
}

function computeMonthlyCosts(serviceBudget: ServiceBudget, service: Service): number[] {
  return Array.from({ length: 12 }, (_, m) => {
    const e = serviceBudget[m];
    return calculateMonthCost(
      e.consumption.value, service.unitCost,
      e.efficiency.value, e.overhead.value,
      e.discount.value, service.discountEligible
    );
  });
}

function deepCloneBudget(sb: ServiceBudget): ServiceBudget {
  const clone: ServiceBudget = {};
  for (let i = 0; i < 12; i++) {
    clone[i] = {
      consumption: { ...sb[i].consumption },
      efficiency: { ...sb[i].efficiency },
      overhead: { ...sb[i].overhead },
      discount: { ...sb[i].discount },
    };
  }
  return clone;
}

// --- Local editing state with undo/redo as a single reducer ---

interface EditState {
  current: ServiceBudget;
  undoStack: ServiceBudget[];
  redoStack: ServiceBudget[];
  preChange: ServiceBudget | null;
}

type EditAction =
  | { type: 'SET_VALUE'; monthIndex: number; field: BudgetFieldKey; value: number }
  | { type: 'SET_FIELD_COMMIT'; monthIndex: number; field: BudgetFieldKey; value: number }
  | { type: 'CLEAR_OVERRIDE'; monthIndex: number; field: BudgetFieldKey }
  | { type: 'BULK_ADJUST'; field: BudgetFieldKey; fromMonth: number; multiplier: number; min: number; compound: boolean }
  | { type: 'COMMIT' }
  | { type: 'UNDO' }
  | { type: 'REDO' };

function applyFieldChange(current: ServiceBudget, monthIndex: number, field: BudgetFieldKey, value: number): ServiceBudget {
  const next = deepCloneBudget(current);
  next[monthIndex][field] = { value, isOverridden: monthIndex > 0 };
  if (monthIndex === 0) {
    for (let i = 1; i < 12; i++) {
      if (!next[i][field].isOverridden) {
        next[i][field] = { value, isOverridden: false };
      }
    }
  }
  return next;
}

function editReducer(state: EditState, action: EditAction): EditState {
  switch (action.type) {
    case 'SET_VALUE': {
      const { monthIndex, field, value } = action;
      const preChange = state.preChange ?? deepCloneBudget(state.current);
      const next = applyFieldChange(state.current, monthIndex, field, value);
      return { ...state, current: next, preChange };
    }
    case 'SET_FIELD_COMMIT': {
      const { monthIndex, field, value } = action;
      const snapshot = deepCloneBudget(state.current);
      const next = applyFieldChange(state.current, monthIndex, field, value);
      return {
        current: next,
        undoStack: [...state.undoStack, snapshot],
        redoStack: [],
        preChange: null,
      };
    }
    case 'CLEAR_OVERRIDE': {
      const { monthIndex, field } = action;
      if (monthIndex === 0) return state;
      const snapshot = deepCloneBudget(state.current);
      const next = deepCloneBudget(state.current);
      const sourceValue = next[0][field].value;
      next[monthIndex][field] = { value: sourceValue, isOverridden: false };
      return {
        current: next,
        undoStack: [...state.undoStack, snapshot],
        redoStack: [],
        preChange: null,
      };
    }
    case 'BULK_ADJUST': {
      const { field, fromMonth, multiplier, min, compound } = action;
      const snapshot = deepCloneBudget(state.current);
      const next = deepCloneBudget(state.current);
      for (let m = fromMonth; m < 12; m++) {
        const base = next[m][field].value;
        const compoundMultiplier = compound ? Math.pow(multiplier, m - fromMonth + 1) : multiplier;
        const newVal = Math.max(min, Math.round(base * compoundMultiplier));
        next[m][field] = { value: newVal, isOverridden: m > 0 };
      }
      return {
        current: next,
        undoStack: [...state.undoStack, snapshot],
        redoStack: [],
        preChange: null,
      };
    }
    case 'COMMIT': {
      if (!state.preChange) return state;
      return {
        current: state.current,
        undoStack: [...state.undoStack, state.preChange],
        redoStack: [],
        preChange: null,
      };
    }
    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const newUndo = [...state.undoStack];
      const prev = newUndo.pop()!;
      return {
        current: prev,
        undoStack: newUndo,
        redoStack: [...state.redoStack, deepCloneBudget(state.current)],
        preChange: null,
      };
    }
    case 'REDO': {
      if (state.redoStack.length === 0) return state;
      const newRedo = [...state.redoStack];
      const next = newRedo.pop()!;
      return {
        current: next,
        undoStack: [...state.undoStack, deepCloneBudget(state.current)],
        redoStack: newRedo,
        preChange: null,
      };
    }
  }
}

// --- Table grid fields ---

interface FieldDef {
  key: BudgetFieldKey;
  label: string;
  min: number;
  step: string;
}

const FIELDS: FieldDef[] = [
  { key: 'consumption', label: 'Consumption', min: 0, step: 'any' },
  { key: 'efficiency', label: 'Efficiency %', min: 1, step: '1' },
  { key: 'overhead', label: 'Overhead %', min: 0, step: '1' },
  { key: 'discount', label: 'Discount %', min: 0, step: '1' },
];

export function BudgetAdjustModal({
  serviceId,
  service,
  serviceBudget,
  monthLabels,
  color,
  onClose,
}: BudgetAdjustModalProps) {
  const { dispatch } = useAppState();
  const [modalTab, setModalTab] = useState<ModalTab>('visual');
  const [visualField, setVisualField] = useState<VisualField>('consumption');
  const [unitCostInput, setUnitCostInput] = useState(String(service.unitCost));
  const localUnitCost = parseFloat(unitCostInput) || 0;

  const [editState, editDispatch] = useReducer(editReducer, serviceBudget, (sb) => ({
    current: deepCloneBudget(sb),
    undoStack: [],
    redoStack: [],
    preChange: null,
  }));

  const localBudget = editState.current;
  const canUndo = editState.undoStack.length > 0;
  const canRedo = editState.redoStack.length > 0;

  const localService = useMemo(
    () => ({ ...service, unitCost: localUnitCost }),
    [service, localUnitCost]
  );

  const [initialCost] = useState(() => computeAnnualCost(serviceBudget, service));
  const [initialMonthlyCosts] = useState(() => computeMonthlyCosts(serviceBudget, service));

  const currentCost = computeAnnualCost(localBudget, localService);
  const currentMonthlyCosts = computeMonthlyCosts(localBudget, localService);

  const delta = currentCost - initialCost;
  const deltaPct = initialCost !== 0 ? (delta / initialCost) * 100 : 0;

  // Visual tab callbacks
  const handleValueChange = useCallback((monthIndex: number, field: BudgetFieldKey, value: number) => {
    editDispatch({ type: 'SET_VALUE', monthIndex, field, value });
  }, []);

  const handleCommit = useCallback(() => {
    editDispatch({ type: 'COMMIT' });
  }, []);

  const handleBulkAdjust = useCallback((field: BudgetFieldKey, fromMonth: number, multiplier: number, min: number, compound: boolean) => {
    editDispatch({ type: 'BULK_ADJUST', field, fromMonth, multiplier, min, compound });
  }, []);

  const handleUndo = useCallback(() => {
    editDispatch({ type: 'UNDO' });
  }, []);

  const handleRedo = useCallback(() => {
    editDispatch({ type: 'REDO' });
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  function handleOK() {
    dispatch({
      type: 'SET_SERVICE_BUDGET',
      payload: { serviceId, serviceBudget: localBudget },
    });
    if (localUnitCost !== service.unitCost) {
      dispatch({
        type: 'UPDATE_SERVICE',
        payload: { ...service, unitCost: localUnitCost },
      });
    }
    onClose();
  }

  function handleCancel() {
    onClose();
  }

  // Table tab: track raw input while editing
  const [editingCell, setEditingCell] = useState<{ month: number; field: BudgetFieldKey; raw: string } | null>(null);

  function handleTableChange(monthIndex: number, field: BudgetFieldKey, rawValue: string) {
    setEditingCell({ month: monthIndex, field, raw: rawValue });
    const value = parseFloat(rawValue);
    if (!isNaN(value)) {
      editDispatch({ type: 'SET_FIELD_COMMIT', monthIndex, field, value });
    }
  }

  function handleTableBlur(monthIndex: number, field: BudgetFieldKey) {
    if (editingCell?.month === monthIndex && editingCell?.field === field) {
      // If left empty, reset to 0
      if (editingCell.raw === '' || isNaN(parseFloat(editingCell.raw))) {
        editDispatch({ type: 'SET_FIELD_COMMIT', monthIndex, field, value: 0 });
      }
      setEditingCell(null);
    }
  }


  const visibleFields = FIELDS.filter(
    (f) => f.key !== 'discount' || service.discountEligible
  );

  const annualTotal = useMemo(
    () => currentMonthlyCosts.reduce((s, c) => s + c, 0),
    [currentMonthlyCosts]
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={handleCancel}>
      <div
        className="bg-white rounded-xl shadow-2xl w-[92vw] max-w-6xl mx-4 h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-0 border-b border-gray-200 shrink-0">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                {color && <span className={`w-3.5 h-3.5 rounded-sm inline-block shrink-0 ${color}`} />}
                {service.name}
              </h2>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>Unit: <span className="font-medium text-gray-700">{service.unitType}</span></span>
                <span className="text-gray-300">|</span>
                <span className="flex items-center gap-1">Cost/unit: $
                  <input
                    type="number"
                    value={unitCostInput}
                    onChange={(e) => setUnitCostInput(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    min="0"
                    step="any"
                    className="w-20 border border-gray-300 rounded px-1.5 py-0.5 text-xs font-medium text-gray-700 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={handleUndo}
                  disabled={!canUndo}
                  title="Undo (Ctrl+Z)"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
                  </svg>
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!canRedo}
                  title="Redo (Ctrl+Shift+Z)"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2M21 10l-4-4M21 10l-4 4" />
                  </svg>
                </button>
              </div>
              <button onClick={handleCancel} className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Impact summary strip */}
          <div className="flex items-center gap-6 mt-3 mb-3 px-4 py-2.5 bg-gray-50 rounded-lg text-sm">
            <div>
              <div className="text-[10px] text-gray-400 uppercase font-semibold">Before</div>
              <div className="font-semibold text-gray-700">{formatCurrency(initialCost)}</div>
            </div>
            <div className="text-gray-300">&rarr;</div>
            <div>
              <div className="text-[10px] text-gray-400 uppercase font-semibold">Now</div>
              <div className="font-semibold text-gray-700">{formatCurrency(currentCost)}</div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-[10px] text-gray-400 uppercase font-semibold">Impact</div>
              <div className={`font-semibold ${
                delta === 0 ? 'text-gray-400' : delta > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {delta === 0 ? (
                  'No change'
                ) : (
                  <>
                    {delta > 0 ? '+' : ''}{formatCurrency(delta)}
                    <span className="text-xs font-normal ml-1.5">
                      ({delta > 0 ? '+' : ''}{deltaPct.toFixed(1)}%)
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Main tabs */}
          <div className="flex gap-1 -mb-px">
            {([['visual', 'Vis Edit'], ['table', 'Tab Edit'], ['calcs', 'Table']] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setModalTab(id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  modalTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* === TABLE TAB === */}
          {modalTab === 'table' && (
            <div className="flex flex-col h-full">
              <div className="flex shrink-0">
                {/* Pinned left column */}
                <div className="shrink-0 w-32 border-r border-gray-200 bg-gray-50 z-10">
                  <div className="h-9 flex items-center px-3 bg-blue-100">
                    <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">Field</span>
                  </div>
                  {visibleFields.map((f) => (
                    <div key={f.key} className="h-10 flex items-center px-3 border-b border-gray-100">
                      <span className="text-xs font-medium text-gray-700">{f.label}</span>
                    </div>
                  ))}
                  <div className="h-10 flex items-center px-3 bg-blue-50">
                    <span className="text-xs font-semibold text-blue-800">Cost</span>
                  </div>
                </div>

                {/* Scrollable month columns */}
                <div className="flex-1 overflow-x-auto">
                  <div className="inline-flex min-w-full">
                    {Array.from({ length: 12 }, (_, monthIdx) => (
                      <div key={monthIdx} className="w-[120px] shrink-0 border-r border-gray-100 last:border-r-0">
                        <div className="h-9 flex items-center justify-center bg-blue-100">
                          <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">
                            {monthLabels[monthIdx]}
                          </span>
                        </div>
                        {visibleFields.map((f, fieldIdx) => {
                          const fieldData = localBudget[monthIdx][f.key];
                          const isEditing = editingCell?.month === monthIdx && editingCell?.field === f.key;
                          return (
                            <div key={f.key} className="h-10 flex items-center px-1 border-b border-gray-100">
                              <input
                                type="number"
                                tabIndex={fieldIdx * 12 + monthIdx + 1}
                                value={isEditing ? editingCell.raw : fieldData.value}
                                onChange={(e) => handleTableChange(monthIdx, f.key, e.target.value)}
                                onFocus={(e) => {
                                  setEditingCell({ month: monthIdx, field: f.key, raw: String(fieldData.value) });
                                  e.target.select();
                                }}
                                onBlur={() => handleTableBlur(monthIdx, f.key)}
                                min={f.min}
                                step={f.step}
                                className="w-full border border-gray-200 bg-white rounded px-1.5 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          );
                        })}
                        {(() => {
                          const cost = currentMonthlyCosts[monthIdx];
                          const costs = currentMonthlyCosts;
                          const minC = Math.min(...costs);
                          const maxC = Math.max(...costs);
                          const range = maxC - minC;
                          const t = range > 0 ? (cost - minC) / range : 0;
                          const r = t < 0.5 ? Math.round(220 + (240 - 220) * (t * 2)) : 245;
                          const g = t < 0.5 ? 240 : Math.round(240 - (240 - 220) * ((t - 0.5) * 2));
                          const b = 220;
                          return (
                            <div className="h-10 flex items-center justify-end px-2" style={{ backgroundColor: cost > 0 ? `rgb(${r},${g},${b})` : undefined }}>
                              <span className="text-xs font-semibold text-gray-800">
                                {formatCurrency(cost)}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pinned right column */}
                <div className="shrink-0 w-36 border-l border-gray-300 bg-gray-50 z-10">
                  <div className="h-9 flex items-center justify-center bg-blue-100">
                    <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">Summary</span>
                  </div>
                  {visibleFields.map((f) => {
                    const values = Array.from({ length: 12 }, (_, m) => localBudget[m][f.key].value);
                    const summary = f.key === 'consumption'
                      ? values.reduce((s, v) => s + v, 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
                      : (values.reduce((s, v) => s + v, 0) / 12).toFixed(1);
                    const summaryLabel = f.key === 'consumption' ? 'Total' : 'Avg';
                    return (
                      <div key={f.key} className="h-10 flex items-center justify-end px-3 border-b border-gray-100">
                        <span className="text-[10px] text-gray-400 mr-1.5">{summaryLabel}</span>
                        <span className="text-xs font-medium text-gray-700">{summary}</span>
                      </div>
                    );
                  })}
                  <div className="h-10 flex items-center justify-end px-3 bg-blue-100">
                    <span className="text-xs font-bold text-blue-900">{formatCurrency(annualTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Mini bar chart */}
              {(() => {
                const maxCost = Math.max(...currentMonthlyCosts, 1);
                return (
                  <div className="flex-1 min-h-0 px-4 py-4 border-t border-gray-200">
                    <div className="flex items-end gap-2 h-full">
                      {currentMonthlyCosts.map((cost, i) => {
                        const heightPct = (cost / maxCost) * 100;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                            <div className="text-[9px] text-gray-500 mb-0.5 tabular-nums">
                              {cost > 0 ? formatCurrency(cost) : ''}
                            </div>
                            <div
                              className={`w-full rounded-t ${color || 'bg-blue-400'}`}
                              style={{ height: `${Math.max(heightPct, 1)}%`, opacity: 0.7 }}
                            />
                            <div className="text-[9px] text-gray-400 mt-1">
                              {monthLabels[i].split(' ')[0].slice(0, 3)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* === VISUAL TAB === */}
          {modalTab === 'visual' && (
            <div className="px-6 py-5">
              {/* Visual sub-tabs */}
              <div className="flex gap-1.5 mb-4">
                <button
                  onClick={() => setVisualField('consumption')}
                  className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                    visualField === 'consumption'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400 hover:text-gray-700'
                  }`}
                >
                  Consumption
                </button>
                <button
                  onClick={() => setVisualField('efficiency')}
                  className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                    visualField === 'efficiency'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400 hover:text-gray-700'
                  }`}
                >
                  Efficiency
                </button>
              </div>

              {visualField === 'consumption' && (
                <DraggableFieldChart
                  serviceBudget={localBudget}
                  monthLabels={monthLabels}
                  field="consumption"
                  label="Monthly Consumption"
                  unit={service.unitType}
                  color={color ?? 'bg-blue-400'}
                  min={0}
                  onValueChange={handleValueChange}
                  onCommit={handleCommit}
                  onBulkAdjust={handleBulkAdjust}
                />
              )}
              {visualField === 'efficiency' && (
                <DraggableFieldChart
                  serviceBudget={localBudget}
                  monthLabels={monthLabels}
                  field="efficiency"
                  label="Efficiency %"
                  unit="%"
                  color={color ?? 'bg-emerald-400'}
                  min={1}
                  formatValue={(v) => `${v}%`}
                  onValueChange={handleValueChange}
                  onCommit={handleCommit}
                  onBulkAdjust={handleBulkAdjust}
                />
              )}
            </div>
          )}

          {/* === TABLE (CALCS) TAB === */}
          {modalTab === 'calcs' && (
            <div className="px-6 py-5">
              <div className="overflow-x-auto">
                <table className="w-full text-xs tabular-nums">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-1.5 px-2 font-medium text-gray-500 sticky left-0 bg-white min-w-[110px]">
                        &nbsp;
                      </th>
                      {monthLabels.map((label, i) => (
                        <th key={i} className="text-right py-1.5 px-2 font-medium text-gray-500 min-w-[80px]">
                          {label.split(' ')[0].slice(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <tr>
                      <td className="py-1.5 px-2 text-gray-600 sticky left-0 bg-white">Consumption</td>
                      {Array.from({ length: 12 }, (_, i) => (
                        <td key={i} className="py-1.5 px-2 text-right text-gray-700">
                          {localBudget[i].consumption.value.toLocaleString()}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 text-gray-600 sticky left-0 bg-white">Unit Cost</td>
                      {Array.from({ length: 12 }, (_, i) => (
                        <td key={i} className="py-1.5 px-2 text-right text-gray-400">
                          ${localUnitCost}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 text-gray-600 sticky left-0 bg-white">Efficiency %</td>
                      {Array.from({ length: 12 }, (_, i) => (
                        <td key={i} className="py-1.5 px-2 text-right text-gray-700">
                          {localBudget[i].efficiency.value}%
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 text-gray-600 sticky left-0 bg-white">Overhead %</td>
                      {Array.from({ length: 12 }, (_, i) => (
                        <td key={i} className="py-1.5 px-2 text-right text-gray-700">
                          {localBudget[i].overhead.value}%
                        </td>
                      ))}
                    </tr>
                    {service.discountEligible && (
                      <tr>
                        <td className="py-1.5 px-2 text-gray-600 sticky left-0 bg-white">Discount %</td>
                        {Array.from({ length: 12 }, (_, i) => (
                          <td key={i} className="py-1.5 px-2 text-right text-gray-700">
                            {localBudget[i].discount.value}%
                          </td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200">
                      <td className="py-2 px-2 font-semibold text-gray-800 sticky left-0 bg-white">Cost</td>
                      {currentMonthlyCosts.map((cost, i) => (
                        <td key={i} className="py-2 px-2 text-right font-semibold text-gray-800">
                          {formatCurrency(cost)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-1 px-2 text-gray-500 sticky left-0 bg-white">Change</td>
                      {currentMonthlyCosts.map((cost, i) => {
                        const monthDelta = cost - initialMonthlyCosts[i];
                        return (
                          <td key={i} className={`py-1 px-2 text-right font-medium ${
                            monthDelta === 0 ? 'text-gray-300' : monthDelta > 0 ? 'text-red-500' : 'text-green-600'
                          }`}>
                            {monthDelta === 0 ? '-' : `${monthDelta > 0 ? '+' : ''}${formatCurrency(monthDelta)}`}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-400">
            Changes are previewed here. Click OK to apply or Cancel to discard.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleOK}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
