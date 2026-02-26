import { useMemo, useState } from 'react';
import { useAppState } from '../../context/AppContext';
import { calculateMonthCost } from '../../utils/calculations';
import { generateMonthLabels } from '../../utils/months';
import { formatCurrency } from '../../utils/formatters';
import { BudgetAdjustModal } from '../budget/BudgetAdjustModal';
import { ServiceFormModal } from '../services/ServiceFormModal';
import { SERVICE_COLORS, getServiceColor } from '../../utils/serviceColors';
import type { Service } from '../../types';

type SummaryTab = 'chart' | 'annual' | 'monthly';

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

  const heading = null;

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
      <div className="mb-4 px-4 py-2.5 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-4">
        <span className="text-xs text-blue-600 font-medium">Annual Total</span>
        <span className="text-xl font-bold text-blue-900">{formatCurrency(grandTotal)}</span>
        <span className="text-xs text-blue-500">Avg. {formatCurrency(grandTotal / 12)} / mo</span>
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
          onClick={() => setActiveTab('annual')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'annual'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Annual
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'monthly'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Monthly
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
                    <div className="h-3 mb-1" />
                    <div className="w-full h-72 flex flex-col justify-end">
                      {services.map((service, svcIdx) => {
                        const cost = costGrid[service.id]?.[monthIdx] ?? 0;
                        if (cost <= 0) return null;
                        const heightPct = (cost / maxMonthCost) * 100;
                        const isFirst = svcIdx === services.findIndex((s) => (costGrid[s.id]?.[monthIdx] ?? 0) > 0);
                        return (
                          <div
                            key={service.id}
                            onClick={() => setAdjustServiceId(service.id)}
                            className={`w-full cursor-pointer hover:opacity-80 transition-opacity ${SERVICE_COLORS[svcIdx % SERVICE_COLORS.length]} ${isFirst ? 'rounded-t' : ''}`}
                            style={{ height: `${Math.max(heightPct, 0.5)}%` }}
                            title={`${service.name}: ${formatCurrency(cost)}`}
                          />
                        );
                      })}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">{monthLabels[monthIdx].split(' ')[0]}</div>
                    <div className="text-[10px] text-gray-700 font-medium tabular-nums whitespace-nowrap">
                      {monthTotal > 0 ? formatCurrency(monthTotal) : '\u00A0'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'annual' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-100">
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-blue-800 uppercase tracking-wider">Service</th>
                <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-blue-800 uppercase tracking-wider">Annual Total</th>
                <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-blue-800 uppercase tracking-wider">Monthly Avg</th>
                <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-blue-800 uppercase tracking-wider">% of Total</th>
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
      )}

      {activeTab === 'monthly' && (
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr className="bg-blue-100">
                <th className="text-left py-2.5 px-2 text-[11px] font-semibold text-blue-800 uppercase tracking-wider sticky left-0 bg-blue-100 min-w-[120px]">
                  Service
                </th>
                {monthLabels.map((label, i) => (
                  <th key={i} className="text-right py-2.5 px-2 text-[11px] font-semibold text-blue-800 uppercase tracking-wider min-w-[90px]">
                    {label}
                  </th>
                ))}
                <th className="text-right py-2.5 px-2 text-[11px] font-semibold text-blue-800 uppercase tracking-wider min-w-[100px] sticky right-0 bg-blue-100">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {services.map((service, idx) => {
                const costs = costGrid[service.id] ?? [];
                const minCost = Math.min(...costs);
                const maxCost = Math.max(...costs);
                const range = maxCost - minCost;
                return (
                  <tr key={service.id}>
                    <td className="py-2 px-2 font-medium text-gray-900 sticky left-0 bg-white">
                      <button
                        onClick={() => setAdjustServiceId(service.id)}
                        className="flex items-center gap-1.5 hover:text-blue-600 transition-colors"
                      >
                        <span className={`w-2.5 h-2.5 rounded-sm inline-block shrink-0 ${SERVICE_COLORS[idx % SERVICE_COLORS.length]}`} />
                        <span className="underline decoration-gray-300 hover:decoration-blue-500 underline-offset-2">{service.name}</span>
                      </button>
                    </td>
                    {costs.map((cost, i) => {
                      const t = range > 0 ? (cost - minCost) / range : 0;
                      // green (low) -> yellow (mid) -> red (high)
                      const r = t < 0.5 ? Math.round(220 + (240 - 220) * (t * 2)) : 245;
                      const g = t < 0.5 ? 240 : Math.round(240 - (240 - 220) * ((t - 0.5) * 2));
                      const b = 220;
                      return (
                        <td
                          key={i}
                          className="py-2 px-2 text-right text-gray-700"
                          style={{ backgroundColor: cost > 0 ? `rgb(${r},${g},${b})` : undefined }}
                        >
                          {formatCurrency(cost)}
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 text-right font-semibold sticky right-0 bg-white">
                      {formatCurrency(costByService[service.id] ?? 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 font-semibold">
                <td className="py-2 px-2 sticky left-0 bg-white">Total</td>
                {(() => {
                  const minTotal = Math.min(...costByMonth);
                  const maxTotal = Math.max(...costByMonth);
                  const totalRange = maxTotal - minTotal;
                  return costByMonth.map((cost, i) => {
                    const t = totalRange > 0 ? (cost - minTotal) / totalRange : 0;
                    const r = t < 0.5 ? Math.round(220 + (240 - 220) * (t * 2)) : 245;
                    const g = t < 0.5 ? 240 : Math.round(240 - (240 - 220) * ((t - 0.5) * 2));
                    const b = 220;
                    return (
                      <td
                        key={i}
                        className="py-2 px-2 text-right"
                        style={{ backgroundColor: cost > 0 ? `rgb(${r},${g},${b})` : undefined }}
                      >
                        {formatCurrency(cost)}
                      </td>
                    );
                  });
                })()}
                <td className="py-2 px-2 text-right sticky right-0 bg-white">{formatCurrency(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {adjustServiceId && (() => {
        const svcIdx = services.findIndex((s) => s.id === adjustServiceId);
        const svc = svcIdx >= 0 ? services[svcIdx] : null;
        const sb = svc ? budgetData[svc.id] : null;
        if (!svc || !sb) return null;
        return (
          <BudgetAdjustModal
            serviceId={svc.id}
            service={svc}
            serviceBudget={sb}
            monthLabels={monthLabels}
            color={getServiceColor(svcIdx)}
            onClose={() => setAdjustServiceId(null)}
          />
        );
      })()}

      {addServiceModal}
    </div>
  );
}
