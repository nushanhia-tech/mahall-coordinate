-- Mahall Coordinating System – many masjids on one site.
-- Run AFTER 0001_init.sql. Safe to re-run.
-- Existing data (if any) becomes the first masjid, at the address /juma-masjid.

create table if not exists masjids (
  id text primary key,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Platform owner accounts (manage the list of masjids at /super).
-- Default login: superadmin / super123  – change it on the /super page straight away.
create table if not exists platform_admins (
  username text primary key,
  password text not null,
  created_at timestamptz not null default now()
);
insert into platform_admins (username, password)
values ('superadmin', '$2b$10$VOy1rY1kVEczIw9xZfPSEOyx.QcXukpc3OWXhlwvH0R589YOVZHw2')
on conflict (username) do nothing;

-- Existing single-masjid data becomes the first masjid.
insert into masjids (id, slug, name)
select 'm_default', 'juma-masjid', coalesce((select name from masjid_profile limit 1), 'My Masjid')
where not exists (select 1 from masjids) and exists (select 1 from masjid_profile);

-- Every data table gets a masjid_id.
do $$
declare t text;
begin
  foreach t in array array['masjid_profile','account_heads','chitty_settings','households','institutions','users','courses',
    'course_applications','opportunities','services','events','achievements','committee_members','helpdesk_contacts',
    'transactions','donation_channels','donations','rental_items','rentals','chitty_members','chitty_payments',
    'auction_items','chats','nikkah_applications','home_applications']
  loop
    execute format('alter table %I add column if not exists masjid_id text references masjids(id) on delete cascade', t);
    execute format('update %I set masjid_id = %L where masjid_id is null', t, 'm_default');
    execute format('alter table %I alter column masjid_id set not null', t);
    execute format('create index if not exists %I on %I (masjid_id)', t || '_masjid_idx', t);
  end loop;
end $$;

alter table app_events add column if not exists masjid_id text references masjids(id) on delete cascade;
create index if not exists app_events_masjid_idx on app_events (masjid_id, id);

-- Things that were unique for the whole site are now unique per masjid.
do $$ begin
  -- one profile / chitty settings row per masjid
  if exists (select 1 from pg_constraint where conname = 'masjid_profile_id_check') then
    alter table masjid_profile drop constraint masjid_profile_id_check;
  end if;
  if exists (select 1 from pg_constraint where conname = 'masjid_profile_pkey' and pg_get_constraintdef(oid) like '%(id)%') then
    alter table masjid_profile drop constraint masjid_profile_pkey;
    alter table masjid_profile add primary key (masjid_id);
  end if;
  if exists (select 1 from pg_constraint where conname = 'chitty_settings_id_check') then
    alter table chitty_settings drop constraint chitty_settings_id_check;
  end if;
  if exists (select 1 from pg_constraint where conname = 'chitty_settings_pkey' and pg_get_constraintdef(oid) like '%(id)%') then
    alter table chitty_settings drop constraint chitty_settings_pkey;
    alter table chitty_settings add primary key (masjid_id);
  end if;
  if exists (select 1 from pg_constraint where conname = 'account_heads_pkey' and pg_get_constraintdef(oid) = 'PRIMARY KEY (name)') then
    alter table account_heads drop constraint account_heads_pkey;
    alter table account_heads add primary key (masjid_id, name);
  end if;
  -- home numbers, usernames and chitty numbers only need to be unique inside one masjid
  if exists (select 1 from pg_constraint where conname = 'households_home_no_key') then
    alter table households drop constraint households_home_no_key;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'households_masjid_home_no_key') then
    alter table households add constraint households_masjid_home_no_key unique (masjid_id, home_no);
  end if;
  if exists (select 1 from pg_constraint where conname = 'users_username_key') then
    alter table users drop constraint users_username_key;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'users_masjid_username_key') then
    alter table users add constraint users_masjid_username_key unique (masjid_id, username);
  end if;
  if exists (select 1 from pg_constraint where conname = 'chitty_members_code_key') then
    alter table chitty_members drop constraint chitty_members_code_key;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'chitty_members_masjid_code_key') then
    alter table chitty_members add constraint chitty_members_masjid_code_key unique (masjid_id, code);
  end if;
end $$;

alter table masjids enable row level security;
alter table platform_admins enable row level security;
