-- Mahall Coordinating System schema.
-- Every list in the app (households, transactions, donations, rentals, ...) is a "collection".
-- Each record is one row; its fields live in `data` (jsonb). Single objects (masjid details,
-- chitty settings, account heads) live in `settings`.

create table if not exists records (
  collection text not null,
  id         text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);
create index if not exists records_collection_idx on records (collection);

create table if not exists settings (
  key        text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- One row per change. Browsers subscribe to inserts here (Supabase Realtime) and refetch.
create table if not exists app_events (
  id         bigserial primary key,
  collections text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Lock everything down: the app's server uses the database connection directly,
-- browsers only get to *see that something changed* via app_events.
alter table records    enable row level security;
alter table settings   enable row level security;
alter table app_events enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'app_events' and policyname = 'anyone can see change pings') then
    create policy "anyone can see change pings" on app_events for select using (true);
  end if;
end $$;

-- Enable Realtime on app_events (only exists on Supabase).
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'app_events') then
    alter publication supabase_realtime add table app_events;
  end if;
end $$;
