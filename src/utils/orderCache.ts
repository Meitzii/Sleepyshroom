import type { Order } from '../types/index.ts';

const ORDERS_CACHE_KEY = 'sleepyshroom_orders';
const MAX_CACHED_ORDERS = 50;

function readCachedOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOrderToLocalCache(order: Order): void {
  if (!order) return;
  try {
    const existing = readCachedOrders();
    const key = order.downloadToken || order.orderNumber || order.id;
    const filtered = existing.filter(
      (item) => (item.downloadToken || item.orderNumber || item.id) !== key
    );
    const updated = [order, ...filtered].slice(0, MAX_CACHED_ORDERS);
    localStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota / privacy mode restrictions
  }
}

export function findOrderInLocalCache(idOrToken: string): Order | null {
  const target = String(idOrToken || '').trim();
  if (!target) return null;
  const cached = readCachedOrders();
  return (
    cached.find(
      (o) => o.downloadToken === target || o.orderNumber === target || o.id === target
    ) || null
  );
}

export function getOrdersForCustomerEmail(email: string): Order[] {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return [];
  return readCachedOrders().filter(
    (o) => String(o.customerEmail || '').trim().toLowerCase() === normalized
  );
}

export function mergeAndDeduplicateOrders(primary: Order[], secondary: Order[]): Order[] {
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
