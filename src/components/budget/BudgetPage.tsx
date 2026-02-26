import { useState } from 'react';
import { useAppState } from '../../context/AppContext';
import { generateMonthLabels } from '../../utils/months';
import { BudgetGrid } from './BudgetGrid';

const MONTH_OPTIONS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function BudgetPage() {
  const { state, dispatch } = useAppState();
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    state.services[0]?.id ?? ''
  );

  const monthLabels = generateMonthLabels(
    state.budgetConfig.startMonth,
    state.budgetConfig.startYear
  );

  const selectedService = state.services.find((s) => s.id === selectedServiceId);
  const serviceBudget = selectedService ? state.budgetData[selectedService.id] : null;

  // Sync selected service if it was deleted
  if (selectedServiceId && !selectedService && state.services.length > 0) {
    setSelectedServiceId(state.services[0].id);
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Monthly Budget</h2>
        <p className="text-sm text-gray-500 mt-1">
          Enter estimates for each service by month. Month 1 values propagate to all months.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Start Month</label>
          <select
            value={state.budgetConfig.startMonth}
            onChange={(e) =>
              dispatch({
                type: 'SET_BUDGET_CONFIG',
                payload: { ...state.budgetConfig, startMonth: parseInt(e.target.value) },
              })
            }
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MONTH_OPTIONS.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Start Year</label>
          <select
            value={state.budgetConfig.startYear}
            onChange={(e) =>
              dispatch({
                type: 'SET_BUDGET_CONFIG',
                payload: { ...state.budgetConfig, startYear: parseInt(e.target.value) },
              })
            }
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Service</label>
          <select
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {state.services.length === 0 && (
              <option value="">No services configured</option>
            )}
            {state.services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        {selectedService && (
          <div className="ml-auto text-xs text-gray-500">
            Unit: <span className="font-medium text-gray-700">{selectedService.unitType}</span>
            <span className="mx-2 text-gray-300">|</span>
            Cost/unit: <span className="font-medium text-gray-700">${selectedService.unitCost}</span>
          </div>
        )}
      </div>

      {state.services.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">Configure services first on the Services tab.</p>
        </div>
      ) : selectedService && serviceBudget ? (
        <div>
          <BudgetGrid
            serviceId={selectedService.id}
            service={selectedService}
            serviceBudget={serviceBudget}
            monthLabels={monthLabels}
          />
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-400 inline-flex items-center justify-center text-[7px] font-bold">A</span>
              Auto (inherited from Month 1)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-700 inline-flex items-center justify-center text-[7px] font-bold">C</span>
              Custom override (click to reset)
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
