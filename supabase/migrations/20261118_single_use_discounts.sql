-- Safe additive migration for single-use promo/discount code tracking & instant order support
create index if not exists idx_orders_discount_code_paid
  on public.orders (lower(discount_code))
  where discount_code is not null and payment_status in ('paid', 'completed');

-- Helper RPC callable by storefront server to check if a promo code was already redeemed
create or replace function public.is_discount_code_redeemed(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    where lower(coalesce(o.discount_code, '')) = lower(trim(coalesce(p_code, '')))
      and lower(coalesce(o.payment_status, o.status, '')) in ('paid', 'completed')
  )
  or exists (
    select 1
    from public.site_settings s
    where s.id = 'default'
      and coalesce(s.settings_json -> 'redeemedDiscountCodes', '{}'::jsonb) ? upper(trim(coalesce(p_code, '')))
  );
$$;

revoke all on function public.is_discount_code_redeemed(text) from public;
grant execute on function public.is_discount_code_redeemed(text) to anon, authenticated, service_role;
