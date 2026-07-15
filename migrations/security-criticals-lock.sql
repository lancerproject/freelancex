-- Critical hardening (2026-07-15). Apply AFTER the code change that routes all
-- privileged/withdrawal writes through the service role (commit ea98bd1) has
-- deployed — otherwise identity verification, moderation and admin actions
-- would be blocked by the trigger below.

-- ── C-1 · Privilege escalation ──────────────────────────────────────────────
-- profiles lets a user edit their OWN row (bio, title, skills, etc.), but the
-- policy has no column guard, so a user could self-set is_admin / id_verified /
-- plan / warnings. This trigger allows those privileged columns to change ONLY
-- from the service role (every legitimate writer now uses it) or a superuser.
create or replace function public.protect_profile_privileged()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role'
     or current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;
  if new.is_admin            is distinct from old.is_admin
     or new.id_verified      is distinct from old.id_verified
     or new.plan             is distinct from old.plan
     or new.membership_status is distinct from old.membership_status
     or new.membership_autorenew is distinct from old.membership_autorenew
     or new.warnings         is distinct from old.warnings
     or new.suspended        is distinct from old.suspended
     or new.account_status   is distinct from old.account_status
     or new.suspension_reason is distinct from old.suspension_reason
     or new.health_score     is distinct from old.health_score then
    raise exception 'Not authorized to modify privileged profile columns';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileged on public.profiles;
create trigger protect_profile_privileged
  before update on public.profiles
  for each row execute function public.protect_profile_privileged();

-- ── C-3 · Withdrawals over-withdraw ─────────────────────────────────────────
-- Withdrawals are now created only through the guarded server action (which
-- checks the balance and inserts via the service role). Drop any user-facing
-- INSERT policy so no one can POST an arbitrary amount straight to PostgREST.
-- The SELECT policy (viewing your own history) is left untouched.
do $$ declare r record; begin
  for r in select policyname from pg_policies
           where schemaname='public' and tablename='withdrawals' and cmd = 'INSERT'
  loop execute format('drop policy %I on public.withdrawals', r.policyname); end loop;
end $$;

-- ── M-1 · Notification forgery ──────────────────────────────────────────────
-- Notifications are inserted via the service role (lib/notify.ts). Remove the
-- permissive user INSERT policy (its real name is notifications_insert; an
-- earlier attempt dropped the wrong name) so users can't forge notifications.
drop policy if exists notifications_insert on public.notifications;

-- Verify afterwards:
--   update profiles set is_admin=true where id=auth.uid();  -- should ERROR
--   (as a normal signed-in user)
