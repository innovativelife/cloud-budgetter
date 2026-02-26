import { useMemo, useState } from 'react';
import { useAppState } from '../../context/AppContext';
import { calculateMonthCost } from '../../utils/calculations';
import { generateMonthLabels } from '../../utils/months';
import { formatCurrency } from '../../utils/formatters';
import { BudgetAdjustModal } from '../budget/BudgetAdjustModal';
import { ServiceFormModal } from '../services/ServiceFormModal';
import type { Service } from '../../types';

const SERVICE_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-violet-500', 'bg-cyan-500', 'bg-orange-500', 'bg-teal-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-lime-500', 'bg-fuchsia-500',
];

type SummaryTab = 'chart' | 'details';

export function SummaryPage() {
  const { activeModel, dispatch } = useAppState();
  const services = activeModel?.data.services ?? [];
  const budgetConfig = activeModel?.data.budgetConfig ?? { startMonth: 0, startYear: 2026 };
  const budgetData = activeModel?.data.budgetData ?? {};
  const [activeTab, setActiveTab] = useState<SummaryTab>('chart');
  const [adjustServiceId, setAdjustServiceId] = useState<string | null>(null);
  const [showAddService, setShowAddService] = useState(false);

  const monthLabels = generateMonthLabels(budgetConfig.startMonth, budgetConfig.startYear);

  const { costGrid, costByService, costByMonth, grandTotal } = useMemo(() => {
    const grid: Record<string, number[]> = {};
    const byService: Record<string, number> = {};
    const byMonth: number[] = Array(12).fill(0);
    let total = 0;

    for (const service of services) {
      const serviceBudget = budgetData[service.id];
      if (!serviceBudget) continue;

      grid[service.id] = [];
      byService[service.id] = 0;

      for (let m = 0; m < 12; m++) {
        const entry = serviceBudget[m];
        const cost = calculateMonthCost(
          entry.consumption.value,
          service.unitCost,
          entry.efficiency.value,
          entry.overhead.value,
          entry.discount.value,
          service.discountEligible
        );
        grid[service.id][m] = cost;
        byService[service.id] += cost;
        byMonth[m] += cost;
        total += cost;
      }
    }

    return { costGrid: grid, costByService: byService, costByMonth: byMonth, grandTotal: total };
  }, [services, budgetData]);

  function handleAddService(data: Omit<Service, 'id' | 'createdAt'>) {
    dispatch({ type: 'ADD_SERVICE', payload: data });
    setShowAddService(false);
  }

  const heading = (
    <h2 className="text-xl font-semibold text-gray-900 mb-4">Budget Summary</h2>
  );

  const addServiceModal = showAddService && (
    <ServiceFormModal
      service={null}
      onSave={handleAddService}
      onClose={() => setShowAddService(false)}
    />
  );

  if (services.length === 0) {
    return (
      <div>
        {heading}
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">No services configured yet.</p>
          <button
            onClick={() => setShowAddService(true)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Add your first service
          </button>
        </div>
        {addServiceModal}
      </div>
    );
  }

  const maxMonthCost = Math.max(...costByMonth, 1);

  return (
    <div>
      {heading}

      {/* Grand Total */}
      <div className="mb-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-sm text-blue-600 font-medium">Annual Budget Total</div>
        <div className="text-3xl font-bold text-blue-900 mt-1">{formatCurrency(grandTotal)}</div>
        <div className="text-sm text-blue-600 mt-1">
          Avg. {formatCurrency(grandTotal / 12)} / month
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex space-x-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('chart')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'chart'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Chart
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'details'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Details
        </button>
      </div>

      {activeTab === 'chart' && (
        <div>
          {/* Stacked Bar Chart */}
          <div className="mb-8">
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {services.map((service, idx) => (
                <button
                  key={service.id}
                  onClick={() => setAdjustServiceId(service.id)}
                  className="flex items-center gap-1.5 text-xs text-gray-700 hover:text-blue-600 transition-colors"
                >
                  <span className={`w-3 h-3 rounded-sm inline-block ${SERVICE_COLORS[idx % SERVICE_COLORS.length]}`} />
                  <span className="underline decoration-gray-300 hover:decoration-blue-500 underline-offset-2">{service.name}</span>
                </button>
              ))}
              <button
                onClick={() => setShowAddService(true)}
                className="text-xs text-gray-500 hover:text-blue-600 border border-dashed border-gray-300 hover:border-blue-400 rounded px-2 py-0.5 transition-colors"
              >
                + add service
              </button>
            </div>

            {/* Chart */}
            <div className="flex items-end gap-2 px-2">
              {costByMonth.map((monthTotal, monthIdx) => {
                return (
                  <div key={monthIdx} className="flex-1 flex flex-col items-center">
                    <div className="text-[10px] text-gray-600 mb-1 whitespace-nowrap">
                      {monthTotal > 0 ? formatCurrency(monthTotal) : '\u00A0'}
                    </div>
                    <div className="w-full h-72 flex flex-col justify-end">
                      {services.map((service, svcIdx) => {
                        const cost = costGrid[service.id]?.[monthIdx] ?? 0;
                        if (cost <= 0) return null;
                        const heightPct = (cost / maxMonthCost) * 100;
                        const isFirst = svcIdx === services.findIndex((s) => (costGrid[s.id]?.[monthIdx] ?? 0) > 0);
                        return (
                          <div
                            key={service.id}
                            className={`w-full ${SERVICE_COLORS[svcIdx % SERVICE_COLORS.length]} ${isFirst ? 'rounded-t' : ''}`}
                            style={{ height: `${Math.max(heightPct, 0.5)}%` }}
                            title={`${service.name}: ${formatCurrency(cost)}`}
                          />
                        );
                      })}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">{monthLabels[monthIdx].split(' ')[0]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'details' && (
        <div>
          {/* By Service table */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Annual</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Service</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600">Annual Total</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600">Monthly Avg</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {services.map((service, idx) => {
                    const svcTotal = costByService[service.id] ?? 0;
                    const pct = grandTotal > 0 ? (svcTotal / grandTotal) * 100 : 0;
                    return (
                      <tr key={service.id} className="hover:bg-gray-50">
                        <td className="py-2 px-3 font-medium text-gray-900">
                          <button
                            onClick={() => setAdjustServiceId(service.id)}
                            className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                          >
                            <span className={`w-3 h-3 rounded-sm inline-block ${SERVICE_COLORS[idx % SERVICE_COLORS.length]}`} />
                            <span className="underline decoration-gray-300 hover:decoration-blue-500 underline-offset-2">{service.name}</span>
                          </button>
                        </td>
                        <td className="py-2 px-3 text-right">{formatCurrency(svcTotal)}</td>
                        <td className="py-2 px-3 text-right text-gray-600">{formatCurrency(svcTotal / 12)}</td>
                        <td className="py-2 px-3 text-right text-gray-600">{pct.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-semibold">
                    <td className="py-2 px-3">Total</td>
                    <td className="py-2 px-3 text-right">{formatCurrency(grandTotal)}</td>
                    <td className="py-2 px-3 text-right">{formatCurrency(grandTotal / 12)}</td>
                    <td className="py-2 px-3 text-right">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Monthly Breakdown table */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Monthly</h3>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600 sticky left-0 bg-white min-w-[120px]">
                      Service
                    </th>
                    {monthLabels.map((label, i) => (
                      <th key={i} className="text-right py-2 px-2 font-medium text-gray-600 min-w-[90px]">
                        {label}
                      </th>
                    ))}
                    <th className="text-right py-2 px-2 font-medium text-gray-600 min-w-[100px] sticky right-0 bg-white">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {services.map((service, idx) => (
                    <tr key={service.id} className="hover:bg-gray-50">
                      <td className="py-2 px-2 font-medium text-gray-900 sticky left-0 bg-white">
                        <button
                          onClick={() => setAdjustServiceId(service.id)}
                          className="flex items-center gap-1.5 hover:text-blue-600 transition-colors"
                        >
                          <span className={`w-2.5 h-2.5 rounded-sm inline-block shrink-0 ${SERVICE_COLORS[idx % SERVICE_COLORS.length]}`} />
                          <span className="underline decoration-gray-300 hover:decoration-blue-500 underline-offset-2">{service.name}</span>
                        </button>
                      </td>
                      {(costGrid[service.id] ?? []).map((cost, i) => (
                        <td key={i} className="py-2 px-2 text-right text-gray-700">
                          {formatCurrency(cost)}
                        </td>
                      ))}
                      <td className="py-2 px-2 text-right font-semibold sticky right-0 bg-white">
                        {formatCurrency(costByService[service.id] ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-semibold">
                    <td className="py-2 px-2 sticky left-0 bg-white">Total</td>
                    {costByMonth.map((cost, i) => (
                      <td key={i} className="py-2 px-2 text-right">{formatCurrency(cost)}</td>
                    ))}
                    <td className="py-2 px-2 text-right sticky right-0 bg-white">{formatCurrency(grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {adjustServiceId && (() => {
        const svc = services.find((s) => s.id === adjustServiceId);
        const sb = svc ? budgetData[svc.id] : null;
        if (!svc || !sb) return null;
        return (
          <BudgetAdjustModal
            serviceId={svc.id}
            service={svc}
            serviceBudget={sb}
            monthLabels={monthLabels}
            onClose={() => setAdjustServiceId(null)}
          />
        );
      })()}

      {addServiceModal}
    </div>
  );
}
