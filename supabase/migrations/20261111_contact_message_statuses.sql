-- Safe incremental migration for Contact Message Status Tracking
-- Preserves all existing contact_messages records and unrelated policies/tables.
-- Run this script in your Supabase Project -> SQL Editor.

-- 1. Ensure replied_at column exists
alter table public.contact_messages
  add column if not exists replied_at timestamptz;

-- 2. Drop any existing CHECK constraint on status without removing rows
do $$
declare
  constraint_rec record;
begin
  for constraint_rec in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'contact_messages'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format('alter table public.contact_messages drop constraint if exists %I', constraint_rec.conname);
  end loop;
end $$;

-- 3. Safely convert legacy statuses without deleting or altering any customer content
update public.contact_messages
set status = case
  when status = 'unread' then 'new'
  when status = 'read' then 'in_progress'
  when status in ('new', 'in_progress', 'replied') then status
  else 'new'
end
where status is distinct from case
  when status = 'unread' then 'new'
  when status = 'read' then 'in_progress'
  when status in ('new', 'in_progress', 'replied') then status
  else 'new'
end;

-- 4. Set default and enforce the three tracking statuses
alter table public.contact_messages
  alter column status set default 'new';

alter table public.contact_messages
  add constraint contact_messages_status_check
  check (status in ('new', 'in_progress', 'replied'));

-- 5. Update public INSERT policy so new inquiries start as 'new' (while keeping legacy 'unread' compatible)
drop policy if exists contact_messages_insert_public on public.contact_messages;
create policy contact_messages_insert_public
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (
    consent = true
    and status in ('new', 'unread')
    and email_sent = false
    and (
      (auth.uid() is null and user_id is null)
      or (auth.uid() is not null and (user_id is null or user_id = auth.uid()))
    )
  );
