import type { CartItem, DiscountCode } from '../types/index.ts';

export const DEFAULT_USD_TO_PHP_RATE = 58;

export function usdToPhp(usdAmount: number, rate = DEFAULT_USD_TO_PHP_RATE): number {
  const num = Number(usdAmount || 0);
  if (!Number.isFinite(num) || num <= 0) return 0;
  const effectiveRate = Number(rate) > 0 ? Number(rate) : DEFAULT_USD_TO_PHP_RATE;
  return Number((num * effectiveRate).toFixed(2));
}

export function phpToCentavos(phpAmount: number): number {
  const num = Number(phpAmount || 0);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round(num * 100);
}

export function formatPhp(phpAmount: number, includeCode = true): string {
  const num = Number(phpAmount || 0);
  const safe = Number.isFinite(num) ? num : 0;
  const formatted = safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return includeCode ? `₱${formatted} PHP` : `₱${formatted}`;
}

export function formatOrderMoney(amount: number, currency?: string): string {
  const code = String(currency || 'PHP').toUpperCase();
  if (code === 'USD') {
    return `$${Number(amount || 0).toFixed(2)} USD`;
  }
  return formatPhp(amount, true);
}

export interface CheckoutPhpBreakdown {
  phpRate: number;
  items: {
    productId: string;
    quantity: number;
    unitUsd: number;
    unitPhp: number;
    linePhp: number;
    lineCentavos: number;
  }[];
  subtotalUsd: number;
  subtotalPhp: number;
  subtotalCentavos: number;
  discountPhp: number;
  discountCentavos: number;
  totalPhp: number;
  totalCentavos: number;
}

export function calculateCheckoutPhpBreakdown(
  cart: CartItem[],
  appliedDiscount: DiscountCode | null,
  rate = DEFAULT_USD_TO_PHP_RATE
): CheckoutPhpBreakdown {
  const phpRate = Number(rate) > 0 ? Number(rate) : DEFAULT_USD_TO_PHP_RATE;
  let subtotalUsd = 0;
  let subtotalCentavos = 0;

  const items = cart.map((item) => {
    const qty = Math.max(1, Math.min(50, Math.floor(Number(item.quantity) || 1)));
    const unitUsd = Number(item.product.price || 0);
    const unitPhp = usdToPhp(unitUsd, phpRate);
    const unitCentavos = phpToCentavos(unitPhp);
    const lineCentavos = unitCentavos * qty;

    subtotalUsd += unitUsd * qty;
    subtotalCentavos += lineCentavos;

    return {
      productId: item.product.id,
      quantity: qty,
      unitUsd,
      unitPhp,
      linePhp: Number((lineCentavos / 100).toFixed(2)),
      lineCentavos,
    };
  });

  subtotalUsd = Number(subtotalUsd.toFixed(2));
  const subtotalPhp = Number((subtotalCentavos / 100).toFixed(2));

  let rawDiscountPhp = 0;
  if (appliedDiscount && subtotalUsd + 0.0001 >= Number(appliedDiscount.minSpend || 0)) {
    if (appliedDiscount.type === 'percentage') {
      rawDiscountPhp = (subtotalPhp * Number(appliedDiscount.value || 0)) / 100;
    } else {
      rawDiscountPhp = Math.min(subtotalPhp, usdToPhp(Number(appliedDiscount.value || 0), phpRate));
    }
  }

  const clampedDiscountPhp = Number(Math.max(0, Math.min(subtotalPhp, rawDiscountPhp)).toFixed(2));
  const discountCentavos = Math.min(subtotalCentavos, phpToCentavos(clampedDiscountPhp));
  const totalCentavos = Math.max(0, subtotalCentavos - discountCentavos);

  return {
    phpRate,
    items,
    subtotalUsd,
    subtotalPhp,
    subtotalCentavos,
    discountPhp: Number((discountCentavos / 100).toFixed(2)),
    discountCentavos,
    totalPhp: Number((totalCentavos / 100).toFixed(2)),
    totalCentavos,
  };
}
