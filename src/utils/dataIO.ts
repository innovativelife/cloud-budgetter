import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { BudgetModel, Version } from '../types';

const DATA_FILENAME = 'cloud-budgetter-model.json';

export async function exportModel(model: BudgetModel): Promise<void> {
  // Only include shared versions in the export
  const exportable: BudgetModel = {
    ...model,
    versions: model.versions.filter((v) => v.shared),
  };

  const zip = new JSZip();
  const json = JSON.stringify(exportable, null, 2);
  zip.file(DATA_FILENAME, json);

  const blob = await zip.generateAsync({ type: 'blob' });
  const safeName = model.name.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
  const timestamp = new Date().toISOString().slice(0, 10);
  saveAs(blob, `${safeName}-${timestamp}.zip`);
}

export async function importModel(file: File): Promise<BudgetModel> {
  const zip = await JSZip.loadAsync(file);

  let dataFile = zip.file(DATA_FILENAME);
  const isLegacy = !dataFile;
  if (!dataFile) {
    dataFile = zip.file('cloud-budgetter-data.json');
  }

  if (!dataFile) {
    throw new Error('Invalid archive: no recognizable data file found');
  }

  const json = await dataFile.async('string');
  const parsed = JSON.parse(json);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid data format');
  }

  // Legacy v1 flat state -> wrap into a model
  if (isLegacy && Array.isArray(parsed.services)) {
    const model: BudgetModel = {
      id: crypto.randomUUID(),
      name: file.name.replace(/\.zip$/i, ''),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      data: {
        services: parsed.services,
        budgetConfig: parsed.budgetConfig,
        budgetData: parsed.budgetData,
      },
      versions: [],
    };
    return model;
  }

  // New format: direct model
  if (parsed.id && parsed.data && Array.isArray(parsed.data.services)) {
    // Handle old v2 format files that have separate pointVersions
    const oldPointVersions = Array.isArray(parsed.pointVersions) ? parsed.pointVersions : [];
    const oldVersions = Array.isArray(parsed.versions) ? parsed.versions : [];

    // Mark all imported versions as shared (they were exported, so they are shared)
    const versions: Version[] = [
      ...oldVersions.map((v: Record<string, unknown>) => ({
        number: v.number as number,
        name: v.name as string,
        timestamp: v.timestamp as number,
        shared: true,
        data: v.data,
      } as Version)),
      ...oldPointVersions.map((pv: Record<string, unknown>) => ({
        number: pv.number as number,
        name: pv.name as string,
        timestamp: pv.timestamp as number,
        shared: true,
        data: pv.data,
      } as Version)),
    ];

    // Sort by timestamp, re-number
    versions.sort((a, b) => a.timestamp - b.timestamp);
    versions.forEach((v, i) => { v.number = i + 1; });

    const { pointVersions: _, ...rest } = parsed;
    void _;
    return { ...rest, versions } as BudgetModel;
  }

  throw new Error('Invalid data format');
}

export function mergeVersions(local: Version[], imported: Version[]): Version[] {
  const existingTimestamps = new Set(local.map((v) => v.timestamp));
  const newVersions = imported.filter((v) => !existingTimestamps.has(v.timestamp));
  const merged = [...local, ...newVersions];
  merged.sort((a, b) => a.timestamp - b.timestamp);
  merged.forEach((v, i) => { v.number = i + 1; });
  return merged;
}
