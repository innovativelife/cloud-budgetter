import { useState, useCallback, useReducer, useEffect } from 'react';
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
  onClose: () => void;
}

type AdjustTab = 'consumption' | 'efficiency';

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
  | { type: 'COMMIT' }
  | { type: 'UNDO' }
  | { type: 'REDO' };

function editReducer(state: EditState, action: EditAction): EditState {
  switch (action.type) {
    case 'SET_VALUE': {
      const { monthIndex, field, value } = action;
      const preChange = state.preChange ?? deepCloneBudget(state.current);
      const next = deepCloneBudget(state.current);
      next[monthIndex][field] = { value, isOverridden: monthIndex > 0 };
      if (monthIndex === 0) {
        for (let i = 1; i < 12; i++) {
          if (!next[i][field].isOverridden) {
            next[i][field] = { value, isOverridden: false };
          }
        }
      }
      return { ...state, current: next, preChange };
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

export function BudgetAdjustModal({
  serviceId,
  service,
  serviceBudget,
  monthLabels,
  onClose,
}: BudgetAdjustModalProps) {
  const { dispatch } = useAppState();
  const [activeTab, setActiveTab] = useState<AdjustTab>('consumption');

  const [editState, editDispatch] = useReducer(editReducer, serviceBudget, (sb) => ({
    current: deepCloneBudget(sb),
    undoStack: [],
    redoStack: [],
    preChange: null,
  }));

  const localBudget = editState.current;
  const canUndo = editState.undoStack.length > 0;
  const canRedo = editState.redoStack.length > 0;

  // Capture the cost at modal open for delta display
  const [initialCost] = useState(() => computeAnnualCost(serviceBudget, service));
  const [initialMonthlyCosts] = useState(() => computeMonthlyCosts(serviceBudget, service));

  // Live cost from the local buffer
  const currentCost = computeAnnualCost(localBudget, service);
  const currentMonthlyCosts = computeMonthlyCosts(localBudget, service);

  const delta = currentCost - initialCost;
  const deltaPct = initialCost !== 0 ? (delta / initialCost) * 100 : 0;

  const handleValueChange = useCallback((monthIndex: number, field: BudgetFieldKey, value: number) => {
    editDispatch({ type: 'SET_VALUE', monthIndex, field, value });
  }, []);

  const handleCommit = useCallback(() => {
    editDispatch({ type: 'COMMIT' });
  }, []);

  const handleUndo = useCallback(() => {
    editDispatch({ type: 'UNDO' });
  }, []);

  const handleRedo = useCallback(() => {
    editDispatch({ type: 'REDO' });
  }, []);

  // Keyboard shortcuts: Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z = redo
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
    onClose();
  }

  function handleCancel() {
    onClose();
  }

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
              <h2 className="text-lg font-semibold text-gray-900">Visual Adjust</h2>
              <p className="text-sm text-gray-500">{service.name}</p>
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

          {/* Tabs */}
          <div className="flex gap-1 -mb-px">
            <button
              onClick={() => setActiveTab('consumption')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'consumption'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Consumption
            </button>
            <button
              onClick={() => setActiveTab('efficiency')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'efficiency'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Efficiency
            </button>
          </div>
        </div>

        {/* Chart content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeTab === 'consumption' && (
            <DraggableFieldChart
              serviceBudget={localBudget}
              monthLabels={monthLabels}
              field="consumption"
              label="Monthly Consumption"
              unit={service.unitType}
              color="bg-blue-400"
              hoverColor="bg-blue-500"
              min={0}
              onValueChange={handleValueChange}
              onCommit={handleCommit}
            />
          )}
          {activeTab === 'efficiency' && (
            <DraggableFieldChart
              serviceBudget={localBudget}
              monthLabels={monthLabels}
              field="efficiency"
              label="Efficiency %"
              unit="%"
              color="bg-emerald-400"
              hoverColor="bg-emerald-500"
              min={1}
              formatValue={(v) => `${v}%`}
              onValueChange={handleValueChange}
              onCommit={handleCommit}
            />
          )}

          {/* Per-month calculation breakdown */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Monthly Calculation</div>
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
                        ${service.unitCost}
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
