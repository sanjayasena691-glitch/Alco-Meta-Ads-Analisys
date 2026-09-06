/**
 * Indonesian Rupiah and Metric Formatters
 * Adheres strictly to Zero-Fabrication: null or undefined values output 'N/A'.
 */

export function formatCurrency(amount: number | null | undefined, currency: string = 'IDR', compact = false): string {
  if (amount === null || amount === undefined || isNaN(amount) || !isFinite(amount)) {
    return 'N/A';
  }

  const upperCurr = (currency || 'IDR').toUpperCase();
  
  if (compact) {
    const symbol = upperCurr === 'IDR' ? 'Rp' : upperCurr === 'USD' ? '$' : `${upperCurr} `;
    if (Math.abs(amount) >= 1_000_000_000) {
      return `${symbol}${(amount / 1_000_000_000).toFixed(1)} M`;
    }
    if (Math.abs(amount) >= 1_000_000) {
      return `${symbol}${(amount / 1_000_000).toFixed(1)} jt`;
    }
    if (Math.abs(amount) >= 1_000) {
      return `${symbol}${(amount / 1_000).toFixed(0)} rb`;
    }
  }

  try {
    return new Intl.NumberFormat(upperCurr === 'IDR' ? 'id-ID' : 'en-US', {
      style: 'currency',
      currency: upperCurr,
      maximumFractionDigits: upperCurr === 'IDR' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${upperCurr} ${amount.toLocaleString()}`;
  }
}

export function formatRupiah(amount: number | null | undefined, compact = false): string {
  return formatCurrency(amount, 'IDR', compact);
}

export function formatNullableCurrency(amount: number | null | undefined, currency: string = 'IDR', compact = false): string {
  return formatCurrency(amount, currency, compact);
}

export function formatNullableRupiah(amount: number | null | undefined, compact = false): string {
  return formatCurrency(amount, 'IDR', compact);
}

export function formatPercent(value: number | null | undefined, includeSign = false, decimals = 1): string {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return 'N/A';
  const sign = includeSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatNullablePercent(value: number | null | undefined, includeSign = false, decimals = 1): string {
  return formatPercent(value, includeSign, decimals);
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return 'N/A';
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

export function formatNullableNumber(value: number | null | undefined, decimals = 0): string {
  return formatNumber(value, decimals);
}

export function formatRoas(roas: number | null | undefined): string {
  if (roas === null || roas === undefined || isNaN(roas) || !isFinite(roas)) return 'N/A';
  return `${roas.toFixed(2)}x`;
}

export function formatNullableRoas(roas: number | null | undefined): string {
  return formatRoas(roas);
}

export function formatFrequency(freq: number | null | undefined): string {
  if (freq === null || freq === undefined || isNaN(freq) || !isFinite(freq)) return 'N/A';
  return freq.toFixed(2);
}

export function formatNullableFrequency(freq: number | null | undefined): string {
  return formatFrequency(freq);
}

/**
 * Calculates percentage change between current and previous metrics.
 * Returns null if either value is null/undefined or if previous value is 0 (to avoid misleading infinity/100% leaps).
 */
export function calculatePercentChange(current?: number | null, previous?: number | null): number | null {
  if (
    current === undefined ||
    current === null ||
    !Number.isFinite(current) ||
    previous === undefined ||
    previous === null ||
    !Number.isFinite(previous) ||
    previous === 0
  ) {
    if (current === 0 && previous === 0) return 0;
    return null;
  }
  return ((current - previous) / previous) * 100;
}

