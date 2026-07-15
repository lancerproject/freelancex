-- ════════════════════════════════════════════════════════════════════════
-- FINAL SECURITY LOCK — run once in the Supabase SQL Editor.
-- Closes the remaining database-level findings: C-1, C-3, M-1, C-2.
-- All matching code is already deployed, so this is safe to run now.
-- ════════════════════════════════════════════════════════════════════════

-- ── C-1 · Privilege escalation ──────────────────────────────────────────────
-- Block a user from changing privileged columns on their own profile row
-- (is_admin / id_verified / plan / warnings / suspension / health). Every
-- legitimate writer goes through the service role, which is exempt below.
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
  if new.is_admin is distinct from old.is_admin
     or new.id_verified is distinct from old.id_verified
     or new.plan is distinct from old.plan
     or new.membership_status is distinct from old.membership_status
     or new.membership_autorenew is distinct from old.membership_autorenew
     or new.warnings is distinct from old.warnings
     or new.suspended is distinct from old.suspended
     or new.account_status is distinct from old.account_status
     or new.suspension_reason is distinct from old.suspension_reason
     or new.health_score is distinct from old.health_score then
    raise exception 'Not authorized to modify privileged profile columns';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_privileged on public.profiles;
create trigger protect_profile_privileged
  before update on public.profiles
  for each row execute function public.protect_profile_privileged();

-- ── C-3 · Fake withdrawals ──────────────────────────────────────────────────
-- Withdrawals are created only through the guarded server action (balance
-- checked, inserted via the service role). Drop any user-facing INSERT policy
-- so nobody can POST an arbitrary amount straight to the API.
do $$ declare r record; begin
  for r in select policyname from pg_policies
           where schemaname='public' and tablename='withdrawals' and cmd = 'INSERT'
  loop execute format('drop policy %I on public.withdrawals', r.policyname); end loop;
end $$;

-- ── M-1 · Notification forgery ──────────────────────────────────────────────
-- Notifications insert via the service role now; remove the permissive policy.
drop policy if exists notifications_insert on public.notifications;

-- ── C-2 · Personal data exposed to the public key ───────────────────────────
-- Revoke the anon (public) role's table-wide read of profiles and re-grant only
-- public-safe columns. Personal fields (email, phone, national ID, DOB, card,
-- payment IDs, security question, address) become unreadable to the public key.
-- The public profile page + talent search read profiles through the service
-- role, so the UI is unaffected. Signed-in users keep full read.
revoke select on public.profiles from anon;
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ')
  into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles'
    and column_name not in (
      'email','phone','phone_verified',
      'address1','address2','city','state','postal_code',
      'id_number','id_dob','id_legal_name','identity_fingerprint',
      'id_doc_front','id_doc_back','id_selfie','id_face_score','id_type',
      'id_review_status','id_review_note','id_verified_at',
      'stripe_customer_id','stripe_payment_method_id','stripe_subscription_id',
      'paypal_email','paypal_billing_agreement_id','card_brand','card_last4',
      'vat_id','tax_info','security_question','security_question_answer',
      'two_factor_secret','two_factor_enabled','notification_prefs',
      'suspension_reason'
    );
  execute format('grant select (%s) on public.profiles to anon', cols);
end $$;

-- Verify (as a normal signed-in user, these should FAIL / return nothing):
--   update profiles set is_admin=true where id=auth.uid();   -- ERROR (C-1)
--   insert into withdrawals(user_id,amount,status) values (auth.uid(),999,'requested'); -- ERROR (C-3)
