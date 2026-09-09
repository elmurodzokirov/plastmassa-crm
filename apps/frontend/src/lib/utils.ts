import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('uz-UZ')} so'm`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString('uz-UZ');
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Exports rows of data to a CSV file (opens correctly in Excel thanks to the UTF-8 BOM)
 * and triggers a browser download.
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
): void {
  const escapeCell = (cell: string | number) => {
    const value = String(cell ?? '');
    if (/[",\n;]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','));
  const csvContent = '﻿' + lines.join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
