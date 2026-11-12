import type { CartItem, DiscountCode } from '../types/index.ts';

export function usdToCents(usdAmount: number): number {
  const num = Number(usdAmount || 0);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round(num * 100);
}

export function centsToUsd(cents: number): number {
  const num = Number(cents || 0);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Number((Math.round(num) / 100).toFixed(2));
}

export function formatUsd(usdAmount: number, includeCode = true): string {
  const num = Number(usdAmount || 0);
  const safe = Number.isFinite(num) ? num : 0;
  const formatted = safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return includeCode ? `$${formatted} USD` : `$${formatted}`;
}

export function formatOrderMoney(amount: number, currency?: string): string {
  const code = String(currency || 'USD').toUpperCase();
  if (code === 'PHP') {
    const num = Number(amount || 0);
    const safe = Number.isFinite(num) ? num : 0;
    return `₱${safe.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} PHP`;
  }
  return formatUsd(amount, true);
}

export interface CheckoutUsdBreakdown {
  items: {
    productId: string;
    quantity: number;
    unitUsd: number;
    unitCents: number;
    lineUsd: number;
    lineCents: number;
  }[];
  subtotalUsd: number;
  subtotalCents: number;
  discountUsd: number;
  discountCents: number;
  totalUsd: number;
  totalCents: number;
}

export function calculateCheckoutBreakdown(
  cart: CartItem[],
  appliedDiscount: DiscountCode | null
): CheckoutUsdBreakdown {
  let subtotalCents = 0;

  const items = cart.map((item) => {
    const qty = Math.max(1, Math.min(50, Math.floor(Number(item.quantity) || 1)));
    const unitCents = usdToCents(item.product.price);
    const unitUsd = centsToUsd(unitCents);
    const lineCents = unitCents * qty;

    subtotalCents += lineCents;

    return {
      productId: item.product.id,
      quantity: qty,
      unitUsd,
      unitCents,
      lineUsd: centsToUsd(lineCents),
      lineCents,
    };
  });

  let discountCents = 0;
  if (appliedDiscount && subtotalCents >= usdToCents(Number(appliedDiscount.minSpend || 0))) {
    if (appliedDiscount.type === 'percentage') {
      discountCents = Math.round((subtotalCents * Number(appliedDiscount.value || 0)) / 100);
    } else {
      discountCents = usdToCents(Number(appliedDiscount.value || 0));
    }
  }

  discountCents = Math.max(0, Math.min(subtotalCents, discountCents));
  const totalCents = Math.max(0, subtotalCents - discountCents);

  return {
    items,
    subtotalUsd: centsToUsd(subtotalCents),
    subtotalCents,
    discountUsd: centsToUsd(discountCents),
    discountCents,
    totalUsd: centsToUsd(totalCents),
    totalCents,
  };
}
