/** Client-side CSV export for the currently visible/filtered dataset. */
export function downloadCsv(
  filename: string,
  rows: Record<string, unknown>[],
  columns?: { key: string; header: string }[],
): void {
  if (rows.length === 0) return;
  const cols = columns ?? Object.keys(rows[0]).map((key) => ({ key, header: key }));
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const lines = [
    cols.map((c) => escape(c.header)).join(','),
    ...rows.map((row) => cols.map((c) => escape(row[c.key])).join(',')),
  ];
  const blob = new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
