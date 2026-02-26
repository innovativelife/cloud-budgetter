import { useState, useEffect } from 'react';
import type { Service } from '../../types';

export interface InitialBudgetSeed {
  consumption: number;
  monthlyGrowth: number;
}

interface ServiceFormModalProps {
  service: Service | null;
  onSave: (data: Omit<Service, 'id' | 'createdAt'>, seed?: InitialBudgetSeed) => void;
  onClose: () => void;
}

export function ServiceFormModal({ service, onSave, onClose }: ServiceFormModalProps) {
  const [name, setName] = useState('');
  const [unitType, setUnitType] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [discountEligible, setDiscountEligible] = useState(false);
  const [defaultEfficiency, setDefaultEfficiency] = useState('80');
  const [defaultOverhead, setDefaultOverhead] = useState('10');
  const [initialConsumption, setInitialConsumption] = useState('');
  const [monthlyGrowth, setMonthlyGrowth] = useState('0');

  useEffect(() => {
    if (service) {
      setName(service.name);
      setUnitType(service.unitType);
      setUnitCost(String(service.unitCost));
      setDiscountEligible(service.discountEligible);
      setDefaultEfficiency(String(service.defaultEfficiency));
      setDefaultOverhead(String(service.defaultOverhead));
    }
  }, [service]);

  const unitCostChanged = service != null && unitCost !== '' && parseFloat(unitCost) !== service.unitCost;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cost = parseFloat(unitCost);
    const efficiency = parseFloat(defaultEfficiency);
    const overhead = parseFloat(defaultOverhead);

    if (!name.trim() || isNaN(cost) || cost <= 0) return;
    if (isNaN(efficiency) || efficiency < 1 || efficiency > 100) return;
    if (isNaN(overhead) || overhead < 0) return;

    const consumption = parseFloat(initialConsumption) || 0;
    const growth = parseFloat(monthlyGrowth) || 0;

    const seed: InitialBudgetSeed | undefined =
      !service && consumption > 0
        ? { consumption, monthlyGrowth: growth }
        : undefined;

    onSave({
      name: name.trim(),
      unitType: unitType.trim(),
      unitCost: cost,
      discountEligible,
      defaultEfficiency: efficiency,
      defaultOverhead: overhead,
    }, seed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {service ? 'Edit Service' : 'Add Service'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. AWS Lambda"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit Type</label>
            <input
              type="text"
              value={unitType}
              onChange={(e) => setUnitType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. million invocations, GB storage"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Unit Cost ($)</label>
              {unitCostChanged && (
                <button
                  type="button"
                  onClick={() => setUnitCost(String(service.unitCost))}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Undo (was ${service.unitCost})
                </button>
              )}
            </div>
            <input
              type="number"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                unitCostChanged ? 'border-amber-400 bg-amber-50' : 'border-gray-300'
              }`}
              placeholder="0.00"
              step="any"
              min="0"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Efficiency %</label>
              <input
                type="number"
                value={defaultEfficiency}
                onChange={(e) => setDefaultEfficiency(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Overhead %</label>
              <input
                type="number"
                value={defaultOverhead}
                onChange={(e) => setDefaultOverhead(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
              />
            </div>
          </div>
          {!service && (
            <>
              <div className="border-t border-gray-200 pt-4 mt-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Initial Budget Seed</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Month Consumption</label>
                    <input
                      type="number"
                      value={initialConsumption}
                      onChange={(e) => setInitialConsumption(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                      step="any"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Growth</label>
                    <input
                      type="number"
                      value={monthlyGrowth}
                      onChange={(e) => setMonthlyGrowth(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                      step="any"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Added to consumption each month</p>
                  </div>
                </div>
              </div>
            </>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="discountEligible"
              checked={discountEligible}
              onChange={(e) => setDiscountEligible(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="discountEligible" className="text-sm text-gray-700">
              Eligible for discount
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              {service ? 'Save Changes' : 'Add Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
