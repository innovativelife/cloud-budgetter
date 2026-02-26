export function calculateMonthCost(
  consumption: number,
  unitCost: number,
  efficiency: number,
  overhead: number,
  discount: number,
  discountEligible: boolean
): number {
  const safeEfficiency = Math.max(efficiency, 1);
  const effectiveDiscount = discountEligible ? discount : 0;

  const cost =
    consumption *
    unitCost *
    (1 + overhead / 100) /
    (safeEfficiency / 100) *
    (1 - effectiveDiscount / 100);

  return Math.max(cost, 0);
}
