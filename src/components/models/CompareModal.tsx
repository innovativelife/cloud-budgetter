import { useState } from 'react';
import { compareModelData, type CompareResult } from '../../utils/compare';
import { formatCurrency } from '../../utils/formatters';
import { useAppState } from '../../context/AppContext';
import { Select } from '../shared/Select';

interface CompareModalProps {
  onClose: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  consumption: 'Consumption',
  efficiency: 'Efficiency %',
  overhead: 'Overhead %',
  discount: 'Discount %',
};

export function CompareModal({ onClose }: CompareModalProps) {
  const { activeModel } = useAppState();
  const versions = activeModel?.versions ?? [];

  // Options: versions + "Current" for live data
  const options = [
    { value: 'current', label: 'Current (working)' },
    ...versions.map((v) => ({
      value: String(v.number),
      label: `v${v.number}: ${v.name}`,
    })),
  ];

  const [leftId, setLeftId] = useState(versions.length > 0 ? String(versions[0].number) : 'current');
  const [rightId, setRightId] = useState('current');
  const [result, setResult] = useState<CompareResult | null>(null);

  function getData(id: string) {
    if (id === 'current') return activeModel?.data ?? null;
    const v = versions.find((ver) => ver.number === parseInt(id));
    return v?.data ?? null;
  }

  function handleCompare() {
    const left = getData(leftId);
    const right = getData(rightId);
    if (!left || !right) return;
    setResult(compareModelData(left, right));
  }

  function getLabel(id: string) {
    if (id === 'current') return 'Current';
    const v = versions.find((ver) => ver.number === parseInt(id));
    return v ? `v${v.number}: ${v.name}` : id;
  }

  function formatDelta(oldVal: number, newVal: number): { text: string; className: string } {
    const diff = newVal - oldVal;
    if (diff === 0) return { text: '-', className: 'text-gray-400' };
    const sign = diff > 0 ? '+' : '';
    return {
      text: `${sign}${formatCurrency(diff)}`,
      className: diff > 0 ? 'text-red-600' : 'text-green-600',
    };
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Compare Versions</h2>
          <p className="text-sm text-gray-500 mt-1">Select two snapshots to see what changed.</p>
        </div>

        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">From (older)</label>
              <Select value={leftId} options={options} onChange={setLeftId} />
            </div>
            <div className="text-gray-400 pb-2">vs</div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">To (newer)</label>
              <Select value={rightId} options={options} onChange={setRightId} />
            </div>
            <button
              onClick={handleCompare}
              disabled={leftId === rightId}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Compare
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!result ? (
            <div className="text-center text-sm text-gray-400 py-8">
              Select two versions and click Compare.
            </div>
          ) : (
            <div>
              {/* Grand total diff */}
              <div className="flex items-center gap-6 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase">{getLabel(leftId)}</div>
                  <div className="text-lg font-semibold text-gray-700">{formatCurrency(result.oldGrandTotal)}</div>
                </div>
                <div className="text-gray-300 text-lg">&rarr;</div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase">{getLabel(rightId)}</div>
                  <div className="text-lg font-semibold text-gray-700">{formatCurrency(result.newGrandTotal)}</div>
                </div>
                <div className="ml-auto">
                  <div className="text-[10px] text-gray-400 uppercase">Delta</div>
                  {(() => {
                    const d = formatDelta(result.oldGrandTotal, result.newGrandTotal);
                    return <div className={`text-lg font-semibold ${d.className}`}>{d.text}</div>;
                  })()}
                </div>
              </div>

              {/* Per-service diffs */}
              {result.services.filter((s) => s.status !== 'unchanged').length === 0 ? (
                <div className="text-center text-sm text-gray-400 py-4">No differences found.</div>
              ) : (
                <div className="space-y-4">
                  {result.services.filter((s) => s.status !== 'unchanged').map((svc) => (
                    <div key={svc.serviceId} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900">{svc.serviceName}</span>
                          <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                            svc.status === 'added' ? 'bg-green-100 text-green-700' :
                            svc.status === 'removed' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {svc.status}
                          </span>
                        </div>
                        <div className="text-xs">
                          <span className="text-gray-500">{formatCurrency(svc.oldTotalCost)}</span>
                          <span className="mx-1.5 text-gray-300">&rarr;</span>
                          <span className="text-gray-500">{formatCurrency(svc.newTotalCost)}</span>
                          {(() => {
                            const d = formatDelta(svc.oldTotalCost, svc.newTotalCost);
                            return <span className={`ml-2 font-medium ${d.className}`}>{d.text}</span>;
                          })()}
                        </div>
                      </div>

                      {svc.fieldDiffs.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-gray-100">
                                <th className="text-left py-1.5 px-3 font-medium text-gray-500">Field</th>
                                <th className="text-left py-1.5 px-3 font-medium text-gray-500">Month</th>
                                <th className="text-right py-1.5 px-3 font-medium text-gray-500">{getLabel(leftId)}</th>
                                <th className="text-right py-1.5 px-3 font-medium text-gray-500">{getLabel(rightId)}</th>
                                <th className="text-right py-1.5 px-3 font-medium text-gray-500">Change</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {svc.fieldDiffs.map((fd, i) => {
                                const change = fd.newValue - fd.oldValue;
                                const sign = change > 0 ? '+' : '';
                                return (
                                  <tr key={i} className="hover:bg-gray-50">
                                    <td className="py-1.5 px-3 text-gray-700">{FIELD_LABELS[fd.field] ?? fd.field}</td>
                                    <td className="py-1.5 px-3 text-gray-500">M{fd.month + 1}</td>
                                    <td className="py-1.5 px-3 text-right text-gray-600">{fd.oldValue}</td>
                                    <td className="py-1.5 px-3 text-right text-gray-600">{fd.newValue}</td>
                                    <td className={`py-1.5 px-3 text-right font-medium ${
                                      change > 0 ? 'text-red-600' : 'text-green-600'
                                    }`}>
                                      {sign}{change}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
