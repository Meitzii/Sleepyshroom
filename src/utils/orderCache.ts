import type { Order } from '../types/index.ts';

const LEGACY_ORDERS_CACHE_KEY = 'sleepyshroom_orders';

/**
 * Payment verification and digital download authorization are strictly server-enforced
 * via PayMongo webhooks, PayMongo session reconciliation, and Supabase records.
 * Client-side localStorage must NEVER be treated as proof of payment or download entitlement.
 */
export function clearLegacyOrderCache(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(LEGACY_ORDERS_CACHE_KEY);
    }
  } catch {
    // Ignore storage access errors
  }
}

export function saveOrderToLocalCache(_order: Order): void {
  clearLegacyOrderCache();
}

export function findOrderInLocalCache(_idOrToken: string): Order | null {
  clearLegacyOrderCache();
  return null;
}

export function getOrdersForCustomerEmail(_email: string): Order[] {
  clearLegacyOrderCache();
  return [];
}

export function mergeAndDeduplicateOrders(primary: Order[], secondary: Order[] = []): Order[] {
  const map = new Map<string, Order>();
  for (const ord of [...primary, ...secondary]) {
    if (!ord) continue;
    const key = ord.downloadToken || ord.orderNumber || ord.id;
    if (!map.has(key)) {
      map.set(key, ord);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
