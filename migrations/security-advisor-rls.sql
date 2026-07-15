-- Security Advisor fix (2026-07-15): resolve the 6 ERROR-level findings that
-- triggered Supabase's "Table publicly accessible" alert. Every one of these
-- objects is either legacy/unused by the app or is only ever touched through
-- the service-role client (which bypasses RLS), so enabling RLS closes the
-- "anyone with the URL can read/edit/delete" hole with no app breakage.
--
-- Verified before writing: grep for `.from("<table>")` across the whole repo
-- returns NOTHING for payments, platform_settings, user_skills, skills,
-- categories, or wallet_balances — the app never reads them via the user client.

-- ---- Money / config / legacy join tables: RLS on, no client policy ----------
-- No SELECT/INSERT/UPDATE/DELETE policy = deny-all to the anon + authenticated
-- roles. The escrow engine and admin flows use createAdminClient() (service
-- role), which is exempt from RLS, so they keep working.
alter table public.payments          enable row level security;
alter table public.platform_settings enable row level security;
alter table public.user_skills       enable row level security;

-- ---- Reference / lookup data: RLS on + read-only public access --------------
-- skills & categories are non-sensitive lookup values. Allow everyone to read,
-- but only the service role can write (no write policy).
alter table public.skills     enable row level security;
alter table public.categories enable row level security;

drop policy if exists skills_public_read on public.skills;
create policy skills_public_read on public.skills
  for select using (true);

drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories
  for select using (true);

-- ---- SECURITY DEFINER view -> SECURITY INVOKER ------------------------------
-- wallet_balances is a convenience read-model over the escrow ledger. As a
-- (default) SECURITY DEFINER view it runs with the owner's rights and bypasses
-- the RLS of the querying user. Switch it to security_invoker so it enforces
-- the caller's permissions. The app computes balances in lib/earnings.ts and
-- never queries this view via the user client, so this is safe.
alter view public.wallet_balances set (security_invoker = on);
