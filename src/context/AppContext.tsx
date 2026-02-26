import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type {
  AppState,
  Service,
  BudgetConfig,
  BudgetFieldKey,
  BudgetMonthEntry,
  ServiceBudget,
} from '../types';

const CURRENT_VERSION = 1;

function createDefaultState(): AppState {
  const now = new Date();
  return {
    version: CURRENT_VERSION,
    services: [],
    budgetConfig: {
      startMonth: now.getMonth(),
      startYear: now.getFullYear(),
    },
    budgetData: {},
  };
}

function createServiceBudget(defaultEfficiency: number, defaultOverhead: number): ServiceBudget {
  const budget: ServiceBudget = {};
  for (let i = 0; i < 12; i++) {
    budget[i] = {
      consumption: { value: 0, isOverridden: false },
      efficiency: { value: defaultEfficiency, isOverridden: false },
      overhead: { value: defaultOverhead, isOverridden: false },
      discount: { value: 0, isOverridden: false },
    };
  }
  return budget;
}

type AppAction =
  | { type: 'ADD_SERVICE'; payload: Omit<Service, 'id' | 'createdAt'> }
  | { type: 'UPDATE_SERVICE'; payload: Service }
  | { type: 'DELETE_SERVICE'; payload: string }
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
  | { type: 'LOAD_STATE'; payload: AppState };

function updateMonthField(
  entry: BudgetMonthEntry,
  field: BudgetFieldKey,
  value: number,
  isOverridden: boolean
): BudgetMonthEntry {
  return {
    ...entry,
    [field]: { value, isOverridden },
  };
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_SERVICE': {
      const newService: Service = {
        ...action.payload,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      const newBudget = createServiceBudget(
        newService.defaultEfficiency,
        newService.defaultOverhead
      );
      return {
        ...state,
        services: [...state.services, newService],
        budgetData: { ...state.budgetData, [newService.id]: newBudget },
      };
    }

    case 'UPDATE_SERVICE': {
      return {
        ...state,
        services: state.services.map((s) =>
          s.id === action.payload.id ? action.payload : s
        ),
      };
    }

    case 'DELETE_SERVICE': {
      const { [action.payload]: _, ...remainingBudget } = state.budgetData;
      void _;
      return {
        ...state,
        services: state.services.filter((s) => s.id !== action.payload),
        budgetData: remainingBudget,
      };
    }

    case 'SET_BUDGET_CONFIG': {
      return { ...state, budgetConfig: action.payload };
    }

    case 'SET_BUDGET_FIELD': {
      const { serviceId, monthIndex, field, value } = action.payload;
      const serviceBudget = { ...state.budgetData[serviceId] };
      if (!serviceBudget) return state;

      if (monthIndex === 0) {
        // Source month: update and propagate to non-overridden months
        serviceBudget[0] = updateMonthField(serviceBudget[0], field, value, false);
        for (let i = 1; i < 12; i++) {
          if (!serviceBudget[i][field].isOverridden) {
            serviceBudget[i] = updateMonthField(serviceBudget[i], field, value, false);
          }
        }
      } else {
        serviceBudget[monthIndex] = updateMonthField(
          serviceBudget[monthIndex],
          field,
          value,
          true
        );
      }

      return {
        ...state,
        budgetData: { ...state.budgetData, [serviceId]: serviceBudget },
      };
    }

    case 'CLEAR_OVERRIDE': {
      const { serviceId, monthIndex, field } = action.payload;
      if (monthIndex === 0) return state;

      const serviceBudget = { ...state.budgetData[serviceId] };
      if (!serviceBudget) return state;

      const sourceValue = serviceBudget[0][field].value;
      serviceBudget[monthIndex] = updateMonthField(
        serviceBudget[monthIndex],
        field,
        sourceValue,
        false
      );

      return {
        ...state,
        budgetData: { ...state.budgetData, [serviceId]: serviceBudget },
      };
    }

    case 'LOAD_STATE': {
      return action.payload;
    }

    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [savedState, setSavedState] = useLocalStorage<AppState>(
    'cloud-budgetter-state',
    createDefaultState()
  );
  const [state, dispatch] = useReducer(appReducer, savedState);

  useEffect(() => {
    setSavedState(state);
  }, [state, setSavedState]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
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
