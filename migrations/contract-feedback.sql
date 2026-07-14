-- Upwork-style end-of-contract feedback.
--
-- When a contract ends, each party leaves TWO ratings in one step:
--   • public  (rating + comment)  → shown on the other person's profile
--   • private (rating + comment)  → never shown publicly; feeds the JSS /
--                                   quality signals only
-- plus the reason they ended the contract. We keep one review row per
-- (contract, reviewer) — the existing public columns stay, we just add the
-- private half and the end reason.

alter table public.reviews
  add column if not exists private_rating  integer,
  add column if not exists private_comment text,
  add column if not exists end_reason      text;

-- Guard the private rating range (1–5) without touching existing rows.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reviews_private_rating_range'
  ) then
    alter table public.reviews
      add constraint reviews_private_rating_range
      check (private_rating is null or (private_rating between 1 and 5));
  end if;
end $$;

-- The private half must never be world-readable. The existing
-- reviews_select policy is `using (true)` (public read) — that's fine for the
-- public rating/comment, but the private columns are read server-side only
-- (service role / the reviewer themselves), never surfaced to the reviewee or
-- anonymous profile visitors in app code.

notify pgrst, 'reload schema';
