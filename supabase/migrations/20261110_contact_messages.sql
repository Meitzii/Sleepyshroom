-- Sleepyshroom Contact Messages Migration
-- Proposed table, duplicate-prevention trigger, indexes, and strict RLS policies.
-- Run this script in your Supabase Project -> SQL Editor.

-- 1. Admin role helper using existing public.profiles table without weakening profiles RLS
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
      and lower(coalesce(p.role, '')) = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 2. Dedicated contact_messages table
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null check (char_length(trim(full_name)) between 1 and 120),
  email text not null check (char_length(trim(email)) between 3 and 254),
  subject text not null check (char_length(trim(subject)) between 1 and 200),
  message text not null check (char_length(trim(message)) between 1 and 5000),
  consent boolean not null default true check (consent = true),
  status text not null default 'unread' check (status in ('unread', 'read', 'replied')),
  email_sent boolean not null default false,
  email_sent_at timestamptz,
  email_error text,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_messages_submission_id_unique unique (submission_id)
);

-- 3. Query performance indexes
create index if not exists idx_contact_messages_created_at
  on public.contact_messages (created_at desc);

create index if not exists idx_contact_messages_status
  on public.contact_messages (status);

create index if not exists idx_contact_messages_user_id
  on public.contact_messages (user_id);

-- 4. Automatically update updated_at on modification
create or replace function public.set_contact_messages_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_contact_messages_updated_at on public.contact_messages;
create trigger trg_contact_messages_updated_at
  before update on public.contact_messages
  for each row
  execute function public.set_contact_messages_updated_at();

-- 5. Database-level duplicate prevention (blocks identical submissions within 60 seconds)
create or replace function public.prevent_duplicate_contact_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.contact_messages cm
    where lower(trim(cm.email)) = lower(trim(new.email))
      and trim(cm.subject) = trim(new.subject)
      and trim(cm.message) = trim(new.message)
      and cm.created_at >= (now() - interval '60 seconds')
  ) then
    raise exception 'duplicate_contact_inquiry'
      using errcode = 'P0001',
            detail = 'An identical contact inquiry was already submitted within the last 60 seconds.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_duplicate_contact_message on public.contact_messages;
create trigger trg_prevent_duplicate_contact_message
  before insert on public.contact_messages
  for each row
  execute function public.prevent_duplicate_contact_message();

-- 6. Strict Row-Level Security (RLS)
alter table public.contact_messages enable row level security;

revoke all on table public.contact_messages from anon, authenticated;
grant insert on table public.contact_messages to anon, authenticated;
grant select, update, delete on table public.contact_messages to authenticated;

-- Public & signed-in visitors can ONLY insert valid new unread inquiries.
-- Guests must have user_id = null; signed-in customers may link only their own auth.uid().
-- Public visitors have zero SELECT, UPDATE, or DELETE access.
drop policy if exists contact_messages_insert_public on public.contact_messages;
create policy contact_messages_insert_public
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (
    consent = true
    and status = 'unread'
    and email_sent = false
    and (
      (auth.uid() is null and user_id is null)
      or (auth.uid() is not null and (user_id is null or user_id = auth.uid()))
    )
  );

-- Only verified administrators (public.profiles.role = 'admin') can read, update, or delete inquiries.
drop policy if exists contact_messages_select_admin on public.contact_messages;
create policy contact_messages_select_admin
  on public.contact_messages
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists contact_messages_update_admin on public.contact_messages;
create policy contact_messages_update_admin
  on public.contact_messages
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists contact_messages_delete_admin on public.contact_messages;
create policy contact_messages_delete_admin
  on public.contact_messages
  for delete
  to authenticated
  using (public.is_admin());

-- Ensure the primary store owner profile holds the admin role
update public.profiles
set role = 'admin'
where lower(email) = 'shop.sleepyshroom@gmail.com'
  and coalesce(role, '') <> 'admin';
