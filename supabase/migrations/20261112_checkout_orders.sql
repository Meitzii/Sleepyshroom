-- Safe additive migration to align public.orders with Sleepyshroom Checkout & Digital Downloads
-- Preserves all existing tables, columns, and records cleanly.
-- Run this script in your Supabase Project -> SQL Editor if you want orders stored centrally in Supabase.

-- 1. Safely extend existing public.orders without modifying or deleting existing columns
alter table public.orders
  add column if not exists order_number text,
  add column if not exists customer_name text,
  add column if not exists subtotal numeric not null default 0,
  add column if not exists discount numeric not null default 0,
  add column if not exists discount_code text,
  add column if not exists payment_method text,
  add column if not exists payment_status text not null default 'completed',
  add column if not exists transaction_id text,
  add column if not exists download_token text,
  add column if not exists download_count integer not null default 0,
  add column if not exists billing_details jsonb not null default '{}'::jsonb,
  add column if not exists items_json jsonb not null default '[]'::jsonb;

create index if not exists idx_orders_user_id on public.orders (user_id);
create index if not exists idx_orders_customer_email_lower on public.orders (lower(customer_email));
create unique index if not exists idx_orders_download_token_unique
  on public.orders (download_token)
  where download_token is not null;

-- 2. Ensure admin helper exists cleanly & configure strict RLS policies
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

alter table public.orders enable row level security;

revoke all on table public.orders from anon, authenticated;
grant select, insert on table public.orders to authenticated;

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
create policy orders_insert_authenticated_own
  on public.orders
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
  );

-- 3. Controlled RPC for both guest and signed-in checkout order creation
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
  p_payment_provider text,
  p_payment_method text,
  p_payment_status text,
  p_payment_reference text,
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
  -- Verify caller identity if signed in; anon callers cannot assign arbitrary user_id
  v_uid := coalesce(
    auth.uid(),
    case
      when coalesce(auth.jwt() ->> 'role', '') = 'service_role' then p_user_id
      else null
    end
  );

  begin
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
      coalesce(nullif(trim(p_payment_status), ''), 'completed'),
      coalesce(p_subtotal, 0),
      coalesce(p_discount, 0),
      nullif(trim(coalesce(p_discount_code, '')), ''),
      coalesce(p_total_amount, 0),
      'USD',
      coalesce(nullif(trim(p_payment_provider), ''), 'stripe'),
      coalesce(nullif(trim(p_payment_method), ''), 'Digital Checkout'),
      coalesce(nullif(trim(p_payment_status), ''), 'completed'),
      p_payment_reference,
      p_payment_reference,
      p_download_token,
      0,
      coalesce(p_billing_details, '{}'::jsonb),
      coalesce(p_items_json, '[]'::jsonb)
    )
    returning * into v_row;
  exception when check_violation then
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
      'paid',
      coalesce(p_subtotal, 0),
      coalesce(p_discount, 0),
      nullif(trim(coalesce(p_discount_code, '')), ''),
      coalesce(p_total_amount, 0),
      'USD',
      coalesce(nullif(trim(p_payment_provider), ''), 'stripe'),
      coalesce(nullif(trim(p_payment_method), ''), 'Digital Checkout'),
      coalesce(nullif(trim(p_payment_status), ''), 'completed'),
      p_payment_reference,
      p_payment_reference,
      p_download_token,
      0,
      coalesce(p_billing_details, '{}'::jsonb),
      coalesce(p_items_json, '[]'::jsonb)
    )
    returning * into v_row;
  end;

  return v_row;
end;
$$;

revoke all on function public.create_checkout_order(
  uuid, uuid, text, text, text, numeric, numeric, text, numeric, text, text, text, text, text, jsonb, jsonb
) from public;
grant execute on function public.create_checkout_order(
  uuid, uuid, text, text, text, numeric, numeric, text, numeric, text, text, text, text, text, jsonb, jsonb
) to anon, authenticated;

-- 4. Controlled cryptographic download_token lookup for receipt / confirmation screen
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
grant execute on function public.get_order_by_download_token(text) to anon, authenticated;
