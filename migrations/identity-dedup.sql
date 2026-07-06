-- ============================================================================
-- Xwork — identity de-duplication (one verified account per person).
-- A person may have only ONE verified, active account at a time. If that
-- account is permanently suspended, they may verify a new account with the
-- same ID — up to a lifetime cap (kept internal). Beyond the cap the identity
-- is banned and can no longer be used (the user is shown a generic message).
-- Run in Supabase -> SQL Editor. Safe to re-run.
-- ============================================================================

create table if not exists public.verified_identities (
  fingerprint    text primary key,          -- hash of normalized ID number + DOB
  use_count      integer default 0,          -- how many accounts have verified with it
  active_user_id uuid references public.profiles (id) on delete set null,
  banned         boolean default false,      -- true once the lifetime cap is exceeded
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- Only the SECURITY DEFINER functions below may touch this table.
alter table public.verified_identities enable row level security;

-- Columns recording the verifying account's submitted ID details.
alter table public.profiles add column if not exists identity_fingerprint text;
alter table public.profiles add column if not exists id_number text;
alter table public.profiles add column if not exists id_type   text;
alter table public.profiles add column if not exists id_dob    date;

-- ---------------------------------------------------------------------------
-- claim_identity: called when a user submits identity verification.
-- Returns: 'ok' | 'in_use' | 'banned' | 'limit' | 'error'.
-- ---------------------------------------------------------------------------
create or replace function public.claim_identity(p_fingerprint text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  rec public.verified_identities%rowtype;
  v_active_suspended boolean;
begin
  if v_user is null then
    return 'error';
  end if;

  select * into rec from public.verified_identities where fingerprint = p_fingerprint;

  -- First time this identity is seen.
  if not found then
    insert into public.verified_identities (fingerprint, use_count, active_user_id)
    values (p_fingerprint, 1, v_user);
    return 'ok';
  end if;

  -- Identity is permanently banned (lifetime cap already exceeded).
  if rec.banned then
    return 'banned';
  end if;

  -- Already verified on THIS account — idempotent success.
  if rec.active_user_id = v_user then
    return 'ok';
  end if;

  -- Verified on ANOTHER account — only reusable if that account is suspended.
  if rec.active_user_id is not null then
    select suspended into v_active_suspended
      from public.profiles where id = rec.active_user_id;
    if coalesce(v_active_suspended, false) = false then
      return 'in_use';
    end if;
  end if;

  -- Re-verifying after suspension / freed slot. Enforce the lifetime cap (5).
  if rec.use_count >= 5 then
    update public.verified_identities
      set banned = true, updated_at = now()
      where fingerprint = p_fingerprint;
    return 'limit';
  end if;

  update public.verified_identities
    set use_count = rec.use_count + 1,
        active_user_id = v_user,
        updated_at = now()
    where fingerprint = p_fingerprint;
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- release_identity: frees the active slot when an account is suspended, so the
-- person can verify a new account. Callable for yourself, or by an admin.
-- ---------------------------------------------------------------------------
create or replace function public.release_identity(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = v_caller;
  if v_caller is null
     or (p_user_id <> v_caller and coalesce(v_is_admin, false) = false) then
    raise exception 'not authorized';
  end if;
  update public.verified_identities
    set active_user_id = null, updated_at = now()
    where active_user_id = p_user_id;
end;
$$;

grant execute on function public.claim_identity(text)  to authenticated;
grant execute on function public.release_identity(uuid) to authenticated;

-- ============================================================================
-- DONE.
-- ============================================================================
