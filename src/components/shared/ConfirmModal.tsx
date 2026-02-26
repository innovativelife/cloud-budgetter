interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_STYLES = {
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white',
  default: 'bg-blue-600 hover:bg-blue-700 text-white',
};

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="mt-2 text-sm text-gray-600">{message}</p>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 bg-gray-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-md ${VARIANT_STYLES[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
