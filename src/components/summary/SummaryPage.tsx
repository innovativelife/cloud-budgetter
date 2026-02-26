import { useMemo, useState } from 'react';
import { useAppState } from '../../context/AppContext';
import { calculateMonthCost } from '../../utils/calculations';
import { generateMonthLabels } from '../../utils/months';
import { formatCurrency } from '../../utils/formatters';
import { BudgetAdjustModal } from '../budget/BudgetAdjustModal';
import { ServiceFormModal } from '../services/ServiceFormModal';
import type { InitialBudgetSeed } from '../services/ServiceFormModal';
import { SERVICE_COLORS, getServiceColor } from '../../utils/serviceColors';
import { exportExcelReport } from '../../utils/excelExport';
import type { Service } from '../../types';

const FILL_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#f43f5e',
  '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6',
  '#ec4899', '#6366f1', '#84cc16', '#d946ef',
];

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

  function handleAddService(data: Omit<Service, 'id' | 'createdAt'>, seed?: InitialBudgetSeed) {
    dispatch({ type: 'ADD_SERVICE', payload: data, seed });
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

  const deltaByMonth = costByMonth.map((cost, i) => i === 0 ? 0 : cost - costByMonth[i - 1]);

  // green (low) -> yellow (mid) -> red (high)
  function heatColor(value: number, min: number, max: number): string | undefined {
    const range = max - min;
    if (range <= 0 || value <= 0) return undefined;
    const t = (value - min) / range;
    const r = t < 0.5 ? Math.round(220 + (240 - 220) * (t * 2)) : 245;
    const g = t < 0.5 ? 240 : Math.round(240 - (240 - 220) * ((t - 0.5) * 2));
    return `rgb(${r},${g},220)`;
  }

  // green (negative/good) -> neutral -> red (positive/bad) for deltas
  function deltaColor(value: number, minD: number, maxD: number): string | undefined {
    if (value === 0 && minD === 0 && maxD === 0) return undefined;
    const range = maxD - minD;
    if (range === 0) return undefined;
    const t = (value - minD) / range;
    const r = Math.round(220 + 25 * t);
    const g = Math.round(240 - 20 * t);
    return `rgb(${r},${g},220)`;
  }

  return (
    <div>
      {heading}

      {/* Grand Total */}
      <div className="mb-4 px-4 py-2.5 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-4">
        <span className="text-xs text-blue-600 font-medium">Annual Total</span>
        <span className="text-xl font-bold text-blue-900">{formatCurrency(grandTotal)}</span>
        <span className="text-xs text-blue-500">Avg. {formatCurrency(grandTotal / 12)} / mo</span>
        <button
          onClick={() => activeModel && exportExcelReport(activeModel)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-100 font-medium rounded-md transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Export .xlsx
        </button>
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
          Forecast
        </button>
        <button
          onClick={() => setActiveTab('annual')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'annual'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Breakdown
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'monthly'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Timeline
        </button>
      </div>

      {activeTab === 'chart' && (() => {
        const minMonth = Math.min(...costByMonth);
        const maxMonth = Math.max(...costByMonth);
        const deltas = deltaByMonth.slice(1);
        const minDelta = Math.min(...deltas);
        const maxDelta = Math.max(...deltas);

        // Area chart geometry
        const chartW = 800;
        const chartH = 288;
        const padL = 60;
        const padR = 10;
        const padT = 10;
        const padB = 4;
        const plotW = chartW - padL - padR;
        const plotH = chartH - padT - padB;
        const yMax = Math.max(...costByMonth, 1);

        // Build cumulative stacks per month
        const stacks: number[][] = Array.from({ length: 12 }, () => [0]);
        for (const service of services) {
          for (let m = 0; m < 12; m++) {
            const prev = stacks[m][stacks[m].length - 1];
            stacks[m].push(prev + (costGrid[service.id]?.[m] ?? 0));
          }
        }

        const xForMonth = (m: number) => padL + (m / 11) * plotW;
        const yForValue = (v: number) => padT + plotH - (v / yMax) * plotH;

        // Monotone cubic spline — attempt a Catmull-Rom-style smooth path through points
        function smoothLine(pts: [number, number][]): string {
          if (pts.length < 2) return '';
          if (pts.length === 2) return `M${pts[0][0]},${pts[0][1]}L${pts[1][0]},${pts[1][1]}`;
          let d = `M${pts[0][0]},${pts[0][1]}`;
          for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[Math.max(i - 1, 0)];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = pts[Math.min(i + 2, pts.length - 1)];
            const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
            const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
            const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
            const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
            d += `C${cp1x},${cp1y},${cp2x},${cp2y},${p2[0]},${p2[1]}`;
          }
          return d;
        }

        // Y-axis ticks — choose a round interval based on data magnitude
        const niceIntervals = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000, 2000000, 5000000];
        const targetTicks = 5;
        const rawInterval = yMax / targetTicks;
        const tickInterval = niceIntervals.find(n => n >= rawInterval) ?? Math.ceil(rawInterval / 1000000) * 1000000;
        const yTicks: number[] = [];
        for (let v = 0; v <= yMax; v += tickInterval) {
          yTicks.push(v);
        }
        // Compact label: $1K, $10K, $1.5M etc.
        function compactCurrency(v: number): string {
          if (v === 0) return '$0';
          if (v >= 1000000) return `$${(v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1)}M`;
          if (v >= 1000) return `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K`;
          return `$${v}`;
        }

        return (
        <div>
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

            {/* Area Chart */}
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ aspectRatio: `${chartW} / ${chartH}` }}>
              {/* Horizontal grid lines */}
              {yTicks.map((tick, i) => {
                const y = yForValue(tick);
                return (
                  <g key={i}>
                    <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="#6b7280" strokeWidth={0.5} strokeDasharray="4 3" opacity={0.4} />
                    <text x={padL - 6} y={y + 3} textAnchor="end" fontSize={9} fill="#6b7280">
                      {compactCurrency(tick)}
                    </text>
                  </g>
                );
              })}

              {/* Stacked areas — render bottom-to-top (last service on top) */}
              {services.map((service, svcIdx) => {
                const layerIdx = svcIdx + 1;
                const topPts: [number, number][] = Array.from({ length: 12 }, (_, m) =>
                  [xForMonth(m), yForValue(stacks[m][layerIdx])]
                );
                const bottomPts: [number, number][] = Array.from({ length: 12 }, (_, m) =>
                  [xForMonth(11 - m), yForValue(stacks[11 - m][svcIdx])]
                );
                const topD = smoothLine(topPts);
                const bottomD = smoothLine(bottomPts);
                // Connect top curve to bottom curve to form a closed area
                const areaD = `${topD}L${bottomPts[0][0]},${bottomPts[0][1]}${bottomD.slice(bottomD.indexOf('C'))}Z`;
                return (
                  <path
                    key={service.id}
                    d={areaD}
                    fill={FILL_COLORS[svcIdx % FILL_COLORS.length]}
                    fillOpacity={0.75}
                    stroke={FILL_COLORS[svcIdx % FILL_COLORS.length]}
                    strokeWidth={1}
                    className="cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setAdjustServiceId(service.id)}
                  >
                    <title>{service.name}: {formatCurrency(costByService[service.id] ?? 0)} / yr</title>
                  </path>
                );
              }).reverse()}

              {/* Vertical month markers — drawn over areas so they're visible */}
              {Array.from({ length: 12 }, (_, m) => (
                <line key={m} x1={xForMonth(m)} y1={padT} x2={xForMonth(m)} y2={padT + plotH} stroke="#6b7280" strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
              ))}

              {/* Total line on top */}
              <path
                d={smoothLine(costByMonth.map((cost, m): [number, number] => [xForMonth(m), yForValue(cost)]))}
                fill="none"
                stroke="#1e3a5f"
                strokeWidth={2}
                strokeLinejoin="round"
              />
            </svg>

            {/* Month labels, totals, deltas — positioned to match SVG data points */}
            <div className="relative" style={{ height: '3.25rem' }}>
              {costByMonth.map((monthTotal, monthIdx) => {
                const delta = deltaByMonth[monthIdx];
                const xPct = (xForMonth(monthIdx) / chartW) * 100;
                return (
                  <div
                    key={monthIdx}
                    className="absolute flex flex-col items-center"
                    style={{ left: `${xPct}%`, transform: 'translateX(-50%)' }}
                  >
                    <div className="text-[10px] text-gray-500 mt-1">{monthLabels[monthIdx].split(' ')[0]}</div>
                    <div
                      className="text-[10px] text-gray-700 font-medium tabular-nums whitespace-nowrap rounded px-0.5"
                      style={{ backgroundColor: heatColor(monthTotal, minMonth, maxMonth) }}
                    >
                      {monthTotal > 0 ? formatCurrency(monthTotal) : '\u00A0'}
                    </div>
                    <div
                      className="text-[10px] tabular-nums whitespace-nowrap rounded px-0.5 mt-0.5"
                      style={{
                        backgroundColor: monthIdx > 0 ? deltaColor(delta, minDelta, maxDelta) : undefined,
                        color: monthIdx === 0 ? 'transparent' : delta > 0 ? '#b91c1c' : delta < 0 ? '#15803d' : '#6b7280',
                      }}
                    >
                      {monthIdx === 0 ? '\u00A0' : `${delta >= 0 ? '+' : ''}${formatCurrency(delta)}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        );
      })()}

      {activeTab === 'annual' && (() => {
        const svcTotals = services.map(s => costByService[s.id] ?? 0);
        const minSvc = Math.min(...svcTotals);
        const maxSvc = Math.max(...svcTotals);
        const svcRange = maxSvc - minSvc;
        return (
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
                const t = svcRange > 0 ? (svcTotal - minSvc) / svcRange : 0;
                const r = t < 0.5 ? Math.round(220 + (240 - 220) * (t * 2)) : 245;
                const g = t < 0.5 ? 240 : Math.round(240 - (240 - 220) * ((t - 0.5) * 2));
                const b = 220;
                const heatBg = svcTotal > 0 ? `rgb(${r},${g},${b})` : undefined;
                return (
                  <tr key={service.id}>
                    <td className="py-2 px-3 font-medium text-gray-900">
                      <button
                        onClick={() => setAdjustServiceId(service.id)}
                        className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                      >
                        <span className={`w-3 h-3 rounded-sm inline-block ${SERVICE_COLORS[idx % SERVICE_COLORS.length]}`} />
                        <span className="underline decoration-gray-300 hover:decoration-blue-500 underline-offset-2">{service.name}</span>
                      </button>
                    </td>
                    <td className="py-2 px-3 text-right" style={{ backgroundColor: heatBg }}>{formatCurrency(svcTotal)}</td>
                    <td className="py-2 px-3 text-right text-gray-700" style={{ backgroundColor: heatBg }}>{formatCurrency(svcTotal / 12)}</td>
                    <td className="py-2 px-3 text-right text-gray-700" style={{ backgroundColor: heatBg }}>{pct.toFixed(1)}%</td>
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
        );
      })()}

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
              {(() => {
                const minTotal = Math.min(...costByMonth);
                const maxTotal = Math.max(...costByMonth);
                const deltas = deltaByMonth.slice(1);
                const minDelta = Math.min(...deltas);
                const maxDelta = Math.max(...deltas);
                return (
                  <>
                    <tr className="border-t-2 border-gray-300 font-semibold">
                      <td className="py-2 px-2 sticky left-0 bg-white">Total</td>
                      {costByMonth.map((cost, i) => (
                        <td
                          key={i}
                          className="py-2 px-2 text-right"
                          style={{ backgroundColor: heatColor(cost, minTotal, maxTotal) }}
                        >
                          {formatCurrency(cost)}
                        </td>
                      ))}
                      <td className="py-2 px-2 text-right sticky right-0 bg-white">{formatCurrency(grandTotal)}</td>
                    </tr>
                    <tr className="font-medium text-xs">
                      <td className="py-1.5 px-2 sticky left-0 bg-white text-gray-500">Delta</td>
                      {deltaByMonth.map((delta, i) => (
                        <td
                          key={i}
                          className="py-1.5 px-2 text-right"
                          style={{
                            backgroundColor: i > 0 ? deltaColor(delta, minDelta, maxDelta) : undefined,
                            color: i === 0 ? '#9ca3af' : delta > 0 ? '#b91c1c' : delta < 0 ? '#15803d' : '#6b7280',
                          }}
                        >
                          {i === 0 ? '\u2014' : `${delta >= 0 ? '+' : ''}${formatCurrency(delta)}`}
                        </td>
                      ))}
                      <td className="py-1.5 px-2 text-right sticky right-0 bg-white" />
                    </tr>
                  </>
                );
              })()}
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
