import type { ModelData, BudgetFieldKey } from '../types';
import { calculateMonthCost } from './calculations';

export interface FieldDiff {
  field: BudgetFieldKey;
  month: number;
  oldValue: number;
  newValue: number;
}

export interface ServiceDiff {
  serviceId: string;
  serviceName: string;
  status: 'added' | 'removed' | 'changed' | 'unchanged';
  fieldDiffs: FieldDiff[];
  oldTotalCost: number;
  newTotalCost: number;
}

export interface CompareResult {
  services: ServiceDiff[];
  oldGrandTotal: number;
  newGrandTotal: number;
}

const FIELDS: BudgetFieldKey[] = ['consumption', 'efficiency', 'overhead', 'discount'];

function computeServiceTotal(data: ModelData, serviceId: string): number {
  const service = data.services.find((s) => s.id === serviceId);
  const budget = data.budgetData[serviceId];
  if (!service || !budget) return 0;
  let total = 0;
  for (let m = 0; m < 12; m++) {
    const e = budget[m];
    if (!e) continue;
    total += calculateMonthCost(
      e.consumption.value, service.unitCost,
      e.efficiency.value, e.overhead.value,
      e.discount.value, service.discountEligible
    );
  }
  return total;
}

export function compareModelData(older: ModelData, newer: ModelData): CompareResult {
  const allServiceIds = new Set([
    ...older.services.map((s) => s.id),
    ...newer.services.map((s) => s.id),
  ]);

  const serviceDiffs: ServiceDiff[] = [];
  let oldGrandTotal = 0;
  let newGrandTotal = 0;

  for (const id of allServiceIds) {
    const inOld = older.services.find((s) => s.id === id);
    const inNew = newer.services.find((s) => s.id === id);
    const oldCost = computeServiceTotal(older, id);
    const newCost = computeServiceTotal(newer, id);
    oldGrandTotal += oldCost;
    newGrandTotal += newCost;

    if (!inOld && inNew) {
      serviceDiffs.push({
        serviceId: id,
        serviceName: inNew.name,
        status: 'added',
        fieldDiffs: [],
        oldTotalCost: 0,
        newTotalCost: newCost,
      });
      continue;
    }

    if (inOld && !inNew) {
      serviceDiffs.push({
        serviceId: id,
        serviceName: inOld.name,
        status: 'removed',
        fieldDiffs: [],
        oldTotalCost: oldCost,
        newTotalCost: 0,
      });
      continue;
    }

    // Both exist — compare field by field
    const oldBudget = older.budgetData[id];
    const newBudget = newer.budgetData[id];
    const fieldDiffs: FieldDiff[] = [];

    if (oldBudget && newBudget) {
      for (let m = 0; m < 12; m++) {
        for (const field of FIELDS) {
          const oldVal = oldBudget[m]?.[field]?.value ?? 0;
          const newVal = newBudget[m]?.[field]?.value ?? 0;
          if (oldVal !== newVal) {
            fieldDiffs.push({ field, month: m, oldValue: oldVal, newValue: newVal });
          }
        }
      }
    }

    serviceDiffs.push({
      serviceId: id,
      serviceName: inNew?.name ?? inOld?.name ?? id,
      status: fieldDiffs.length > 0 ? 'changed' : 'unchanged',
      fieldDiffs,
      oldTotalCost: oldCost,
      newTotalCost: newCost,
    });
  }

  return { services: serviceDiffs, oldGrandTotal, newGrandTotal };
}
