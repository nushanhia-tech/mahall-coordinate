-- Rental cart is only for logged-in Individual (home) users: each booking remembers who booked it,
-- so members can see their own "My Booking History". Run AFTER 0001–0003. Safe to re-run.
alter table rentals add column if not exists user_id text references users(id) on delete set null deferrable initially deferred;
create index if not exists rentals_user_idx on rentals (masjid_id, user_id);

-- Older bookings made with a member's household phone number are linked to that member's login.
update rentals r
set user_id = u.id
from users u
join households h on h.id = u.household_id
where r.user_id is null
  and u.role = 'individual'
  and r.masjid_id = u.masjid_id
  and r.phone = h.phone;
