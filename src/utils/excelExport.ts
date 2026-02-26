import { saveAs } from 'file-saver';
import { calculateMonthCost } from './calculations';
import { generateMonthLabels } from './months';
import type { BudgetModel } from '../types';

// --- Style constants ---

const NAVY_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1E3A5F' } };
const WHITE_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
const CURRENCY_FMT = '$#,##0';
const PERCENT_FMT = '0.0%';
const THIN_BORDER = {
  top: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
  bottom: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
  left: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
  right: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
};

const FILL_COLORS = [
  '3b82f6', '10b981', 'f59e0b', 'f43f5e',
  '8b5cf6', '06b6d4', 'f97316', '14b8a6',
  'ec4899', '6366f1', '84cc16', 'd946ef',
];

// --- Heat map helpers ---

function heatMapArgb(value: number, min: number, max: number): string | undefined {
  const range = max - min;
  if (range <= 0 || value <= 0) return undefined;
  const t = (value - min) / range;
  const r = t < 0.5 ? Math.round(220 + (240 - 220) * (t * 2)) : 245;
  const g = t < 0.5 ? 240 : Math.round(240 - (240 - 220) * ((t - 0.5) * 2));
  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  return `FF${rHex}${gHex}DC`;
}

function deltaColorArgb(value: number, min: number, max: number): string | undefined {
  if (value === 0 && min === 0 && max === 0) return undefined;
  const range = max - min;
  if (range === 0) return undefined;
  const t = (value - min) / range;
  const r = Math.round(220 + 25 * t);
  const g = Math.round(240 - 20 * t);
  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  return `FF${rHex}${gHex}DC`;
}

function solidFill(argb: string) {
  return { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } };
}

// --- Main export function ---

export async function exportExcelReport(model: BudgetModel): Promise<void> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();

  const services = model.data.services;
  const budgetConfig = model.data.budgetConfig;
  const budgetData = model.data.budgetData;
  const monthLabels = generateMonthLabels(budgetConfig.startMonth, budgetConfig.startYear);

  // --- Compute cost data ---
  const costGrid: Record<string, number[]> = {};
  const costByService: Record<string, number> = {};
  const costByMonth: number[] = Array(12).fill(0);
  let grandTotal = 0;

  for (const service of services) {
    const serviceBudget = budgetData[service.id];
    if (!serviceBudget) continue;
    costGrid[service.id] = [];
    costByService[service.id] = 0;

    for (let m = 0; m < 12; m++) {
      const entry = serviceBudget[m];
      const cost = calculateMonthCost(
        entry.consumption.value,
        service.unitCost,
        entry.efficiency.value,
        entry.overhead.value,
        entry.discount.value,
        service.discountEligible,
      );
      costGrid[service.id][m] = cost;
      costByService[service.id] += cost;
      costByMonth[m] += cost;
      grandTotal += cost;
    }
  }

  const deltaByMonth = costByMonth.map((cost, i) => (i === 0 ? 0 : cost - costByMonth[i - 1]));

  // ==============================
  // Sheet 1: Executive Summary
  // ==============================
  const ws1 = workbook.addWorksheet('Executive Summary');
  ws1.getColumn(1).width = 30;
  ws1.getColumn(2).width = 18;
  ws1.getColumn(3).width = 18;
  ws1.getColumn(4).width = 14;

  // Row 1: Title
  ws1.mergeCells('A1:D1');
  const titleCell = ws1.getCell('A1');
  titleCell.value = 'Cloud Budget Report';
  titleCell.font = { bold: true, size: 18, color: { argb: 'FF1E3A5F' } };

  // Row 2: Model name
  ws1.getCell('A2').value = model.name;
  ws1.getCell('A2').font = { size: 13, color: { argb: 'FF4B5563' } };

  // Row 3: Period
  const period = `${monthLabels[0]} – ${monthLabels[11]}`;
  ws1.getCell('A3').value = period;
  ws1.getCell('A3').font = { size: 11, color: { argb: 'FF6B7280' } };

  // Row 4: Generated date
  ws1.getCell('A4').value = `Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  ws1.getCell('A4').font = { size: 10, color: { argb: 'FF9CA3AF' } };

  // Row 5: Spacer

  // Row 6: Grand total
  ws1.mergeCells('A6:D6');
  const grandTotalCell = ws1.getCell('A6');
  grandTotalCell.value = grandTotal;
  grandTotalCell.numFmt = CURRENCY_FMT;
  grandTotalCell.font = { bold: true, size: 22, color: { argb: 'FF1E40AF' } };
  grandTotalCell.fill = solidFill('FFDBEAFE');

  // Row 7: Monthly average
  ws1.getCell('A7').value = 'Monthly average:';
  ws1.getCell('A7').font = { size: 11, color: { argb: 'FF6B7280' } };
  ws1.getCell('B7').value = grandTotal / 12;
  ws1.getCell('B7').numFmt = CURRENCY_FMT;
  ws1.getCell('B7').font = { bold: true, size: 11 };

  // Row 8: Spacer

  // Row 9: Table header
  const headerLabels = ['Service', 'Annual Total', 'Monthly Avg', '% of Total'];
  const headerRow = ws1.getRow(9);
  headerLabels.forEach((label, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = label;
    cell.font = WHITE_FONT;
    cell.fill = NAVY_FILL;
    cell.alignment = { horizontal: i === 0 ? 'left' : 'right', vertical: 'middle' };
    cell.border = THIN_BORDER;
  });
  headerRow.height = 28;

  // Row 10+: Service rows
  let rowIdx = 10;
  const ALT_FILL = solidFill('FFF9FAFB');

  for (let sIdx = 0; sIdx < services.length; sIdx++) {
    const service = services[sIdx];
    const svcTotal = costByService[service.id] ?? 0;
    const pct = grandTotal > 0 ? svcTotal / grandTotal : 0;
    const row = ws1.getRow(rowIdx);
    const colorHex = FILL_COLORS[sIdx % FILL_COLORS.length];

    row.getCell(1).value = service.name;
    row.getCell(1).font = { bold: true, size: 11 };
    row.getCell(1).border = {
      ...THIN_BORDER,
      left: { style: 'medium' as const, color: { argb: `FF${colorHex}` } },
    };

    row.getCell(2).value = svcTotal;
    row.getCell(2).numFmt = CURRENCY_FMT;
    row.getCell(2).alignment = { horizontal: 'right' };
    row.getCell(2).border = THIN_BORDER;

    row.getCell(3).value = svcTotal / 12;
    row.getCell(3).numFmt = CURRENCY_FMT;
    row.getCell(3).alignment = { horizontal: 'right' };
    row.getCell(3).border = THIN_BORDER;

    row.getCell(4).value = pct;
    row.getCell(4).numFmt = PERCENT_FMT;
    row.getCell(4).alignment = { horizontal: 'right' };
    row.getCell(4).border = THIN_BORDER;

    // Alternating row shading
    if (sIdx % 2 === 1) {
      for (let c = 1; c <= 4; c++) {
        const cell = row.getCell(c);
        if (c === 1) {
          cell.fill = ALT_FILL;
          cell.border = {
            ...THIN_BORDER,
            left: { style: 'medium' as const, color: { argb: `FF${colorHex}` } },
          };
        } else {
          cell.fill = ALT_FILL;
        }
      }
    }

    rowIdx++;
  }

  // Total row
  const totalRow = ws1.getRow(rowIdx);
  totalRow.getCell(1).value = 'Total';
  totalRow.getCell(1).font = { bold: true, size: 11 };
  totalRow.getCell(1).border = { ...THIN_BORDER, top: { style: 'medium' as const, color: { argb: 'FF1E3A5F' } } };

  totalRow.getCell(2).value = grandTotal;
  totalRow.getCell(2).numFmt = CURRENCY_FMT;
  totalRow.getCell(2).font = { bold: true };
  totalRow.getCell(2).alignment = { horizontal: 'right' };
  totalRow.getCell(2).border = { ...THIN_BORDER, top: { style: 'medium' as const, color: { argb: 'FF1E3A5F' } } };

  totalRow.getCell(3).value = grandTotal / 12;
  totalRow.getCell(3).numFmt = CURRENCY_FMT;
  totalRow.getCell(3).font = { bold: true };
  totalRow.getCell(3).alignment = { horizontal: 'right' };
  totalRow.getCell(3).border = { ...THIN_BORDER, top: { style: 'medium' as const, color: { argb: 'FF1E3A5F' } } };

  totalRow.getCell(4).value = 1;
  totalRow.getCell(4).numFmt = PERCENT_FMT;
  totalRow.getCell(4).font = { bold: true };
  totalRow.getCell(4).alignment = { horizontal: 'right' };
  totalRow.getCell(4).border = { ...THIN_BORDER, top: { style: 'medium' as const, color: { argb: 'FF1E3A5F' } } };

  // ==============================
  // Sheet 2: Monthly Timeline
  // ==============================
  const ws2 = workbook.addWorksheet('Monthly Timeline');
  ws2.getColumn(1).width = 24;
  for (let c = 2; c <= 13; c++) ws2.getColumn(c).width = 14;
  ws2.getColumn(14).width = 16;

  // Row 1: Title
  ws2.mergeCells('A1:N1');
  const title2Cell = ws2.getCell('A1');
  title2Cell.value = 'Monthly Cost Timeline';
  title2Cell.font = { bold: true, size: 16, color: { argb: 'FF1E3A5F' } };

  // Row 2: Spacer

  // Row 3: Header
  const hdrRow2 = ws2.getRow(3);
  hdrRow2.getCell(1).value = 'Service';
  for (let m = 0; m < 12; m++) {
    hdrRow2.getCell(m + 2).value = monthLabels[m];
  }
  hdrRow2.getCell(14).value = 'Total';
  hdrRow2.height = 28;

  for (let c = 1; c <= 14; c++) {
    const cell = hdrRow2.getCell(c);
    cell.font = WHITE_FONT;
    cell.fill = NAVY_FILL;
    cell.alignment = { horizontal: c === 1 ? 'left' : 'right', vertical: 'middle' };
    cell.border = THIN_BORDER;
  }

  // Row 4+: Service rows
  let r2 = 4;
  for (let sIdx = 0; sIdx < services.length; sIdx++) {
    const service = services[sIdx];
    const costs = costGrid[service.id] ?? [];
    const svcMin = costs.length > 0 ? Math.min(...costs) : 0;
    const svcMax = costs.length > 0 ? Math.max(...costs) : 0;
    const row = ws2.getRow(r2);

    row.getCell(1).value = service.name;
    row.getCell(1).font = { bold: true, size: 10 };
    row.getCell(1).border = THIN_BORDER;

    for (let m = 0; m < 12; m++) {
      const cell = row.getCell(m + 2);
      cell.value = costs[m] ?? 0;
      cell.numFmt = CURRENCY_FMT;
      cell.alignment = { horizontal: 'right' };
      cell.border = THIN_BORDER;
      const hm = heatMapArgb(costs[m] ?? 0, svcMin, svcMax);
      if (hm) cell.fill = solidFill(hm);
    }

    row.getCell(14).value = costByService[service.id] ?? 0;
    row.getCell(14).numFmt = CURRENCY_FMT;
    row.getCell(14).font = { bold: true, size: 10 };
    row.getCell(14).alignment = { horizontal: 'right' };
    row.getCell(14).border = THIN_BORDER;

    r2++;
  }

  // Total row
  const minTotal = Math.min(...costByMonth);
  const maxTotal = Math.max(...costByMonth);
  const tRow = ws2.getRow(r2);
  tRow.getCell(1).value = 'Total';
  tRow.getCell(1).font = { bold: true, size: 11 };
  tRow.getCell(1).border = { ...THIN_BORDER, top: { style: 'medium' as const, color: { argb: 'FF1E3A5F' } } };

  for (let m = 0; m < 12; m++) {
    const cell = tRow.getCell(m + 2);
    cell.value = costByMonth[m];
    cell.numFmt = CURRENCY_FMT;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'right' };
    cell.border = { ...THIN_BORDER, top: { style: 'medium' as const, color: { argb: 'FF1E3A5F' } } };
    const hm = heatMapArgb(costByMonth[m], minTotal, maxTotal);
    if (hm) cell.fill = solidFill(hm);
  }

  tRow.getCell(14).value = grandTotal;
  tRow.getCell(14).numFmt = CURRENCY_FMT;
  tRow.getCell(14).font = { bold: true, size: 11 };
  tRow.getCell(14).alignment = { horizontal: 'right' };
  tRow.getCell(14).border = { ...THIN_BORDER, top: { style: 'medium' as const, color: { argb: 'FF1E3A5F' } } };
  r2++;

  // Delta row
  const deltas = deltaByMonth.slice(1);
  const minDelta = deltas.length > 0 ? Math.min(...deltas) : 0;
  const maxDelta = deltas.length > 0 ? Math.max(...deltas) : 0;
  const dRow = ws2.getRow(r2);
  dRow.getCell(1).value = 'Delta';
  dRow.getCell(1).font = { bold: true, size: 10, color: { argb: 'FF6B7280' } };
  dRow.getCell(1).border = THIN_BORDER;

  for (let m = 0; m < 12; m++) {
    const cell = dRow.getCell(m + 2);
    const delta = deltaByMonth[m];
    if (m === 0) {
      cell.value = '';
      cell.font = { color: { argb: 'FF9CA3AF' } };
    } else {
      cell.value = delta;
      cell.numFmt = '+$#,##0;-$#,##0;$0';
      cell.font = {
        bold: true,
        size: 10,
        color: { argb: delta > 0 ? 'FFB91C1C' : delta < 0 ? 'FF15803D' : 'FF6B7280' },
      };
      const dc = deltaColorArgb(delta, minDelta, maxDelta);
      if (dc) cell.fill = solidFill(dc);
    }
    cell.alignment = { horizontal: 'right' };
    cell.border = THIN_BORDER;
  }

  dRow.getCell(14).value = '';
  dRow.getCell(14).border = THIN_BORDER;

  // Freeze panes: column A + row 3
  ws2.views = [{ state: 'frozen', xSplit: 1, ySplit: 3 }];

  // --- Write and save ---
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const safeName = model.name.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
  const dateStamp = new Date().toISOString().slice(0, 10);
  saveAs(blob, `${safeName}-Report-${dateStamp}.xlsx`);
}
