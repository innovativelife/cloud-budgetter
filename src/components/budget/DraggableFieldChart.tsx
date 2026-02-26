import { useRef, useCallback, useState } from 'react';
import type { ServiceBudget, BudgetFieldKey } from '../../types';

interface DraggableFieldChartProps {
  serviceBudget: ServiceBudget;
  monthLabels: string[];
  field: BudgetFieldKey;
  label: string;
  unit: string;
  color: string;
  hoverColor: string;
  min?: number;
  formatValue?: (v: number) => string;
  onValueChange: (monthIndex: number, field: BudgetFieldKey, value: number) => void;
  onCommit: () => void;
}

export function DraggableFieldChart({
  serviceBudget,
  monthLabels,
  field,
  label,
  unit,
  color,
  hoverColor,
  min = 0,
  formatValue,
  onValueChange,
  onCommit,
}: DraggableFieldChartProps) {
  const [adjustPct, setAdjustPct] = useState('');
  const [adjustFrom, setAdjustFrom] = useState('0');
  const [adjustDir, setAdjustDir] = useState<'reduce' | 'increase'>('reduce');

  const values = Array.from({ length: 12 }, (_, m) => serviceBudget[m][field].value);
  const maxVal = Math.max(...values, 1);
  const displayCeiling = Math.max(maxVal * 1.3, 1);
  const chartHeight = 280;

  const draggingMonth = useRef<number | null>(null);

  const setValue = useCallback(
    (monthIndex: number, value: number) => {
      const clamped = Math.max(min, Math.round(value));
      onValueChange(monthIndex, field, clamped);
    },
    [onValueChange, field, min]
  );

  const handlePointerDown = useCallback(
    (monthIndex: number, e: React.PointerEvent) => {
      e.preventDefault();
      draggingMonth.current = monthIndex;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback(
    (monthIndex: number, e: React.PointerEvent) => {
      if (draggingMonth.current !== monthIndex) return;
      const barArea = (e.currentTarget as HTMLElement).closest('[data-bar-area]') as HTMLElement | null;
      if (!barArea) return;
      const rect = barArea.getBoundingClientRect();
      const yRatio = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      const ceiling = Math.max(maxVal * 1.5, min + 100);
      setValue(monthIndex, yRatio * ceiling);
    },
    [maxVal, setValue, min]
  );

  const handlePointerUp = useCallback(() => {
    if (draggingMonth.current !== null) {
      draggingMonth.current = null;
      onCommit();
    }
  }, [onCommit]);

  function handleApplyAdjust() {
    const pct = parseFloat(adjustPct);
    if (isNaN(pct) || pct <= 0) return;
    const fromMonth = parseInt(adjustFrom);
    const multiplier = adjustDir === 'reduce' ? 1 - pct / 100 : 1 + pct / 100;
    for (let m = fromMonth; m < 12; m++) {
      const current = serviceBudget[m][field].value;
      const newVal = Math.max(min, Math.round(current * multiplier));
      onValueChange(m, field, newVal);
    }
    onCommit();
    setAdjustPct('');
  }

  const fmt = formatValue ?? ((v: number) => v.toLocaleString());

  return (
    <div className="flex flex-col h-full">
      {/* Chart area */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-gray-700">{label}</div>
          <div className="text-[11px] text-gray-400">Drag bars to adjust &middot; {unit}</div>
        </div>

        <div className="flex items-end gap-2 flex-1" style={{ minHeight: chartHeight }}>
          {values.map((val, monthIdx) => {
            const barHeight = Math.max((val / displayCeiling) * chartHeight, 2);
            const isOverridden = serviceBudget[monthIdx][field].isOverridden && monthIdx > 0;
            return (
              <div key={monthIdx} className="flex-1 flex flex-col items-center justify-end h-full">
                {/* Value label */}
                <div className="text-[11px] text-gray-600 mb-1 tabular-nums select-none font-medium">
                  {val > 0 ? fmt(val) : ''}
                </div>

                {/* Draggable bar */}
                <div className="w-full relative flex-1" data-bar-area>
                  <div
                    className={`absolute bottom-0 left-[12%] right-[12%] rounded-t transition-colors cursor-ns-resize ${
                      isOverridden ? 'opacity-90' : ''
                    }`}
                    style={{
                      height: Math.min(barHeight, chartHeight),
                      backgroundColor: isOverridden ? undefined : undefined,
                    }}
                  >
                    <div
                      className={`w-full h-full rounded-t ${color} hover:${hoverColor}`}
                      style={{ opacity: isOverridden ? 0.75 : 1 }}
                      onPointerDown={(e) => handlePointerDown(monthIdx, e)}
                      onPointerMove={(e) => handlePointerMove(monthIdx, e)}
                      onPointerUp={handlePointerUp}
                    />
                    {isOverridden && (
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-400 border border-white" title="Custom override" />
                    )}
                  </div>
                </div>

                {/* Month label */}
                <div className="text-[11px] text-gray-500 mt-2 select-none font-medium">
                  {monthLabels[monthIdx].split(' ')[0].slice(0, 3)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Adjustment toolbar */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200">
        <span className="text-xs text-gray-500 font-medium shrink-0">Adjust:</span>
        <select
          value={adjustDir}
          onChange={(e) => setAdjustDir(e.target.value as 'reduce' | 'increase')}
          className="border border-gray-300 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="reduce">Reduce by</option>
          <option value="increase">Increase by</option>
        </select>
        <div className="relative">
          <input
            type="number"
            min="0"
            max="100"
            value={adjustPct}
            onChange={(e) => setAdjustPct(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApplyAdjust()}
            placeholder="5"
            className="w-16 border border-gray-300 rounded px-2 py-1.5 text-xs text-right pr-5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
        </div>
        <span className="text-xs text-gray-500 shrink-0">from</span>
        <select
          value={adjustFrom}
          onChange={(e) => setAdjustFrom(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {monthLabels.map((lbl, i) => (
            <option key={i} value={String(i)}>{lbl}</option>
          ))}
        </select>
        <button
          onClick={handleApplyAdjust}
          disabled={!adjustPct || parseFloat(adjustPct) <= 0}
          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
