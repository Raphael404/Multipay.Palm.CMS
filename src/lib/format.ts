import { format as formatDateFns, formatDistanceToNowStrict, parseISO } from 'date-fns';

const gelFull = new Intl.NumberFormat('ka-GE', {
  style: 'currency',
  currency: 'GEL',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const gelWhole = new Intl.NumberFormat('ka-GE', {
  style: 'currency',
  currency: 'GEL',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 0,
});

/** ₾84.20 / ₾184,000 / compact ₾1.84M */
export function formatGEL(amount: number, opts?: { compact?: boolean }): string {
  if (opts?.compact && Math.abs(amount) >= 10_000) {
    const compact = new Intl.NumberFormat('en', {
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(amount);
    return `₾${compact}`;
  }
  const formatted = Number.isInteger(amount) && Math.abs(amount) >= 1000
    ? gelWhole.format(amount)
    : gelFull.format(amount);
  // ka-GE places the symbol after the amount; normalize to leading ₾
  return `₾${formatted.replace('₾', '').trim()}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

export function formatPercent(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export function formatDate(iso: string, pattern = 'dd MMM yyyy'): string {
  return formatDateFns(parseISO(iso), pattern);
}

export function formatDateTime(iso: string): string {
  return formatDateFns(parseISO(iso), 'dd MMM yyyy, HH:mm');
}

export function formatTimeAgo(iso: string): string {
  return formatDistanceToNowStrict(parseISO(iso), { addSuffix: true });
}
