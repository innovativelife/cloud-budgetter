import type { BudgetModel } from '../../types';

interface ImportConflictModalProps {
  existing: BudgetModel;
  imported: BudgetModel;
  onMerge: () => void;
  onReplace: () => void;
  onCopy: () => void;
  onCancel: () => void;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ImportConflictModal({
  existing,
  imported,
  onMerge,
  onReplace,
  onCopy,
  onCancel,
}: ImportConflictModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Import Conflict</h2>
          <p className="text-sm text-gray-600 mt-2">
            &ldquo;{existing.name}&rdquo; already exists.
          </p>
          <div className="flex gap-6 mt-2 text-xs text-gray-500">
            <span>Local: last edited {formatDate(existing.updatedAt)}</span>
            <span>Imported: last edited {formatDate(imported.updatedAt)}</span>
          </div>
        </div>

        <div className="px-6 py-4 space-y-3">
          <button
            onClick={onMerge}
            className="w-full text-left p-3 rounded-lg border-2 border-blue-200 bg-blue-50 hover:border-blue-400 transition-colors"
          >
            <div className="font-medium text-sm text-blue-900">Merge Versions</div>
            <div className="text-xs text-blue-700 mt-0.5">
              Keep your current data, add new versions from the import
            </div>
          </button>

          <button
            onClick={onReplace}
            className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gray-400 transition-colors"
          >
            <div className="font-medium text-sm text-gray-900">Replace Local</div>
            <div className="text-xs text-gray-500 mt-0.5">
              Overwrite with the imported file
            </div>
          </button>

          <button
            onClick={onCopy}
            className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gray-400 transition-colors"
          >
            <div className="font-medium text-sm text-gray-900">Import as Copy</div>
            <div className="text-xs text-gray-500 mt-0.5">
              Create a new model from the import
            </div>
          </button>
        </div>

        <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
