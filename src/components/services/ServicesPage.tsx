import { useState } from 'react';
import { useAppState } from '../../context/AppContext';
import { ServiceFormModal } from './ServiceFormModal';
import { ConfirmModal } from '../shared/ConfirmModal';
import { formatCurrency } from '../../utils/formatters';
import { getServiceColor } from '../../utils/serviceColors';
import type { Service } from '../../types';

export function ServicesPage() {
  const { activeModel, dispatch } = useAppState();
  const services = activeModel?.data.services ?? [];
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);

  function handleAdd() {
    setEditingService(null);
    setShowModal(true);
  }

  function handleEdit(service: Service) {
    setEditingService(service);
    setShowModal(true);
  }

  function handleConfirmDelete() {
    if (deletingServiceId) {
      dispatch({ type: 'DELETE_SERVICE', payload: deletingServiceId });
      setDeletingServiceId(null);
    }
  }

  function handleSave(data: Omit<Service, 'id' | 'createdAt'>) {
    if (editingService) {
      dispatch({
        type: 'UPDATE_SERVICE',
        payload: { ...data, id: editingService.id, createdAt: editingService.createdAt },
      });
    } else {
      dispatch({ type: 'ADD_SERVICE', payload: data });
    }
    setShowModal(false);
  }

  const deletingService = deletingServiceId
    ? services.find((s) => s.id === deletingServiceId)
    : null;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 3.5rem - 3rem)' }}>
      {/* Pinned header */}
      <div className="shrink-0 flex items-center justify-between pb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Cloud Services</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure the services you need to budget.
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          + Add Service
        </button>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">No services configured yet.</p>
          <button
            onClick={handleAdd}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Add your first service
          </button>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-blue-100 shadow-sm">
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-blue-800 uppercase tracking-wider min-w-[140px]">Service</th>
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-blue-800 uppercase tracking-wider">Unit Type</th>
                <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-blue-800 uppercase tracking-wider">Unit Cost</th>
                <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-blue-800 uppercase tracking-wider">Efficiency %</th>
                <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-blue-800 uppercase tracking-wider">Overhead %</th>
                <th className="text-center py-2.5 px-3 text-[11px] font-semibold text-blue-800 uppercase tracking-wider">Discount</th>
                <th className="py-2.5 px-3 w-20 bg-blue-100"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {services.map((service, idx) => (
                <tr key={service.id} className="group hover:bg-gray-50">
                  <td className="py-3 px-3 font-medium text-gray-900">
                    <span className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-sm inline-block shrink-0 ${getServiceColor(idx)}`} />
                      {service.name}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-gray-600">{service.unitType}</td>
                  <td className="py-3 px-3 text-right text-gray-900">
                    {formatCurrency(service.unitCost)}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-600">{service.defaultEfficiency}%</td>
                  <td className="py-3 px-3 text-right text-gray-600">{service.defaultOverhead}%</td>
                  <td className="py-3 px-3 text-center">
                    {service.discountEligible ? (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                        Yes
                      </span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(service)}
                        title="Edit"
                        className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeletingServiceId(service.id)}
                        title="Delete"
                        className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ServiceFormModal
          service={editingService}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}

      {deletingService && (
        <ConfirmModal
          title="Delete Service"
          message={`Delete "${deletingService.name}"? All budget data for this service will also be removed.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingServiceId(null)}
        />
      )}
    </div>
  );
}
