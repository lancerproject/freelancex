-- Staff / showcase talent-badge override.
--
-- The badge engine (lib/stats-refresh.ts) normally COMPUTES the badge from
-- on-platform performance every time a profile is viewed, so a brand-new
-- account (e.g. a demo) can't show Top Rated because it hasn't met the 90-day /
-- $1,000-earned / JSS-90 criteria yet. This column lets us grant a badge by
-- hand — the engine uses the override instead of the computed value when set.
--
-- Allowed values: 'rising_talent' | 'top_rated' | 'top_rated_plus'
-- Anything else (NULL, 'none') = no override, fall back to the computed badge.

alter table public.profiles
  add column if not exists talent_badge_override text;

notify pgrst, 'reload schema';
