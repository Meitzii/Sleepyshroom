-- Safe additive migration to index single-use promo/discount codes on public.orders
create index if not exists idx_orders_discount_code_paid
  on public.orders (lower(discount_code))
  where discount_code is not null and payment_status in ('paid', 'completed');
