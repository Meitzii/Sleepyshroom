-- Sleepyshroom E-Commerce Expansion Migration (Safe, Additive & Non-Destructive)
-- Adds tables, foreign keys, indexes, and strict RLS policies for:
-- 1. Newsletter Subscribers (opt-in only, duplicate prevention, unsubscribe token)
-- 2. Email Logs (transactional confirmation tracking & duplicate prevention)
-- 3. Customer Reviews (verified purchaser enforcement, 1-5 rating, edit own, admin moderation)
-- 4. Normalized Bundle & Collection Junction Tables + Limited Collection Start/End Dates
-- 5. Dynamic FAQ Management Table
-- Run this script in your Supabase Project -> SQL Editor.

-- ============================================================================
-- 0. Ensure Admin Helper Function Exists
-- ============================================================================
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

-- ============================================================================
-- 1. Extend Collections & Orders Safely (Non-destructive)
-- ============================================================================
alter table if exists public.collections
  add column if not exists is_limited_edition boolean not null default false,
  add column if not exists start_date timestamptz,
  add column if not exists end_date timestamptz;

create index if not exists idx_collections_schedule
  on public.collections (status, start_date, end_date);

alter table if exists public.orders
  add column if not exists confirmation_email_sent_at timestamptz,
  add column if not exists confirmation_email_id text;

-- ============================================================================
-- 2. Newsletter Subscribers Table
-- Purpose: Stores explicit opt-in email subscribers, consent proof, and unsubscribe tokens.
-- ============================================================================
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(trim(email)) between 3 and 254),
  name text default '',
  consent boolean not null default true check (consent = true),
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  source text default 'footer',
  unsubscribe_token text not null default encode(gen_random_bytes(24), 'hex'),
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_newsletter_subscribers_email_unique
  on public.newsletter_subscribers (lower(trim(email)));

create unique index if not exists idx_newsletter_subscribers_unsub_token
  on public.newsletter_subscribers (unsubscribe_token);

create index if not exists idx_newsletter_subscribers_status
  on public.newsletter_subscribers (status, subscribed_at desc);

alter table public.newsletter_subscribers enable row level security;
revoke all on table public.newsletter_subscribers from anon, authenticated;
grant select, update, delete on table public.newsletter_subscribers to authenticated;

-- Only admins can view/manage subscriber emails publicly; subscriptions go through server API
drop policy if exists "Admins can view and manage newsletter subscribers" on public.newsletter_subscribers;
create policy "Admins can view and manage newsletter subscribers"
  on public.newsletter_subscribers
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- 3. Email Logs Table
-- Purpose: Audit trail of transactional order confirmations & support emails; prevents duplicate order confirmations.
-- ============================================================================
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  email_type text not null,
  recipient_email text not null,
  order_id uuid references public.orders(id) on delete set null,
  order_number text,
  subject text not null,
  provider text not null default 'unconfigured',
  provider_message_id text,
  status text not null default 'sent' check (status in ('sent', 'failed', 'skipped')),
  error_message text,
  attempted_at timestamptz not null default now(),
  delivered_at timestamptz
);

create index if not exists idx_email_logs_order_id
  on public.email_logs (order_id);

create index if not exists idx_email_logs_attempted_at
  on public.email_logs (attempted_at desc);

create unique index if not exists idx_email_logs_unique_order_confirmation
  on public.email_logs (order_id, email_type)
  where order_id is not null and email_type = 'order_confirmation_customer' and status = 'sent';

alter table public.email_logs enable row level security;
revoke all on table public.email_logs from anon, authenticated;
grant select on table public.email_logs to authenticated;

drop policy if exists "Admins can read email logs" on public.email_logs;
create policy "Admins can read email logs"
  on public.email_logs
  for select
  to authenticated
  using (public.is_admin());

-- ============================================================================
-- 4. Customer Reviews Table
-- Purpose: Verified-purchaser 1-5 star ratings & feedback with edit-own & admin moderation.
-- ============================================================================
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  reviewer_name text not null check (char_length(trim(reviewer_name)) between 1 and 120),
  rating integer not null check (rating between 1 and 5),
  title text default '',
  comment text not null check (char_length(trim(comment)) between 3 and 2500),
  verified_purchase boolean not null default true,
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_reviews_unique_user_product
  on public.reviews (user_id, product_id);

create index if not exists idx_reviews_product_status
  on public.reviews (product_id, status, created_at desc);

-- Server-side verified purchaser helper for reviews RLS
create or replace function public.has_verified_product_purchase(p_product_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    where (
      o.user_id = auth.uid()
      or lower(coalesce(o.customer_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    and lower(coalesce(o.payment_status, o.status, '')) in ('paid', 'completed')
    and (
      exists (
        select 1
        from jsonb_array_elements(coalesce(o.items_json, '[]'::jsonb)) item
        where item ->> 'productId' = p_product_id
           or coalesce(item -> 'bundleProductIds', '[]'::jsonb) ? p_product_id
      )
    )
  );
$$;

revoke all on function public.has_verified_product_purchase(text) from public;
grant execute on function public.has_verified_product_purchase(text) to authenticated;

alter table public.reviews enable row level security;
revoke all on table public.reviews from anon, authenticated;
grant select on table public.reviews to anon, authenticated;
grant insert, update, delete on table public.reviews to authenticated;

drop policy if exists "Public can read published reviews" on public.reviews;
create policy "Public can read published reviews"
  on public.reviews
  for select
  using (status = 'published' or user_id = auth.uid() or public.is_admin());

drop policy if exists "Verified purchasers can insert own review" on public.reviews;
create policy "Verified purchasers can insert own review"
  on public.reviews
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and verified_purchase = true
    and public.has_verified_product_purchase(product_id)
  );

drop policy if exists "Authors or admins can update reviews" on public.reviews;
create policy "Authors or admins can update reviews"
  on public.reviews
  for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Authors or admins can delete reviews" on public.reviews;
create policy "Authors or admins can delete reviews"
  on public.reviews
  for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ============================================================================
-- 5. Bundle & Collection Relational Junction Tables
-- Purpose: Normalized M:N joins between bundles/collections and products (compatible with existing string IDs).
-- ============================================================================
create table if not exists public.bundle_products (
  id uuid primary key default gen_random_uuid(),
  bundle_id text not null references public.bundles(id) on delete cascade,
  product_id text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_bundle_products_unique
  on public.bundle_products (bundle_id, product_id);

create index if not exists idx_bundle_products_product_id
  on public.bundle_products (product_id);

alter table public.bundle_products enable row level security;
grant select on table public.bundle_products to anon, authenticated;

drop policy if exists "Public can view bundle products" on public.bundle_products;
create policy "Public can view bundle products"
  on public.bundle_products
  for select
  using (true);

drop policy if exists "Admins can manage bundle products" on public.bundle_products;
create policy "Admins can manage bundle products"
  on public.bundle_products
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.collection_products (
  id uuid primary key default gen_random_uuid(),
  collection_id text not null references public.collections(id) on delete cascade,
  product_id text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_collection_products_unique
  on public.collection_products (collection_id, product_id);

create index if not exists idx_collection_products_product_id
  on public.collection_products (product_id);

alter table public.collection_products enable row level security;
grant select on table public.collection_products to anon, authenticated;

drop policy if exists "Public can view collection products" on public.collection_products;
create policy "Public can view collection products"
  on public.collection_products
  for select
  using (true);

drop policy if exists "Admins can manage collection products" on public.collection_products;
create policy "Admins can manage collection products"
  on public.collection_products
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- 6. Dynamic FAQs Table
-- Purpose: Categorized customer FAQ entries editable by administrators.
-- ============================================================================
create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  category text not null check (
    category in (
      'Orders and Payments',
      'Downloads and Access',
      'Wallpaper Compatibility',
      'Licensing and Usage',
      'Refunds and Cancellations',
      'Account and Technical Support'
    )
  ),
  question text not null check (char_length(trim(question)) between 3 and 400),
  answer text not null check (char_length(trim(answer)) between 3 and 4000),
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_faqs_category_order
  on public.faqs (is_published, category, sort_order);

alter table public.faqs enable row level security;
revoke all on table public.faqs from anon, authenticated;
grant select on table public.faqs to anon, authenticated;
grant insert, update, delete on table public.faqs to authenticated;

drop policy if exists "Public can read published faqs" on public.faqs;
create policy "Public can read published faqs"
  on public.faqs
  for select
  using (is_published = true or public.is_admin());

drop policy if exists "Admins can manage faqs" on public.faqs;
create policy "Admins can manage faqs"
  on public.faqs
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
