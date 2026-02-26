const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function generateMonthLabels(startMonth: number, startYear: number): string[] {
  return Array.from({ length: 12 }, (_, i) => {
    const monthIndex = (startMonth + i) % 12;
    const year = startYear + Math.floor((startMonth + i) / 12);
    return `${MONTH_NAMES[monthIndex]} ${year}`;
  });
}
