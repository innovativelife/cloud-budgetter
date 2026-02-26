import { useState, useRef } from 'react';
import { useAppState } from '../../context/AppContext';
import { exportModel, importModel } from '../../utils/dataIO';
import { ConfirmModal } from '../shared/ConfirmModal';
import { CompareModal } from './CompareModal';
import { ImportConflictModal } from './ImportConflictModal';
import { HelpModal } from './HelpModal';
import type { BudgetModel } from '../../types';

interface PendingConfirm {
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
}

interface PendingConflict {
  existing: BudgetModel;
  imported: BudgetModel;
}

type PanelTab = 'models' | 'versions';

export function ModelManager() {
  const { state, activeModel, dispatch } = useAppState();
  const [showPanel, setShowPanel] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>('models');
  const [showNewModel, setShowNewModel] = useState(false);
  const [showSaveVersion, setShowSaveVersion] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [versionName, setVersionName] = useState('');
  const [versionShared, setVersionShared] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [pendingConflict, setPendingConflict] = useState<PendingConflict | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCreateModel() {
    if (!newModelName.trim()) return;
    dispatch({ type: 'CREATE_MODEL', payload: { name: newModelName.trim() } });
    setNewModelName('');
    setShowNewModel(false);
  }

  function handleSwitchModel(modelId: string) {
    dispatch({ type: 'SWITCH_MODEL', payload: modelId });
  }

  function handleDeleteModel(modelId: string) {
    const model = state.models.find((m) => m.id === modelId);
    setPendingConfirm({
      title: 'Delete Model',
      message: `Delete "${model?.name ?? 'this model'}" and all its saved versions? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: () => {
        dispatch({ type: 'DELETE_MODEL', payload: modelId });
        setPendingConfirm(null);
      },
    });
  }

  function handleDuplicate(modelId: string) {
    const source = state.models.find((m) => m.id === modelId);
    if (!source) return;
    dispatch({
      type: 'DUPLICATE_MODEL',
      payload: { modelId, name: `${source.name} (copy)` },
    });
  }

  function startRename(modelId: string, currentName: string) {
    setRenamingId(modelId);
    setRenameValue(currentName);
  }

  function handleRename() {
    if (!renamingId || !renameValue.trim()) return;
    dispatch({ type: 'RENAME_MODEL', payload: { modelId: renamingId, name: renameValue.trim() } });
    setRenamingId(null);
  }

  async function handleExport() {
    if (!activeModel) return;
    await exportModel(activeModel);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const model = await importModel(file);
      const existing = state.models.find((m) => m.id === model.id);
      if (existing) {
        setPendingConflict({ existing, imported: model });
        setImportError(null);
      } else {
        dispatch({ type: 'IMPORT_MODEL', payload: model });
        setImportError(null);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    }
    e.target.value = '';
  }

  function handleConflictMerge() {
    if (!pendingConflict) return;
    dispatch({ type: 'IMPORT_MODEL_MERGE', payload: pendingConflict.imported });
    setPendingConflict(null);
  }

  function handleConflictReplace() {
    if (!pendingConflict) return;
    dispatch({ type: 'IMPORT_MODEL', payload: pendingConflict.imported });
    setPendingConflict(null);
  }

  function handleConflictCopy() {
    if (!pendingConflict) return;
    const copy: BudgetModel = {
      ...pendingConflict.imported,
      id: crypto.randomUUID(),
      name: `${pendingConflict.imported.name} (imported)`,
    };
    dispatch({ type: 'IMPORT_MODEL', payload: copy });
    setPendingConflict(null);
  }

  function handleSaveVersion() {
    if (!versionName.trim()) return;
    dispatch({ type: 'SAVE_VERSION', payload: { name: versionName.trim(), shared: versionShared } });
    setVersionName('');
    setVersionShared(false);
    setShowSaveVersion(false);
  }

  function handleRestoreVersion(versionNumber: number, name: string) {
    setPendingConfirm({
      title: 'Restore Version',
      message: `Restore "v${versionNumber}: ${name}"? Your current working data will be overwritten.`,
      confirmLabel: 'Restore',
      variant: 'warning',
      onConfirm: () => {
        dispatch({ type: 'RESTORE_VERSION', payload: { versionNumber } });
        setPendingConfirm(null);
      },
    });
  }

  function handleDeleteVersion(versionNumber: number, name: string) {
    setPendingConfirm({
      title: 'Delete Version',
      message: `Delete version "v${versionNumber}: ${name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: () => {
        dispatch({ type: 'DELETE_VERSION', payload: { versionNumber } });
        setPendingConfirm(null);
      },
    });
  }

  function handleToggleShared(versionNumber: number) {
    dispatch({ type: 'TOGGLE_VERSION_SHARED', payload: { versionNumber } });
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }

  const versionCount = activeModel?.versions.length ?? 0;

  return (
    <div className="relative">
      <button
        onClick={() => { setShowPanel(!showPanel); setPanelTab('models'); }}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:border-gray-400 transition-colors"
      >
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span className="font-medium text-gray-700 max-w-[180px] truncate">
          {activeModel?.name ?? 'No model'}
        </span>
        <svg className={`w-3 h-3 text-gray-400 transition-transform ${showPanel ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showPanel && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />
          <div className="absolute right-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[80vh] flex flex-col">

            {/* Tab bar */}
            <div className="flex border-b border-gray-200 shrink-0">
              <button
                onClick={() => setPanelTab('models')}
                className={`flex-1 px-3 py-2.5 text-sm font-medium text-center transition-colors ${
                  panelTab === 'models'
                    ? 'text-blue-600 border-b-2 border-blue-500 -mb-px'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Models
              </button>
              <button
                onClick={() => setPanelTab('versions')}
                className={`flex-1 px-3 py-2.5 text-sm font-medium text-center transition-colors ${
                  panelTab === 'versions'
                    ? 'text-blue-600 border-b-2 border-blue-500 -mb-px'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Versions
                {versionCount > 0 && (
                  <span className={`ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    panelTab === 'versions' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {versionCount}
                  </span>
                )}
              </button>
            </div>

            {/* Tab content */}
            <div className="overflow-y-auto flex-1">

              {/* ========== Models tab ========== */}
              {panelTab === 'models' && (
                <>
                  <div className="max-h-60 overflow-y-auto">
                    {state.models.map((model) => (
                      <div
                        key={model.id}
                        className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${
                          model.id === state.activeModelId
                            ? 'bg-blue-50 border-l-2 border-blue-500'
                            : 'hover:bg-gray-50 border-l-2 border-transparent'
                        }`}
                      >
                        {renamingId === model.id ? (
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={handleRename}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                            className="flex-1 border border-blue-300 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <>
                            <button
                              onClick={() => handleSwitchModel(model.id)}
                              className="flex-1 text-left truncate font-medium text-gray-800"
                            >
                              {model.name}
                            </button>
                            <button onClick={() => startRename(model.id, model.name)} title="Rename" className="text-gray-400 hover:text-gray-600 shrink-0">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => handleDuplicate(model.id)} title="Duplicate" className="text-gray-400 hover:text-gray-600 shrink-0">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            </button>
                            <button onClick={() => handleDeleteModel(model.id)} title="Delete" className="text-gray-400 hover:text-red-500 shrink-0">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* New model */}
                  {showNewModel ? (
                    <div className="px-3 py-2 border-t border-gray-100 flex gap-2">
                      <input autoFocus value={newModelName} onChange={(e) => setNewModelName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateModel()} placeholder="Model name..." className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      <button onClick={handleCreateModel} className="text-sm text-blue-600 font-medium hover:text-blue-700">Create</button>
                      <button onClick={() => setShowNewModel(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setShowNewModel(true)} className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-100 font-medium">
                      + New Model
                    </button>
                  )}

                  <div className="border-t border-gray-200" />

                  {/* Import / Export */}
                  <div className="flex">
                    <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Export
                    </button>
                    <div className="w-px bg-gray-200" />
                    <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      Import
                    </button>
                  </div>

                  {importError && (
                    <div className="px-3 py-2 text-xs text-red-600 bg-red-50 border-t border-red-200">
                      {importError}
                    </div>
                  )}

                  <div className="border-t border-gray-200" />

                  {/* Help */}
                  <button
                    onClick={() => { setShowPanel(false); setShowHelp(true); }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Help &amp; Guide
                  </button>
                </>
              )}

              {/* ========== Versions tab ========== */}
              {panelTab === 'versions' && activeModel && (
                <>
                  {/* Model context header */}
                  <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-100">
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Versions for</div>
                    <div className="text-sm font-medium text-gray-800 truncate">{activeModel.name}</div>
                  </div>

                  {/* Save version / Compare actions */}
                  {showSaveVersion ? (
                    <div className="px-3 py-2 border-b border-gray-100 bg-white">
                      <div className="flex gap-2">
                        <input autoFocus value={versionName} onChange={(e) => setVersionName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveVersion()} placeholder="Version label..." className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <button onClick={handleSaveVersion} className="text-sm text-blue-600 font-medium hover:text-blue-700">Save</button>
                        <button onClick={() => setShowSaveVersion(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
                      </div>
                      <label className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={versionShared}
                          onChange={(e) => setVersionShared(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Include in export
                      </label>
                    </div>
                  ) : (
                    <div className="flex w-full border-b border-gray-100">
                      <button onClick={() => setShowSaveVersion(true)} className="flex-1 text-left px-3 py-2 text-sm text-green-600 hover:bg-green-50 font-medium">
                        + Save Version
                      </button>
                      {versionCount >= 1 && (
                        <button
                          onClick={() => { setShowPanel(false); setShowCompare(true); }}
                          className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 font-medium border-l border-gray-100"
                        >
                          Compare
                        </button>
                      )}
                    </div>
                  )}

                  {/* Version list */}
                  {versionCount === 0 ? (
                    <div className="px-3 py-6 text-xs text-gray-400 text-center">
                      No saved versions yet.<br />
                      Save a version to create a checkpoint you can restore or compare later.
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto">
                      {[...activeModel.versions].reverse().map((v) => (
                        <div key={v.number} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-700 truncate">v{v.number}: {v.name}</div>
                            <div className="text-[10px] text-gray-400">{formatDate(v.timestamp)}</div>
                          </div>
                          <button
                            onClick={() => handleToggleShared(v.number)}
                            title={v.shared ? 'Included in export' : 'Not included in export'}
                            className={`shrink-0 ${v.shared ? 'text-blue-500 hover:text-blue-700' : 'text-gray-300 hover:text-gray-500'}`}
                          >
                            <svg className="w-3.5 h-3.5" fill={v.shared ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                          </button>
                          <button onClick={() => handleRestoreVersion(v.number, v.name)} className="text-blue-500 hover:text-blue-700 text-xs font-medium shrink-0">Restore</button>
                          <button onClick={() => handleDeleteVersion(v.number, v.name)} className="text-gray-400 hover:text-red-500 shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {panelTab === 'versions' && !activeModel && (
                <div className="px-3 py-6 text-xs text-gray-400 text-center">
                  No model selected.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <input ref={fileInputRef} type="file" accept=".zip" onChange={handleImport} className="hidden" />

      {pendingConfirm && (
        <ConfirmModal
          title={pendingConfirm.title}
          message={pendingConfirm.message}
          confirmLabel={pendingConfirm.confirmLabel}
          variant={pendingConfirm.variant}
          onConfirm={pendingConfirm.onConfirm}
          onCancel={() => setPendingConfirm(null)}
        />
      )}

      {pendingConflict && (
        <ImportConflictModal
          existing={pendingConflict.existing}
          imported={pendingConflict.imported}
          onMerge={handleConflictMerge}
          onReplace={handleConflictReplace}
          onCopy={handleConflictCopy}
          onCancel={() => setPendingConflict(null)}
        />
      )}

      {showCompare && (
        <CompareModal onClose={() => setShowCompare(false)} />
      )}

      {showHelp && (
        <HelpModal onClose={() => setShowHelp(false)} />
      )}
    </div>
  );
}
