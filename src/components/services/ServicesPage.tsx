import { useState } from 'react';
import { useAppState } from '../../context/AppContext';
import { ServiceFormModal } from './ServiceFormModal';
import { ConfirmModal } from '../shared/ConfirmModal';
import { formatCurrency } from '../../utils/formatters';
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Cloud Services</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure the PaaS/cloud services you want to budget for.
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-3 font-medium text-gray-600">Service</th>
                <th className="text-left py-3 px-3 font-medium text-gray-600">Unit Type</th>
                <th className="text-right py-3 px-3 font-medium text-gray-600">Unit Cost</th>
                <th className="text-right py-3 px-3 font-medium text-gray-600">Efficiency %</th>
                <th className="text-right py-3 px-3 font-medium text-gray-600">Overhead %</th>
                <th className="text-center py-3 px-3 font-medium text-gray-600">Discount</th>
                <th className="text-right py-3 px-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {services.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50">
                  <td className="py-3 px-3 font-medium text-gray-900">{service.name}</td>
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
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleEdit(service)}
                      className="text-blue-600 hover:text-blue-700 font-medium mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingServiceId(service.id)}
                      className="text-red-600 hover:text-red-700 font-medium"
                    >
                      Delete
                    </button>
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
