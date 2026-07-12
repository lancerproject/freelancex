-- Client settings parity (Upwork-style "My info").
-- Adds the few columns the client My Info page needs that don't already exist.
-- (vat_id, time_zone, address, city, zip, country, avatar_url, notification_prefs,
--  twofa_*, security_question already exist on profiles.)

alter table profiles
  add column if not exists company_name text,
  add column if not exists company_logo text,          -- public URL of the company logo
  add column if not exists ai_data_opt_out boolean not null default false;
