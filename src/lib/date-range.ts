import type { DateRangePreset } from "@/providers/app-provider";

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function endOfMonth(year: number, monthIndex: number): string {
  return toIsoDate(new Date(year, monthIndex + 1, 0));
}

export function resolveDateRangePreset(preset: DateRangePreset): {
  dateFrom: string;
  dateTo: string;
} {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (preset) {
    case "last_month": {
      const start = new Date(year, month - 1, 1);
      return {
        dateFrom: toIsoDate(start),
        dateTo: endOfMonth(start.getFullYear(), start.getMonth()),
      };
    }
    case "last_3_months":
      return {
        dateFrom: toIsoDate(new Date(year, month - 2, 1)),
        dateTo: endOfMonth(year, month),
      };
    case "year_to_date":
      return {
        dateFrom: `${year}-01-01`,
        dateTo: endOfMonth(year, month),
      };
    case "custom":
    case "this_month":
    default:
      return {
        dateFrom: toIsoDate(new Date(year, month, 1)),
        dateTo: endOfMonth(year, month),
      };
  }
}
