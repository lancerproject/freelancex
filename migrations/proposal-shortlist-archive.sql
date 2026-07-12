-- Client "Review proposals": shortlist + archive a proposal (Upwork's 👍 / 👎).
-- Applied live + PostgREST schema reloaded. Safe to re-run.

alter table public.proposals
  add column if not exists shortlisted boolean not null default false,
  add column if not exists archived boolean not null default false;

notify pgrst, 'reload schema';
