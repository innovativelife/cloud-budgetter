import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type {
  AppState,
  BudgetModel,
  ModelData,
  Service,
  BudgetConfig,
  BudgetFieldKey,
  BudgetMonthEntry,
  ServiceBudget,
  Version,
} from '../types';

const SCHEMA_VERSION = 3;

function createDefaultModelData(): ModelData {
  const now = new Date();
  return {
    services: [],
    budgetConfig: {
      startMonth: now.getMonth(),
      startYear: now.getFullYear(),
    },
    budgetData: {},
  };
}

function createDefaultState(): AppState {
  const model: BudgetModel = {
    id: crypto.randomUUID(),
    name: 'Default Budget',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    data: createDefaultModelData(),
    versions: [],
  };
  return {
    schemaVersion: SCHEMA_VERSION,
    models: [model],
    activeModelId: model.id,
  };
}

function migrateState(raw: Record<string, unknown>): AppState {
  // Legacy v0/v1: flat state with services at top level
  if (!raw.schemaVersion && (raw.version || raw.services)) {
    const model: BudgetModel = {
      id: crypto.randomUUID(),
      name: 'Migrated Budget',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      data: {
        services: (raw.services as ModelData['services']) ?? [],
        budgetConfig: (raw.budgetConfig as ModelData['budgetConfig']) ?? {
          startMonth: new Date().getMonth(),
          startYear: new Date().getFullYear(),
        },
        budgetData: (raw.budgetData as ModelData['budgetData']) ?? {},
      },
      versions: [],
    };
    return {
      schemaVersion: SCHEMA_VERSION,
      models: [model],
      activeModelId: model.id,
    };
  }

  const state = raw as unknown as AppState;

  // v2 -> v3: merge pointVersions into versions with shared flag
  if ((state.schemaVersion ?? 0) < 3 && state.models) {
    state.models = state.models.map((m) => {
      const rawModel = m as unknown as Record<string, unknown>;
      const oldVersions = (Array.isArray(m.versions) ? m.versions : []) as unknown as Array<Record<string, unknown>>;
      const oldPointVersions = (Array.isArray(rawModel.pointVersions) ? rawModel.pointVersions : []) as Array<Record<string, unknown>>;

      const merged: Version[] = [
        ...oldVersions.map((v) => ({
          number: v.number as number,
          name: v.name as string,
          timestamp: v.timestamp as number,
          shared: true,
          data: v.data as ModelData,
        })),
        ...oldPointVersions.map((pv) => ({
          number: pv.number as number,
          name: pv.name as string,
          timestamp: pv.timestamp as number,
          shared: false,
          data: pv.data as ModelData,
        })),
      ];

      // Sort by timestamp, re-number sequentially
      merged.sort((a, b) => a.timestamp - b.timestamp);
      merged.forEach((v, i) => { v.number = i + 1; });

      // Return clean model without pointVersions
      const { pointVersions: _, ...rest } = rawModel as Record<string, unknown> & { pointVersions?: unknown };
      void _;
      return {
        ...rest,
        versions: merged,
      } as unknown as BudgetModel;
    });
    state.schemaVersion = SCHEMA_VERSION;
  }

  return state;
}

function createServiceBudget(
  defaultEfficiency: number,
  defaultOverhead: number,
  seed?: { consumption: number; monthlyGrowth: number }
): ServiceBudget {
  const budget: ServiceBudget = {};
  for (let i = 0; i < 12; i++) {
    const consumption = seed ? seed.consumption + seed.monthlyGrowth * i : 0;
    budget[i] = {
      consumption: { value: Math.max(consumption, 0), isOverridden: i > 0 && seed ? true : false },
      efficiency: { value: defaultEfficiency, isOverridden: false },
      overhead: { value: defaultOverhead, isOverridden: false },
      discount: { value: 0, isOverridden: false },
    };
  }
  return budget;
}

// --- Actions ---

type AppAction =
  // Model management
  | { type: 'CREATE_MODEL'; payload: { name: string } }
  | { type: 'RENAME_MODEL'; payload: { modelId: string; name: string } }
  | { type: 'DELETE_MODEL'; payload: string }
  | { type: 'SWITCH_MODEL'; payload: string }
  | { type: 'DUPLICATE_MODEL'; payload: { modelId: string; name: string } }
  // Version management
  | { type: 'SAVE_VERSION'; payload: { name: string; shared?: boolean } }
  | { type: 'RESTORE_VERSION'; payload: { versionNumber: number } }
  | { type: 'DELETE_VERSION'; payload: { versionNumber: number } }
  | { type: 'TOGGLE_VERSION_SHARED'; payload: { versionNumber: number } }
  // Service actions (operate on active model)
  | { type: 'ADD_SERVICE'; payload: Omit<Service, 'id' | 'createdAt'>; seed?: { consumption: number; monthlyGrowth: number } }
  | { type: 'UPDATE_SERVICE'; payload: Service }
  | { type: 'DELETE_SERVICE'; payload: string }
  // Budget actions (operate on active model)
  | { type: 'SET_BUDGET_CONFIG'; payload: BudgetConfig }
  | {
      type: 'SET_BUDGET_FIELD';
      payload: {
        serviceId: string;
        monthIndex: number;
        field: BudgetFieldKey;
        value: number;
      };
    }
  | {
      type: 'CLEAR_OVERRIDE';
      payload: {
        serviceId: string;
        monthIndex: number;
        field: BudgetFieldKey;
      };
    }
  | {
      type: 'SET_SERVICE_BUDGET';
      payload: { serviceId: string; serviceBudget: ServiceBudget };
    }
  // Import
  | { type: 'IMPORT_MODEL'; payload: BudgetModel }
  | { type: 'IMPORT_MODEL_MERGE'; payload: BudgetModel }
  | { type: 'LOAD_STATE'; payload: AppState };

// --- Helpers ---

function updateMonthField(
  entry: BudgetMonthEntry,
  field: BudgetFieldKey,
  value: number,
  isOverridden: boolean
): BudgetMonthEntry {
  return { ...entry, [field]: { value, isOverridden } };
}

function updateActiveModelData(
  state: AppState,
  updater: (data: ModelData) => ModelData
): AppState {
  return {
    ...state,
    models: state.models.map((m) =>
      m.id === state.activeModelId
        ? { ...m, data: updater(m.data), updatedAt: Date.now() }
        : m
    ),
  };
}

// --- Reducer ---

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // ---- Model management ----

    case 'CREATE_MODEL': {
      const newModel: BudgetModel = {
        id: crypto.randomUUID(),
        name: action.payload.name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        data: createDefaultModelData(),
        versions: [],
      };
      return {
        ...state,
        models: [...state.models, newModel],
        activeModelId: newModel.id,
      };
    }

    case 'RENAME_MODEL': {
      return {
        ...state,
        models: state.models.map((m) =>
          m.id === action.payload.modelId
            ? { ...m, name: action.payload.name, updatedAt: Date.now() }
            : m
        ),
      };
    }

    case 'DELETE_MODEL': {
      const remaining = state.models.filter((m) => m.id !== action.payload);
      return {
        ...state,
        models: remaining,
        activeModelId:
          state.activeModelId === action.payload
            ? (remaining[0]?.id ?? null)
            : state.activeModelId,
      };
    }

    case 'SWITCH_MODEL': {
      return { ...state, activeModelId: action.payload };
    }

    case 'DUPLICATE_MODEL': {
      const source = state.models.find((m) => m.id === action.payload.modelId);
      if (!source) return state;
      const newModel: BudgetModel = {
        id: crypto.randomUUID(),
        name: action.payload.name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        data: JSON.parse(JSON.stringify(source.data)),
        versions: [],
      };
      return {
        ...state,
        models: [...state.models, newModel],
        activeModelId: newModel.id,
      };
    }

    // ---- Version management ----

    case 'SAVE_VERSION': {
      const activeModel = state.models.find((m) => m.id === state.activeModelId);
      if (!activeModel) return state;
      const nextNumber = activeModel.versions.length > 0
        ? Math.max(...activeModel.versions.map((v) => v.number)) + 1
        : 1;
      const newVersion: Version = {
        number: nextNumber,
        name: action.payload.name,
        timestamp: Date.now(),
        shared: action.payload.shared ?? false,
        data: JSON.parse(JSON.stringify(activeModel.data)),
      };
      return {
        ...state,
        models: state.models.map((m) =>
          m.id === state.activeModelId
            ? { ...m, versions: [...m.versions, newVersion], updatedAt: Date.now() }
            : m
        ),
      };
    }

    case 'RESTORE_VERSION': {
      const model = state.models.find((m) => m.id === state.activeModelId);
      if (!model) return state;
      const version = model.versions.find((v) => v.number === action.payload.versionNumber);
      if (!version) return state;
      return {
        ...state,
        models: state.models.map((m) =>
          m.id === state.activeModelId
            ? { ...m, data: JSON.parse(JSON.stringify(version.data)), updatedAt: Date.now() }
            : m
        ),
      };
    }

    case 'DELETE_VERSION': {
      return {
        ...state,
        models: state.models.map((m) =>
          m.id === state.activeModelId
            ? {
                ...m,
                versions: m.versions.filter((v) => v.number !== action.payload.versionNumber),
                updatedAt: Date.now(),
              }
            : m
        ),
      };
    }

    case 'TOGGLE_VERSION_SHARED': {
      return {
        ...state,
        models: state.models.map((m) =>
          m.id === state.activeModelId
            ? {
                ...m,
                versions: m.versions.map((v) =>
                  v.number === action.payload.versionNumber
                    ? { ...v, shared: !v.shared }
                    : v
                ),
                updatedAt: Date.now(),
              }
            : m
        ),
      };
    }

    // ---- Service actions (active model) ----

    case 'ADD_SERVICE': {
      const newService: Service = {
        ...action.payload,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      const newBudget = createServiceBudget(
        newService.defaultEfficiency,
        newService.defaultOverhead,
        action.seed
      );
      return updateActiveModelData(state, (data) => ({
        ...data,
        services: [...data.services, newService],
        budgetData: { ...data.budgetData, [newService.id]: newBudget },
      }));
    }

    case 'UPDATE_SERVICE': {
      return updateActiveModelData(state, (data) => ({
        ...data,
        services: data.services.map((s) =>
          s.id === action.payload.id ? action.payload : s
        ),
      }));
    }

    case 'DELETE_SERVICE': {
      return updateActiveModelData(state, (data) => {
        const { [action.payload]: _, ...remainingBudget } = data.budgetData;
        void _;
        return {
          ...data,
          services: data.services.filter((s) => s.id !== action.payload),
          budgetData: remainingBudget,
        };
      });
    }

    // ---- Budget actions (active model) ----

    case 'SET_BUDGET_CONFIG': {
      return updateActiveModelData(state, (data) => ({
        ...data,
        budgetConfig: action.payload,
      }));
    }

    case 'SET_BUDGET_FIELD': {
      const { serviceId, monthIndex, field, value } = action.payload;
      return updateActiveModelData(state, (data) => {
        const serviceBudget = { ...data.budgetData[serviceId] };
        if (!serviceBudget) return data;

        if (monthIndex === 0) {
          serviceBudget[0] = updateMonthField(serviceBudget[0], field, value, false);
          for (let i = 1; i < 12; i++) {
            if (!serviceBudget[i][field].isOverridden) {
              serviceBudget[i] = updateMonthField(serviceBudget[i], field, value, false);
            }
          }
        } else {
          serviceBudget[monthIndex] = updateMonthField(
            serviceBudget[monthIndex], field, value, true
          );
        }

        return {
          ...data,
          budgetData: { ...data.budgetData, [serviceId]: serviceBudget },
        };
      });
    }

    case 'SET_SERVICE_BUDGET': {
      const { serviceId, serviceBudget } = action.payload;
      return updateActiveModelData(state, (data) => ({
        ...data,
        budgetData: { ...data.budgetData, [serviceId]: serviceBudget },
      }));
    }

    case 'CLEAR_OVERRIDE': {
      const { serviceId, monthIndex, field } = action.payload;
      if (monthIndex === 0) return state;

      return updateActiveModelData(state, (data) => {
        const serviceBudget = { ...data.budgetData[serviceId] };
        if (!serviceBudget) return data;

        const sourceValue = serviceBudget[0][field].value;
        serviceBudget[monthIndex] = updateMonthField(
          serviceBudget[monthIndex], field, sourceValue, false
        );

        return {
          ...data,
          budgetData: { ...data.budgetData, [serviceId]: serviceBudget },
        };
      });
    }

    // ---- Import ----

    case 'IMPORT_MODEL': {
      const imported = action.payload;
      const existing = state.models.find((m) => m.id === imported.id);

      if (existing) {
        return {
          ...state,
          models: state.models.map((m) => m.id === imported.id ? imported : m),
          activeModelId: imported.id,
        };
      }

      return {
        ...state,
        models: [...state.models, imported],
        activeModelId: imported.id,
      };
    }

    case 'IMPORT_MODEL_MERGE': {
      const imported = action.payload;
      const existing = state.models.find((m) => m.id === imported.id);
      if (!existing) return state;

      // Keep local working data, merge in new shared versions from import
      const existingTimestamps = new Set(existing.versions.map((v) => v.timestamp));
      const newVersions = imported.versions.filter((v) => !existingTimestamps.has(v.timestamp));
      const merged = [...existing.versions, ...newVersions];
      merged.sort((a, b) => a.timestamp - b.timestamp);
      merged.forEach((v, i) => { v.number = i + 1; });

      return {
        ...state,
        models: state.models.map((m) =>
          m.id === imported.id
            ? { ...m, versions: merged, updatedAt: Date.now() }
            : m
        ),
      };
    }

    case 'LOAD_STATE': {
      return action.payload;
    }

    default:
      return state;
  }
}

// --- Context ---

interface AppContextValue {
  state: AppState;
  activeModel: BudgetModel | null;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [savedState, setSavedState] = useLocalStorage<AppState>(
    'cloud-budgetter-state',
    createDefaultState()
  );

  const migrated = savedState.schemaVersion && savedState.schemaVersion >= SCHEMA_VERSION
    ? savedState
    : migrateState(savedState as unknown as Record<string, unknown>);
  const [state, dispatch] = useReducer(appReducer, migrated);

  useEffect(() => {
    setSavedState(state);
  }, [state, setSavedState]);

  const activeModel = state.models.find((m) => m.id === state.activeModelId) ?? null;

  return (
    <AppContext.Provider value={{ state, activeModel, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return context;
}
