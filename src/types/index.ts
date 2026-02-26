export interface Service {
  id: string;
  name: string;
  unitType: string;
  unitCost: number;
  discountEligible: boolean;
  defaultEfficiency: number;
  defaultOverhead: number;
  createdAt: number;
}

export interface PropagatedField {
  value: number;
  isOverridden: boolean;
}

export interface BudgetMonthEntry {
  consumption: PropagatedField;
  efficiency: PropagatedField;
  overhead: PropagatedField;
  discount: PropagatedField;
}

export type ServiceBudget = Record<number, BudgetMonthEntry>;

export type BudgetData = Record<string, ServiceBudget>;

export interface BudgetConfig {
  startMonth: number;
  startYear: number;
}

export interface ModelData {
  services: Service[];
  budgetConfig: BudgetConfig;
  budgetData: BudgetData;
}

export interface Version {
  number: number;
  name: string;
  timestamp: number;
  shared: boolean;
  data: ModelData;
}

export interface BudgetModel {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  data: ModelData;
  versions: Version[];
}

export interface AppState {
  schemaVersion: number;
  models: BudgetModel[];
  activeModelId: string | null;
}

export type TabId = 'services' | 'budget' | 'summary';

export type BudgetFieldKey = 'consumption' | 'efficiency' | 'overhead' | 'discount';
