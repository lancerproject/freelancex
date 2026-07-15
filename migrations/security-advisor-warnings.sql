-- Security Advisor WARNING fixes (2026-07-15). Clears the remaining warnings
-- after the ERROR-level fixes in security-advisor-rls.sql.

-- (A) Function Search Path Mutable (13 warnings) — pin search_path on every
-- escrow* function. Applied via a loop so it covers every overload/signature.
do $$ declare r record; begin
  for r in select p.oid::regprocedure::text as sig
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'escrow%'
  loop execute 'alter function ' || r.sig || ' set search_path = public'; end loop;
end $$;

-- (B) RLS Policy Always True — notifications. Inserts now go through the
-- service-role client (see lib/notify.ts), which bypasses RLS, so the
-- permissive "anyone can insert" policy is no longer needed. Reads/updates stay
-- owner-scoped. Notifications become un-forgeable by clients.
drop policy if exists "Anyone can insert notifications" on public.notifications;

-- (C) Public Can / Signed-In Users Can Execute SECURITY DEFINER —
-- handle_new_user is the signup trigger. Revoke direct EXECUTE from the API
-- roles; trigger execution is unaffected (triggers don't need EXECUTE on the
-- invoking role).
do $$ declare r record; begin
  for r in select p.oid::regprocedure::text as sig
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'handle_new_user'
  loop execute 'revoke execute on function ' || r.sig
             || ' from public, anon, authenticated'; end loop;
end $$;

-- (D) Public Bucket Allows Listing — project-files. It's a PUBLIC bucket;
-- downloads are served via public URLs (no RLS check), so the SELECT/list
-- policy isn't needed and lets the API enumerate object names. Drop it.
drop policy if exists "pf_read" on storage.objects;

-- (E) Leaked Password Protection — enabled via the dashboard toggle
-- (Authentication → Sign In / Providers → Passwords), not SQL.
