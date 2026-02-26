import { useState } from 'react';
import { useAppState } from '../../context/AppContext';
import { generateMonthLabels } from '../../utils/months';
import { BudgetGrid } from './BudgetGrid';
import { BudgetAdjustModal } from './BudgetAdjustModal';
import { Select } from '../shared/Select';
import { getServiceColor } from '../../utils/serviceColors';

const MONTH_OPTIONS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
].map((m, i) => ({ value: String(i), label: m }));

export function BudgetPage() {
  const { activeModel, dispatch } = useAppState();
  const services = activeModel?.data.services ?? [];
  const budgetConfig = activeModel?.data.budgetConfig ?? { startMonth: 0, startYear: 2026 };
  const budgetData = activeModel?.data.budgetData ?? {};

  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    services[0]?.id ?? ''
  );
  const [showAdjust, setShowAdjust] = useState(false);

  const monthLabels = generateMonthLabels(budgetConfig.startMonth, budgetConfig.startYear);

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const serviceBudget = selectedService ? budgetData[selectedService.id] : null;

  // Sync selected service if it was deleted
  if (selectedServiceId && !selectedService && services.length > 0) {
    setSelectedServiceId(services[0].id);
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: String(currentYear + i),
    label: String(currentYear + i),
  }));

  const serviceOptions = services.length > 0
    ? services.map((s) => ({ value: s.id, label: s.name }))
    : [{ value: '', label: 'No services configured' }];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Monthly Budget</h2>
        <p className="text-sm text-gray-500 mt-1">
          Enter estimates for each service by month. Month 1 values propagate to all months.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="w-40">
          <label className="block text-xs font-medium text-gray-600 mb-1">Start Month</label>
          <Select
            value={String(budgetConfig.startMonth)}
            options={MONTH_OPTIONS}
            onChange={(v) =>
              dispatch({
                type: 'SET_BUDGET_CONFIG',
                payload: { ...budgetConfig, startMonth: parseInt(v) },
              })
            }
          />
        </div>
        <div className="w-28">
          <label className="block text-xs font-medium text-gray-600 mb-1">Start Year</label>
          <Select
            value={String(budgetConfig.startYear)}
            options={yearOptions}
            onChange={(v) =>
              dispatch({
                type: 'SET_BUDGET_CONFIG',
                payload: { ...budgetConfig, startYear: parseInt(v) },
              })
            }
          />
        </div>
        <div className="w-56">
          <label className="block text-xs font-medium text-gray-600 mb-1">Service</label>
          <Select
            value={selectedServiceId}
            options={serviceOptions}
            onChange={setSelectedServiceId}
            placeholder="Select a service..."
          />
        </div>
        {selectedService && (
          <div className="ml-auto flex items-center gap-3">
            <div className="text-xs text-gray-500">
              Unit: <span className="font-medium text-gray-700">{selectedService.unitType}</span>
              <span className="mx-2 text-gray-300">|</span>
              Cost/unit: <span className="font-medium text-gray-700">${selectedService.unitCost}</span>
            </div>
            <button
              onClick={() => setShowAdjust(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Visual Adjust
            </button>
          </div>
        )}
      </div>

      {services.length === 0 ? (
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

      {showAdjust && selectedService && serviceBudget && (
        <BudgetAdjustModal
          serviceId={selectedService.id}
          service={selectedService}
          serviceBudget={serviceBudget}
          monthLabels={monthLabels}
          color={getServiceColor(services.findIndex((s) => s.id === selectedService.id))}
          onClose={() => setShowAdjust(false)}
        />
      )}
    </div>
  );
}
