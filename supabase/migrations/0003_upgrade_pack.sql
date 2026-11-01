-- Mahall Coordinating System – upgrade pack (branding, Nikkah, GPS, Khateeb, chat routing,
-- monthly Vari, institution reports, receipt/voucher numbers, rent advance, feature switches).
-- Run AFTER 0001 and 0002. Safe to re-run.

-- 1. Masjid logo & photo + a per-masjid settings document (feature switches, fees, Vari rates)
alter table masjid_profile add column if not exists logo text;
alter table masjid_profile add column if not exists photo text;

create table if not exists masjid_config (
  masjid_id text primary key references masjids(id) on delete cascade,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Nikkah form: education, mother's name, Waliyy details, registration fee, many witnesses
alter table nikkah_applications add column if not exists groom_education text;
alter table nikkah_applications add column if not exists groom_mother text;
alter table nikkah_applications add column if not exists bride_education text;
alter table nikkah_applications add column if not exists bride_mother text;
alter table nikkah_applications add column if not exists wali_address text;
alter table nikkah_applications add column if not exists wali_relation text;
alter table nikkah_applications add column if not exists fee_amount numeric(12,2);
alter table nikkah_applications add column if not exists fee_receipt text;
alter table nikkah_applications add column if not exists fee_status text;
alter table nikkah_applications add column if not exists fee_utr text;

create table if not exists nikkah_witnesses (
  parent_id text not null references nikkah_applications(id) on delete cascade,
  position int not null,
  name text, address text, phone text, id_type text, id_number text, notes text,
  primary key (parent_id, position)
);

-- 3. New home: live GPS details
alter table home_applications add column if not exists gps_accuracy numeric(10,2);
alter table home_applications add column if not exists gps_captured_at timestamptz;

-- 4. Khateeb (and any user) qualifications
alter table users add column if not exists education text;
alter table users add column if not exists qualification text;
alter table users add column if not exists graduation text;

-- 5. Mediation chat: type of message and who should read it; Khateeb can reply
alter table chats add column if not exists kind text default 'complaint';
alter table chats add column if not exists recipients text default 'committee';
alter table chats alter column kind drop not null;
alter table chats alter column recipients drop not null;
do $$ begin
  if exists (select 1 from pg_constraint where conname = 'chat_messages_from_check') then
    alter table chat_messages drop constraint chat_messages_from_check;
  end if;
  alter table chat_messages add constraint chat_messages_from_check check ("from" in ('member', 'admin', 'khateeb'));
end $$;

-- 6. Monthly Vari (per-home subscription)
alter table households add column if not exists vari_rate numeric(12,2);
create table if not exists vari_payments (
  id text primary key,
  masjid_id text not null references masjids(id) on delete cascade,
  household_id text references households(id) on delete cascade deferrable initially deferred,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  amount numeric(12,2) not null check (amount > 0),
  method text not null check (method in ('upi', 'cash')),
  screenshot text, utr text, note text,
  status text not null check (status in ('pending', 'confirmed', 'rejected')),
  remark text, date timestamptz, decided_at timestamptz, transaction_id text,
  extra jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists vari_payments_masjid_idx on vari_payments (masjid_id, month);

-- 7. Institution financial reports
create table if not exists institution_reports (
  id text primary key,
  masjid_id text not null references masjids(id) on delete cascade,
  institution_id text references institutions(id) on delete cascade deferrable initially deferred,
  title text not null, period text, notes text,
  file text, file_name text,
  status text not null default 'submitted' check (status in ('submitted', 'reviewed')),
  remark text, submitted_at timestamptz, reviewed_at timestamptz,
  extra jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists institution_reports_masjid_idx on institution_reports (masjid_id);

-- 8. Receipt (income) and voucher (expense) numbers, e.g. R-2026-0007 / V-2026-0003
alter table transactions add column if not exists doc_no text;
with numbered as (
  select id, type, extract(year from date)::int as y,
         row_number() over (partition by masjid_id, type, extract(year from date) order by date, created_at, id) as n
  from transactions where doc_no is null
)
update transactions t
set doc_no = (case when numbered.type = 'income' then 'R' else 'V' end) || '-' || numbered.y || '-' || lpad(numbered.n::text, 4, '0')
from numbered where t.id = numbered.id;
create unique index if not exists transactions_masjid_doc_no_key on transactions (masjid_id, doc_no) where doc_no is not null;

-- 10. Rent advance
alter table rental_items add column if not exists advance numeric(12,2);
alter table rentals add column if not exists advance_amount numeric(12,2);
alter table rentals add column if not exists advance_paid boolean not null default false;
alter table rentals add column if not exists advance_method text;
alter table rentals add column if not exists advance_received_at timestamptz;

alter table masjid_config enable row level security;
alter table nikkah_witnesses enable row level security;
alter table vari_payments enable row level security;
alter table institution_reports enable row level security;
