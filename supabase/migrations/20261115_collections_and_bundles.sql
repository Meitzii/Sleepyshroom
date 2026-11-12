-- Sleepyshroom Dynamic Theme Collections & Bundles Migration (Safe & Additive)
-- Preserves all existing tables, products, orders, order items, and contact messages.
-- Run this script in your Supabase Project -> SQL Editor.

-- 1. Helper function for admin permissions
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

-- 2. Dedicated collections table
create table if not exists public.collections (
  id text primary key,
  name text not null,
  slug text not null,
  description text default '',
  cover_image text default '',
  banner_image text default '',
  featured boolean not null default false,
  is_new boolean not null default false,
  status text not null default 'published' check (status in ('published', 'draft', 'archived')),
  sort_order integer not null default 0,
  theme text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_collections_slug_unique
  on public.collections (lower(slug));

create index if not exists idx_collections_status_featured
  on public.collections (status, featured, sort_order);

-- 3. Extend public.products with category, product_type, and bundle fields
alter table public.products
  add column if not exists category text default 'desktop',
  add column if not exists product_type text default 'wallpaper',
  add column if not exists collection_id text,
  add column if not exists collection_slug text,
  add column if not exists is_bundle boolean not null default false,
  add column if not exists bundle_product_ids jsonb not null default '[]'::jsonb,
  add column if not exists bundle_savings_percent integer not null default 0;

create index if not exists idx_products_collection_slug
  on public.products (lower(collection_slug));

create index if not exists idx_products_category
  on public.products (category);

-- 4. Dedicated bundles table
create table if not exists public.bundles (
  id text primary key,
  title text not null,
  slug text not null,
  collection_id text references public.collections(id) on delete set null,
  collection_slug text not null,
  collection_name text not null,
  description text default '',
  preview_image text default '',
  original_price numeric(10, 2) not null default 0,
  bundle_price numeric(10, 2) not null default 0,
  savings_amount numeric(10, 2) not null default 0,
  savings_percent integer not null default 0,
  product_ids jsonb not null default '[]'::jsonb,
  included_items jsonb not null default '[]'::jsonb,
  status text not null default 'published' check (status in ('published', 'draft')),
  featured boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_bundles_slug_unique
  on public.bundles (lower(slug));

create index if not exists idx_bundles_collection_slug
  on public.bundles (lower(collection_slug));

-- 5. Enable Row Level Security (RLS)
alter table public.collections enable row level security;
alter table public.bundles enable row level security;

-- Public can view published collections and bundles
create policy "Public can view published collections"
  on public.collections
  for select
  using (status = 'published' or public.is_admin());

create policy "Admins can manage collections"
  on public.collections
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Public can view published bundles"
  on public.bundles
  for select
  using (status = 'published' or public.is_admin());

create policy "Admins can manage bundles"
  on public.bundles
  for all
  using (public.is_admin())
  with check (public.is_admin());
