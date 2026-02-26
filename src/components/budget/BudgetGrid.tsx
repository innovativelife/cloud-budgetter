import { useMemo } from 'react';
import { useAppState } from '../../context/AppContext';
import { calculateMonthCost } from '../../utils/calculations';
import { formatCurrency } from '../../utils/formatters';
import type { Service, ServiceBudget, BudgetFieldKey } from '../../types';

interface BudgetGridProps {
  serviceId: string;
  service: Service;
  serviceBudget: ServiceBudget;
  monthLabels: string[];
}

interface FieldDef {
  key: BudgetFieldKey;
  label: string;
  min: number;
  step: string;
  suffix: string;
}

const FIELDS: FieldDef[] = [
  { key: 'consumption', label: 'Consumption', min: 0, step: 'any', suffix: '' },
  { key: 'efficiency', label: 'Efficiency %', min: 1, step: '1', suffix: '' },
  { key: 'overhead', label: 'Overhead %', min: 0, step: '1', suffix: '' },
  { key: 'discount', label: 'Discount %', min: 0, step: '1', suffix: '' },
];

export function BudgetGrid({ serviceId, service, serviceBudget, monthLabels }: BudgetGridProps) {
  const { dispatch } = useAppState();

  const visibleFields = FIELDS.filter(
    (f) => f.key !== 'discount' || service.discountEligible
  );

  const monthlyCosts = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => {
      const entry = serviceBudget[m];
      return calculateMonthCost(
        entry.consumption.value,
        service.unitCost,
        entry.efficiency.value,
        entry.overhead.value,
        entry.discount.value,
        service.discountEligible
      );
    });
  }, [serviceBudget, service]);

  const annualTotal = monthlyCosts.reduce((sum, c) => sum + c, 0);

  function handleChange(monthIndex: number, field: BudgetFieldKey, rawValue: string) {
    const value = parseFloat(rawValue);
    if (isNaN(value)) return;
    dispatch({
      type: 'SET_BUDGET_FIELD',
      payload: { serviceId, monthIndex, field, value },
    });
  }

  function handleClearOverride(monthIndex: number, field: BudgetFieldKey) {
    dispatch({
      type: 'CLEAR_OVERRIDE',
      payload: { serviceId, monthIndex, field },
    });
  }

  // Compute row totals / averages for each field
  function getFieldSummary(field: BudgetFieldKey): string {
    const values = Array.from({ length: 12 }, (_, m) => serviceBudget[m][field].value);
    if (field === 'consumption') {
      return values.reduce((s, v) => s + v, 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
    }
    // For percentages, show average
    const avg = values.reduce((s, v) => s + v, 0) / 12;
    return avg.toFixed(1);
  }

  function getFieldSummaryLabel(field: BudgetFieldKey): string {
    return field === 'consumption' ? 'Total' : 'Avg';
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex">
        {/* Pinned left column - field labels */}
        <div className="shrink-0 w-36 border-r border-gray-200 bg-gray-50 z-10">
          {/* Header cell */}
          <div className="h-11 flex items-center px-4 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Field</span>
          </div>
          {/* Field label rows */}
          {visibleFields.map((f) => (
            <div key={f.key} className="h-12 flex items-center px-4 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-700">{f.label}</span>
            </div>
          ))}
          {/* Cost label row */}
          <div className="h-12 flex items-center px-4 bg-blue-50">
            <span className="text-sm font-semibold text-blue-800">Monthly Cost</span>
          </div>
        </div>

        {/* Scrollable middle - month columns */}
        <div className="flex-1 overflow-x-auto">
          <div className="inline-flex min-w-full">
            {Array.from({ length: 12 }, (_, monthIdx) => (
              <div key={monthIdx} className="w-[120px] shrink-0 border-r border-gray-100 last:border-r-0">
                {/* Month header */}
                <div className="h-11 flex items-center justify-center border-b border-gray-200 bg-gray-50">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {monthLabels[monthIdx]}
                  </span>
                </div>
                {/* Field inputs */}
                {visibleFields.map((f) => {
                  const fieldData = serviceBudget[monthIdx][f.key];
                  const isOverridden = fieldData.isOverridden && monthIdx > 0;
                  return (
                    <div
                      key={f.key}
                      className="h-12 flex items-center px-1.5 border-b border-gray-100"
                    >
                      <div className="relative flex-1">
                        <input
                          type="number"
                          value={fieldData.value}
                          onChange={(e) => handleChange(monthIdx, f.key, e.target.value)}
                          min={f.min}
                          step={f.step}
                          className={`w-full border rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            isOverridden
                              ? 'border-amber-300 bg-amber-50'
                              : 'border-gray-200 bg-white'
                          }`}
                        />
                      </div>
                      {monthIdx > 0 && (
                        <button
                          type="button"
                          onClick={() => isOverridden && handleClearOverride(monthIdx, f.key)}
                          title={isOverridden ? 'Click to reset to Month 1 value' : 'Inherited from Month 1'}
                          className={`ml-1 w-4 h-4 shrink-0 flex items-center justify-center rounded-full text-[7px] font-bold ${
                            isOverridden
                              ? 'bg-amber-200 text-amber-700 hover:bg-amber-300 cursor-pointer'
                              : 'bg-blue-100 text-blue-400 cursor-default'
                          }`}
                        >
                          {isOverridden ? 'C' : 'A'}
                        </button>
                      )}
                    </div>
                  );
                })}
                {/* Cost display */}
                <div className="h-12 flex items-center justify-end px-3 bg-blue-50">
                  <span className="text-sm font-semibold text-blue-900">
                    {formatCurrency(monthlyCosts[monthIdx])}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pinned right column - totals */}
        <div className="shrink-0 w-32 border-l border-gray-300 bg-gray-50 z-10">
          {/* Header cell */}
          <div className="h-11 flex items-center justify-center border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Summary</span>
          </div>
          {/* Field summary rows */}
          {visibleFields.map((f) => (
            <div key={f.key} className="h-12 flex items-center justify-end px-3 border-b border-gray-100">
              <span className="text-[10px] text-gray-400 mr-1.5">{getFieldSummaryLabel(f.key)}</span>
              <span className="text-sm font-medium text-gray-700">{getFieldSummary(f.key)}</span>
            </div>
          ))}
          {/* Annual total */}
          <div className="h-12 flex items-center justify-end px-3 bg-blue-100">
            <span className="text-sm font-bold text-blue-900">{formatCurrency(annualTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
