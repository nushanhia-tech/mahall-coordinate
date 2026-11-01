-- Mahall Coordinating System – database schema (Supabase / Postgres 15+)
-- Safe to re-run: everything uses "if not exists".
-- Every table also has `extra jsonb` for any future fields, and created_at / updated_at.

------------------------------------------------------------------ settings
create table if not exists masjid_profile (
  id text primary key default 'main' check (id = 'main'),
  name text not null, tagline text, address text,
  lat numeric(9,6), lng numeric(9,6), phone text, email text, about text,
  extra jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists account_heads (
  name text primary key,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists chitty_settings (
  id text primary key default 'main' check (id = 'main'),
  name text not null, monthly_amount numeric(12,2) not null, months int not null check (months > 0),
  start_month text not null, upi text,
  extra jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

------------------------------------------------------------------ community
create table if not exists households (
  id text primary key,
  home_no text not null unique, head_name text not null, members int not null default 1 check (members >= 0),
  phone text, ward text, address text, lat numeric(9,6), lng numeric(9,6),
  extra jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists household_members (
  parent_id text not null references households(id) on delete cascade,
  position int not null, name text, age int, relation text, gender text,
  primary key (parent_id, position)
);

create table if not exists institutions (
  id text primary key,
  name text not null, type text, students int not null default 0, contact text, photo text, description text,
  extra jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists users (
  id text primary key,
  username text not null unique, password text not null,
  role text not null check (role in ('admin', 'individual', 'khateeb', 'institution')),
  name text not null,
  household_id text references households(id) on delete set null deferrable initially deferred,
  institution_id text references institutions(id) on delete set null deferrable initially deferred,
  extra jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists courses (
  id text primary key,
  title text not null,
  institution_id text references institutions(id) on delete cascade deferrable initially deferred,
  duration text, fee numeric(12,2), seats int, description text,
  extra jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists course_applications (
  id text primary key,
  course_id text references courses(id) on delete cascade deferrable initially deferred,
  user_id text, name text not null, phone text not null, age int, qualification text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  remark text, date timestamptz,
  extra jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists opportunities (
  id text primary key,
  type text, title text not null, description text, eligibility text, deadline date, contact text,
  extra jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists services (
  id text primary key,
  title text not null, description text, contact text,
  extra jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists events (
  id text primary key,
  title text not null, date date not null, time text, venue text, description text, rescheduled_from date,
  extra jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists achievements (
  id text primary key,
  title text not null, date date, description text,
  extra jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists committee_members (
  id text primary key,
  name text not null, role text, phone text,
  extra jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists helpdesk_contacts (
  id text primary key,
  name text not null, service text, phone text,
  extra jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

------------------------------------------------------------------ finance
create table if not exists transactions (
  id text primary key,
  date date not null,
  type text not null check (type in ('income', 'expense')),
  head text not null,
  amount numeric(12,2) not null check (amount >= 0),
  description text, receipt text, ref text,
  extra jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists transactions_date_idx on transactions (date);
create index if not exists transactions_head_idx on transactions (head);

create table if not exists donation_channels (
  id text primary key,
  name text not null, account_head text, upi text, qr text, qr_image text,
  bank_holder text, bank_bank text, bank_acc_no text, bank_ifsc text,
  extra jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists donations (
  id text primary key,
  channel_id text references donation_channels(id) on delete set null deferrable initially deferred,
  name text not null, phone text, amount numeric(12,2) not null check (amount > 0),
  note text, screenshot text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  remark text, date timestamptz, decided_at timestamptz, transaction_id text, account_head text,
  extra jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists donations_status_idx on donations (status);

------------------------------------------------------------------ rental cart
create table if not exists rental_items (
  id text primary key,
  name text not null, description text, image text, stock int not null default 0 check (stock >= 0),
  rates_hour numeric(12,2), rates_day numeric(12,2), rates_week numeric(12,2), rates_month numeric(12,2),
  extra jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists rentals (
  id text primary key,
  name text not null, phone text not null,
  unit text not null check (unit in ('hour', 'day', 'week', 'month')),
  duration int not null check (duration > 0),
  start timestamptz not null, due timestamptz not null,
  status text not null check (status in ('active', 'returned')),
  base_amount numeric(12,2), returned_at timestamptz, remark text,
  penalty numeric(12,2), penalty_detail text, total numeric(12,2),
  extra jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists rentals_phone_idx on rentals (phone);
create table if not exists rental_lines (
  parent_id text not null references rentals(id) on delete cascade,
  position int not null,
  item_id text references rental_items(id) on delete set null deferrable initially deferred,
  qty int not null check (qty > 0),
  primary key (parent_id, position)
);

------------------------------------------------------------------ chitty
create table if not exists chitty_members (
  id text primary key,
  code text not null unique, name text not null, phone text, password text not null,
  extra jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists chitty_payments (
  id text primary key,
  member_id text not null references chitty_members(id) on delete cascade deferrable initially deferred,
  month int not null check (month > 0),
  amount numeric(12,2) not null,
  method text not null check (method in ('upi', 'cash')),
  screenshot text, utr text,
  status text not null check (status in ('pending', 'confirmed', 'rejected')),
  remark text, date timestamptz, decided_at timestamptz,
  extra jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists chitty_payments_member_idx on chitty_payments (member_id, month);

------------------------------------------------------------------ auction
create table if not exists auction_items (
  id text primary key,
  name text not null, description text, image text,
  min_bid numeric(12,2) not null, increment numeric(12,2) not null,
  ends_at timestamptz not null, ended_at timestamptz,
  status text not null check (status in ('live', 'ended')),
  posted boolean not null default false,
  extra jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists auction_bids (
  parent_id text not null references auction_items(id) on delete cascade,
  position int not null,
  id text not null unique,
  bidder text not null, phone text, amount numeric(12,2) not null, time timestamptz not null,
  primary key (parent_id, position)
);

------------------------------------------------------------------ mediation chat
create table if not exists chats (
  id text primary key,
  user_id text references users(id) on delete cascade deferrable initially deferred,
  subject text not null, household_info text, closed boolean not null default false, created_at timestamptz not null default now(),
  extra jsonb not null default '{}', updated_at timestamptz not null default now()
);
create table if not exists chat_messages (
  parent_id text not null references chats(id) on delete cascade,
  position int not null,
  id text not null unique,
  "from" text not null check ("from" in ('member', 'admin')),
  text text not null, time timestamptz not null, read boolean not null default false,
  primary key (parent_id, position)
);

------------------------------------------------------------------ applications
create table if not exists nikkah_applications (
  id text primary key,
  user_id text references users(id) on delete set null deferrable initially deferred,
  groom_name text, groom_father text, groom_dob date, groom_phone text, groom_address text, groom_mahall text, groom_occupation text,
  bride_name text, bride_father text, bride_dob date, bride_phone text, bride_address text, bride_mahall text, bride_occupation text,
  date date, venue text, mahr text, wali text, witness1 text, witness2 text, notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  remark text, created_at timestamptz not null default now(), decided_at timestamptz, decided_by text,
  extra jsonb not null default '{}', updated_at timestamptz not null default now()
);

create table if not exists home_applications (
  id text primary key,
  user_id text references users(id) on delete set null deferrable initially deferred,
  applicant text not null, phone text, current_address text, new_address text, ward text, lat text, lng text, reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  remark text, home_no text,
  household_id text references households(id) on delete set null deferrable initially deferred,
  created_at timestamptz not null default now(), decided_at timestamptz,
  extra jsonb not null default '{}', updated_at timestamptz not null default now()
);
create table if not exists home_application_members (
  parent_id text not null references home_applications(id) on delete cascade,
  position int not null, name text, age int, relation text, gender text,
  primary key (parent_id, position)
);

------------------------------------------------------------------ live updates
-- One row per change. Browsers subscribe to inserts here (Supabase Realtime) and refetch.
create table if not exists app_events (
  id bigserial primary key,
  collections text[] not null default '{}',
  created_at timestamptz not null default now()
);

------------------------------------------------------------------ security
-- Browsers never read these tables directly: the app's server connects with the database
-- password and enforces permissions. RLS with no policies blocks the public anon key.
do $$
declare t text;
begin
  foreach t in array array['masjid_profile','account_heads','chitty_settings','households','household_members','institutions','users',
    'courses','course_applications','opportunities','services','events','achievements','committee_members','helpdesk_contacts',
    'transactions','donation_channels','donations','rental_items','rentals','rental_lines','chitty_members','chitty_payments',
    'auction_items','auction_bids','chats','chat_messages','nikkah_applications','home_applications','home_application_members','app_events']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- The only thing the anon key may read: "something changed" pings (no data in them).
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'app_events' and policyname = 'anyone can see change pings') then
    create policy "anyone can see change pings" on app_events for select using (true);
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'app_events') then
    alter publication supabase_realtime add table app_events;
  end if;
end $$;
