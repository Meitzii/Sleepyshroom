-- Safe additive PayMongo Orders & Webhook Idempotency Migration
-- Preserves all existing tables (profiles, products, orders, order_items, contact_messages) and existing data.
-- Run this in Supabase Project -> SQL Editor before deploying live/sandbox PayMongo checkout in production.

-- 1. Ensure admin role helper exists cleanly
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        lower(coalesce(p.role, '')) = 'admin'
        or lower(coalesce(p.email, '')) = 'shop.sleepyshroom@gmail.com'
      )
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 2. Safely extend existing public.orders without modifying/removing existing columns
alter table public.orders
  add column if not exists order_number text,
  add column if not exists customer_name text,
  add column if not exists subtotal numeric not null default 0,
  add column if not exists discount numeric not null default 0,
  add column if not exists discount_code text,
  add column if not exists currency text not null default 'PHP',
  add column if not exists payment_provider text default 'paymongo',
  add column if not exists payment_method text,
  add column if not exists payment_status text not null default 'pending',
  add column if not exists payment_reference text,
  add column if not exists transaction_id text,
  add column if not exists download_token text,
  add column if not exists download_count integer not null default 0,
  add column if not exists billing_details jsonb not null default '{}'::jsonb,
  add column if not exists items_json jsonb not null default '[]'::jsonb,
  add column if not exists paymongo_checkout_session_id text,
  add column if not exists paymongo_payment_intent_id text,
  add column if not exists paymongo_payment_id text,
  add column if not exists paymongo_event_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists failure_reason text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_orders_user_id on public.orders (user_id);
create index if not exists idx_orders_customer_email_lower on public.orders (lower(customer_email));
create index if not exists idx_orders_payment_status on public.orders (payment_status);
create unique index if not exists idx_orders_download_token_unique
  on public.orders (download_token)
  where download_token is not null;
create unique index if not exists idx_orders_paymongo_session_unique
  on public.orders (paymongo_checkout_session_id)
  where paymongo_checkout_session_id is not null;

-- Safely ensure status and payment_status allow all PayMongo lifecycle states without failing on legacy rows
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

-- 3. Safely preserve & enrich existing public.order_items (optional metadata columns; keeps product_id FK intact)
alter table public.order_items
  add column if not exists product_slug text,
  add column if not exists product_title text,
  add column if not exists download_file_name text;

-- 4. Webhook idempotency table to guarantee duplicate PayMongo webhook events are ignored safely
create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'paymongo',
  event_id text not null unique,
  event_type text not null,
  checkout_session_id text,
  payment_id text,
  livemode boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now()
);

create index if not exists idx_payment_webhook_events_session
  on public.payment_webhook_events (checkout_session_id);

alter table public.payment_webhook_events enable row level security;
revoke all on table public.payment_webhook_events from anon, authenticated;
grant all on table public.payment_webhook_events to service_role;

-- 5. Strict RLS on public.orders: customers read their own orders; admins read all; only service_role mutates payment state
alter table public.orders enable row level security;

revoke all on table public.orders from anon, authenticated;
grant select on table public.orders to authenticated;
grant all on table public.orders to service_role;

drop policy if exists orders_select_own_or_admin on public.orders;
create policy orders_select_own_or_admin
  on public.orders
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or lower(coalesce(customer_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.is_admin()
  );

drop policy if exists orders_insert_authenticated_own on public.orders;

-- 6. Strictly pending-only checkout order creation RPC (cannot create a paid/completed order from client/anon!)
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
  p_paymongo_checkout_session_id text,
  p_paymongo_payment_intent_id text,
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
    paymongo_checkout_session_id,
    paymongo_payment_intent_id,
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
    coalesce(nullif(trim(p_currency), ''), 'PHP'),
    coalesce(nullif(trim(p_payment_provider), ''), 'paymongo'),
    coalesce(nullif(trim(p_payment_method), ''), 'PayMongo Hosted Checkout'),
    'pending',
    p_paymongo_checkout_session_id,
    p_paymongo_checkout_session_id,
    p_paymongo_checkout_session_id,
    nullif(trim(coalesce(p_paymongo_payment_intent_id, '')), ''),
    p_download_token,
    0,
    coalesce(p_billing_details, '{}'::jsonb),
    coalesce(p_items_json, '[]'::jsonb)
  )
  returning * into v_row;

  -- Best-effort relational population of public.order_items when matching product slugs or UUIDs exist in public.products
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
  uuid, uuid, text, text, text, numeric, numeric, text, numeric, text, text, text, text, text, text, jsonb, jsonb
) from public;
grant execute on function public.create_checkout_order(
  uuid, uuid, text, text, text, numeric, numeric, text, numeric, text, text, text, text, text, text, jsonb, jsonb
) to anon, authenticated, service_role;

-- 7. Controlled download_token lookup for receipt status display
create or replace function public.get_order_by_download_token(p_token text)
returns setof public.orders
language sql
stable
security definer
set search_path = public
as $$
  select o.*
  from public.orders o
  where o.download_token = p_token
  limit 1;
$$;

revoke all on function public.get_order_by_download_token(text) from public;
grant execute on function public.get_order_by_download_token(text) to anon, authenticated, service_role;
