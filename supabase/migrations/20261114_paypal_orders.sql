-- Sleepyshroom PayPal Orders Migration (Additive & Non-Destructive)
-- Preserves all historical orders, order items, profiles, products, and contact messages
-- while adding PayPal tracking columns, refund audit columns, and USD defaults.

-- 1. Extend public.orders safely without deleting or rewriting existing data
alter table public.orders
  add column if not exists paypal_order_id text,
  add column if not exists paypal_capture_id text,
  add column if not exists paypal_payer_id text,
  add column if not exists paypal_event_id text,
  add column if not exists paypal_refund_id text,
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_reason text;

alter table public.orders
  alter column currency set default 'USD',
  alter column payment_provider set default 'paypal';

create unique index if not exists idx_orders_paypal_order_id_unique
  on public.orders (paypal_order_id)
  where paypal_order_id is not null and paypal_order_id <> '';

create index if not exists idx_orders_paypal_capture_id
  on public.orders (paypal_capture_id)
  where paypal_capture_id is not null and paypal_capture_id <> '';

-- 2. Safely allow PayPal lifecycle statuses alongside legacy rows
do $$
declare
  v_conname text;
begin
  for v_conname in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'orders'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.orders drop constraint if exists %I', v_conname);
  end loop;
end $$;

alter table public.orders
  add constraint orders_status_valid check (
    status in ('pending', 'paid', 'completed', 'failed', 'cancelled', 'expired', 'refunded', 'processing')
  ) not valid,
  add constraint orders_payment_status_valid check (
    payment_status in ('pending', 'paid', 'completed', 'failed', 'cancelled', 'expired', 'refunded')
  ) not valid;

-- 3. Ensure webhook idempotency table exists & uses paypal default
create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'paypal',
  event_id text not null unique,
  event_type text not null,
  checkout_session_id text,
  payment_id text,
  livemode boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now()
);

alter table public.payment_webhook_events
  alter column provider set default 'paypal';

alter table public.payment_webhook_events enable row level security;
revoke all on table public.payment_webhook_events from anon, authenticated;
grant all on table public.payment_webhook_events to service_role;

-- 4. Update strictly pending-only checkout RPC for PayPal Orders v2
drop function if exists public.create_checkout_order(
  uuid, uuid, text, text, text, numeric, numeric, text, numeric, text, text, text, text, text, jsonb, jsonb
);
drop function if exists public.create_checkout_order(
  uuid, uuid, text, text, text, numeric, numeric, text, numeric, text, text, text, text, text, text, jsonb, jsonb
);

create or replace function public.create_checkout_order(
  p_id uuid,
  p_user_id uuid,
  p_order_number text,
  p_customer_email text,
  p_customer_name text,
  p_subtotal numeric,
  p_discount numeric,
  p_discount_code text,
  p_total_amount numeric,
  p_currency text,
  p_payment_provider text,
  p_payment_method text,
  p_paypal_order_id text,
  p_download_token text,
  p_billing_details jsonb,
  p_items_json jsonb
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_row public.orders;
begin
  v_uid := coalesce(
    auth.uid(),
    case
      when coalesce(auth.jwt() ->> 'role', '') = 'service_role' then p_user_id
      else null
    end
  );

  insert into public.orders (
    id,
    user_id,
    order_number,
    customer_email,
    customer_name,
    status,
    subtotal,
    discount,
    discount_code,
    total_amount,
    currency,
    payment_provider,
    payment_method,
    payment_status,
    payment_reference,
    transaction_id,
    paypal_order_id,
    download_token,
    download_count,
    billing_details,
    items_json
  )
  values (
    coalesce(p_id, gen_random_uuid()),
    v_uid,
    p_order_number,
    trim(p_customer_email),
    coalesce(nullif(trim(p_customer_name), ''), 'Valued Customer'),
    'pending',
    coalesce(p_subtotal, 0),
    coalesce(p_discount, 0),
    nullif(trim(coalesce(p_discount_code, '')), ''),
    coalesce(p_total_amount, 0),
    coalesce(nullif(upper(trim(p_currency)), ''), 'USD'),
    coalesce(nullif(trim(p_payment_provider), ''), 'paypal'),
    coalesce(nullif(trim(p_payment_method), ''), 'PayPal Checkout'),
    'pending',
    p_paypal_order_id,
    p_paypal_order_id,
    p_paypal_order_id,
    p_download_token,
    0,
    coalesce(p_billing_details, '{}'::jsonb),
    coalesce(p_items_json, '[]'::jsonb)
  )
  returning * into v_row;

  begin
    insert into public.order_items (
      order_id,
      product_id,
      unit_price,
      quantity,
      product_slug,
      product_title,
      download_file_name
    )
    select
      v_row.id,
      p.id,
      coalesce((item ->> 'price')::numeric, p.price),
      greatest(1, coalesce((item ->> 'quantity')::integer, 1)),
      p.slug,
      item ->> 'title',
      item ->> 'downloadFileName'
    from jsonb_array_elements(coalesce(p_items_json, '[]'::jsonb)) as item
    join public.products p
      on (coalesce(item ->> 'slug', '') <> '' and p.slug = item ->> 'slug')
      or p.id::text = coalesce(item ->> 'productId', '');
  exception when others then
    null;
  end;

  return v_row;
end;
$$;

revoke all on function public.create_checkout_order(
  uuid, uuid, text, text, text, numeric, numeric, text, numeric, text, text, text, text, text, jsonb, jsonb
) from public;
grant execute on function public.create_checkout_order(
  uuid, uuid, text, text, text, numeric, numeric, text, numeric, text, text, text, text, text, jsonb, jsonb
) to anon, authenticated, service_role;
