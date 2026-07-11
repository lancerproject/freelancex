-- =====================================================================
-- xWork escrow — Phase 2: atomic money operations (plpgsql)
-- =====================================================================
-- Every function here is the ONLY sanctioned way to move a milestone or post
-- to the ledger. Each one:
--   * locks the milestone row with SELECT ... FOR UPDATE (no races),
--   * re-reads the status under the lock and rejects any illegal transition,
--   * posts the fee/release/refund rows to the append-only ledger,
--   * writes an audit row,
-- all inside one transaction. SECURITY DEFINER so the app calls them with the
-- normal user key while the functions (not the client) own the money tables.
-- Amounts are NUMERIC(12,2); fees come from fee_rules, never hardcoded.
-- =====================================================================

-- Fee rate for a role/plan from the configurable table (0 if none active).
create or replace function escrow_fee_rate(p_role text, p_plan text)
returns numeric language sql stable as $$
  select coalesce((
    select value from fee_rules
    where role = p_role and active
      and (plan is null or plan = p_plan)
      and applies_to = 'milestone'
    order by (plan is not null) desc
    limit 1
  ), 0)::numeric;
$$;

create or replace function escrow_audit(
  p_actor uuid, p_action text, p_entity text, p_entity_id uuid,
  p_from text, p_to text, p_amount numeric, p_meta jsonb default '{}'::jsonb
) returns void language sql as $$
  insert into escrow_audit_log(actor_id, action, entity_type, entity_id, from_status, to_status, amount, metadata)
  values (p_actor, p_action, p_entity, p_entity_id, p_from, p_to, p_amount, coalesce(p_meta,'{}'::jsonb));
$$;

-- ---------- FUND (client money into escrow) --------------------------
create or replace function escrow_fund_milestone(p_milestone uuid, p_actor uuid, p_idem text default null)
returns void language plpgsql security definer as $$
declare m record; c record; client_fee numeric; rate numeric;
begin
  select * into m from milestones where id = p_milestone for update;
  if not found then raise exception 'milestone not found'; end if;
  if m.escrow_status is not null and m.escrow_status <> 'FUNDED' then
    raise exception 'cannot fund a milestone in status %', m.escrow_status;
  end if;
  select * into c from contracts where id = m.contract_id;
  rate := escrow_fee_rate('client', null);
  client_fee := round(m.amount * rate, 2);

  insert into escrow_transactions(milestone_id, contract_id, type, amount, from_party, to_party, created_by, idempotency_key, metadata)
  values (m.id, m.contract_id, 'fund', m.amount, 'client', 'escrow', p_actor,
          case when p_idem is null then null else p_idem || ':fund' end, jsonb_build_object('gross', m.amount));
  if client_fee > 0 then
    insert into escrow_transactions(milestone_id, contract_id, type, amount, from_party, to_party, created_by, idempotency_key, metadata)
    values (m.id, m.contract_id, 'fee_client', client_fee, 'client', 'platform', p_actor,
            case when p_idem is null then null else p_idem || ':fee_client' end, jsonb_build_object('rate', rate));
  end if;

  update milestones set escrow_status = 'FUNDED', currency = coalesce(currency,'USD') where id = m.id;
  perform escrow_audit(p_actor, 'milestone.fund', 'milestone', m.id, m.escrow_status::text, 'FUNDED', m.amount,
                       jsonb_build_object('client_fee', client_fee));
end; $$;

-- ---------- SUBMIT WORK (FUNDED -> IN_REVIEW) ------------------------
create or replace function escrow_submit_work(p_milestone uuid, p_actor uuid, p_review_days int default 5)
returns void language plpgsql security definer as $$
declare m record;
begin
  select * into m from milestones where id = p_milestone for update;
  if not found then raise exception 'milestone not found'; end if;
  if m.escrow_status <> 'FUNDED' then raise exception 'can only submit from FUNDED (got %)', m.escrow_status; end if;
  update milestones set escrow_status = 'IN_REVIEW', submitted_at = now(),
    auto_approve_at = now() + (p_review_days || ' days')::interval where id = m.id;
  perform escrow_audit(p_actor, 'milestone.submit', 'milestone', m.id, 'FUNDED', 'IN_REVIEW', m.amount, '{}'::jsonb);
end; $$;

-- ---------- APPROVE (IN_REVIEW -> PENDING; freelancer fee here) ------
create or replace function escrow_approve_milestone(p_milestone uuid, p_actor uuid, p_auto boolean default false, p_clearance_days int default 3)
returns void language plpgsql security definer as $$
declare m record; c record; plan text; rate numeric; fee numeric; net numeric;
begin
  select * into m from milestones where id = p_milestone for update;
  if not found then raise exception 'milestone not found'; end if;
  if m.escrow_status <> 'IN_REVIEW' then raise exception 'can only approve from IN_REVIEW (got %)', m.escrow_status; end if;
  select * into c from contracts where id = m.contract_id;
  select coalesce(plan,'basic') into plan from profiles where id = c.freelancer_id;
  rate := escrow_fee_rate('freelancer', plan);
  fee := round(m.amount * rate, 2);
  net := m.amount - fee;                       -- reconciles to the cent

  if fee > 0 then
    insert into escrow_transactions(milestone_id, contract_id, type, amount, from_party, to_party, created_by, metadata)
    values (m.id, m.contract_id, 'fee_freelancer', fee, 'escrow', 'platform', p_actor, jsonb_build_object('rate', rate, 'plan', plan));
  end if;
  insert into escrow_transactions(milestone_id, contract_id, type, amount, from_party, to_party, created_by, metadata)
  values (m.id, m.contract_id, 'release', net, 'escrow', 'freelancer', p_actor, jsonb_build_object('gross', m.amount, 'fee', fee));

  update milestones set escrow_status = 'PENDING', reviewed_at = now(), approved_at = now(),
    security_period_ends_at = now() + (p_clearance_days || ' days')::interval where id = m.id;
  perform escrow_audit(p_actor, case when p_auto then 'milestone.auto_approve' else 'milestone.approve' end,
                       'milestone', m.id, 'IN_REVIEW', 'PENDING', net, jsonb_build_object('fee', fee, 'auto', p_auto));
end; $$;

-- ---------- REJECT / REQUEST CHANGES (IN_REVIEW -> FUNDED) ----------
create or replace function escrow_reject_milestone(p_milestone uuid, p_actor uuid)
returns void language plpgsql security definer as $$
declare m record;
begin
  select * into m from milestones where id = p_milestone for update;
  if not found then raise exception 'milestone not found'; end if;
  if m.escrow_status <> 'IN_REVIEW' then raise exception 'can only reject from IN_REVIEW (got %)', m.escrow_status; end if;
  update milestones set escrow_status = 'FUNDED', submitted_at = null, auto_approve_at = null, reviewed_at = now() where id = m.id;
  perform escrow_audit(p_actor, 'milestone.reject', 'milestone', m.id, 'IN_REVIEW', 'FUNDED', m.amount, '{}'::jsonb);
end; $$;

-- ---------- CANCEL (client ends -> 7-day freelancer window) ---------
create or replace function escrow_cancel_milestone(p_milestone uuid, p_actor uuid, p_window_days int default 7)
returns void language plpgsql security definer as $$
declare m record;
begin
  select * into m from milestones where id = p_milestone for update;
  if not found then raise exception 'milestone not found'; end if;
  if m.escrow_status not in ('FUNDED','IN_REVIEW') then raise exception 'cannot cancel from %', m.escrow_status; end if;
  update milestones set escrow_status = 'CANCELLATION_WINDOW',
    cancellation_window_ends_at = now() + (p_window_days || ' days')::interval where id = m.id;
  perform escrow_audit(p_actor, 'milestone.cancel', 'milestone', m.id, m.escrow_status::text, 'CANCELLATION_WINDOW', m.amount, '{}'::jsonb);
end; $$;

-- ---------- REFUND (cancellation window -> client) ------------------
create or replace function escrow_refund_milestone(p_milestone uuid, p_actor uuid, p_auto boolean default false)
returns void language plpgsql security definer as $$
declare m record; c record; client_fee numeric;
begin
  select * into m from milestones where id = p_milestone for update;
  if not found then raise exception 'milestone not found'; end if;
  if m.escrow_status <> 'CANCELLATION_WINDOW' then raise exception 'can only refund from CANCELLATION_WINDOW (got %)', m.escrow_status; end if;
  select * into c from contracts where id = m.contract_id;

  insert into escrow_transactions(milestone_id, contract_id, type, amount, from_party, to_party, created_by, metadata)
  values (m.id, m.contract_id, 'refund', m.amount, 'escrow', 'client', p_actor, jsonb_build_object('auto', p_auto));
  -- Refund the client marketplace fee too (fair; avoids a card chargeback).
  select coalesce(sum(amount),0) into client_fee from escrow_transactions where milestone_id = m.id and type = 'fee_client';
  if client_fee > 0 then
    insert into escrow_transactions(milestone_id, contract_id, type, amount, from_party, to_party, created_by, metadata)
    values (m.id, m.contract_id, 'refund', client_fee, 'platform', 'client', p_actor, jsonb_build_object('fee_refund', true));
  end if;

  update milestones set escrow_status = 'REFUNDED' where id = m.id;
  perform escrow_audit(p_actor, case when p_auto then 'milestone.auto_refund' else 'milestone.refund' end,
                       'milestone', m.id, 'CANCELLATION_WINDOW', 'REFUNDED', m.amount, jsonb_build_object('fee_refund', client_fee));
end; $$;

-- ---------- OPEN DISPUTE (cancellation window -> DISPUTE_HELD) -------
create or replace function escrow_open_dispute(p_milestone uuid, p_actor uuid, p_reason text)
returns uuid language plpgsql security definer as $$
declare m record; d uuid;
begin
  select * into m from milestones where id = p_milestone for update;
  if not found then raise exception 'milestone not found'; end if;
  if m.escrow_status <> 'CANCELLATION_WINDOW' then raise exception 'can only dispute from CANCELLATION_WINDOW (got %)', m.escrow_status; end if;
  update milestones set escrow_status = 'DISPUTE_HELD' where id = m.id;
  insert into escrow_disputes(milestone_id, contract_id, opened_by, reason, status)
  values (m.id, m.contract_id, p_actor, p_reason, 'open') returning id into d;
  perform escrow_audit(p_actor, 'dispute.open', 'milestone', m.id, 'CANCELLATION_WINDOW', 'DISPUTE_HELD', m.amount, jsonb_build_object('dispute', d));
  return d;
end; $$;

-- ---------- ADMIN RESOLVE DISPUTE (release / refund / split) --------
create or replace function escrow_resolve_dispute(
  p_dispute uuid, p_admin uuid, p_resolution dispute_resolution,
  p_release numeric default null, p_refund numeric default null, p_note text default null,
  p_clearance_days int default 3
) returns void language plpgsql security definer as $$
declare d record; m record; c record; plan text; rate numeric; fee numeric; net numeric; rel numeric; ref numeric;
begin
  select * into d from escrow_disputes where id = p_dispute for update;
  if not found then raise exception 'dispute not found'; end if;
  if d.status = 'resolved' then raise exception 'dispute already resolved'; end if;
  select * into m from milestones where id = d.milestone_id for update;
  if m.escrow_status <> 'DISPUTE_HELD' then raise exception 'milestone not in DISPUTE_HELD (got %)', m.escrow_status; end if;
  select * into c from contracts where id = m.contract_id;
  select coalesce(plan,'basic') into plan from profiles where id = c.freelancer_id;
  rate := escrow_fee_rate('freelancer', plan);

  rel := case p_resolution when 'release' then m.amount when 'split' then coalesce(p_release,0) else 0 end;
  ref := case p_resolution when 'refund' then m.amount when 'split' then coalesce(p_refund,0) else 0 end;
  if rel + ref <> m.amount then raise exception 'split must sum to milestone amount (% + % <> %)', rel, ref, m.amount; end if;

  if rel > 0 then
    fee := round(rel * rate, 2); net := rel - fee;
    if fee > 0 then
      insert into escrow_transactions(milestone_id, contract_id, type, amount, from_party, to_party, created_by, metadata)
      values (m.id, m.contract_id, 'fee_freelancer', fee, 'escrow', 'platform', p_admin, jsonb_build_object('dispute', d.id));
    end if;
    insert into escrow_transactions(milestone_id, contract_id, type, amount, from_party, to_party, created_by, metadata)
    values (m.id, m.contract_id, 'release', net, 'escrow', 'freelancer', p_admin, jsonb_build_object('dispute', d.id, 'gross', rel));
  end if;
  if ref > 0 then
    insert into escrow_transactions(milestone_id, contract_id, type, amount, from_party, to_party, created_by, metadata)
    values (m.id, m.contract_id, 'refund', ref, 'escrow', 'client', p_admin, jsonb_build_object('dispute', d.id));
  end if;

  update milestones set escrow_status = case when rel > 0 then 'PENDING' else 'REFUNDED' end,
    security_period_ends_at = case when rel > 0 then now() + (p_clearance_days || ' days')::interval else null end
    where id = m.id;
  update escrow_disputes set status = 'resolved', resolution = p_resolution, release_amount = rel,
    refund_amount = ref, admin_id = p_admin, resolution_note = p_note, resolved_at = now() where id = d.id;
  perform escrow_audit(p_admin, 'dispute.resolve', 'dispute', d.id, 'DISPUTE_HELD',
                       case when rel > 0 then 'PENDING' else 'REFUNDED' end, m.amount,
                       jsonb_build_object('resolution', p_resolution, 'release', rel, 'refund', ref));
end; $$;

-- ---------- CLEARANCE (PENDING -> AVAILABLE) — called by job --------
create or replace function escrow_clear_milestone(p_milestone uuid)
returns void language plpgsql security definer as $$
declare m record;
begin
  select * into m from milestones where id = p_milestone for update;
  if not found then raise exception 'milestone not found'; end if;
  if m.escrow_status <> 'PENDING' then return; end if;                 -- idempotent no-op
  if m.security_period_ends_at is null or m.security_period_ends_at > now() then return; end if;
  update milestones set escrow_status = 'AVAILABLE' where id = m.id;
  perform escrow_audit(null, 'milestone.clear', 'milestone', m.id, 'PENDING', 'AVAILABLE', m.amount, '{}'::jsonb);
end; $$;

-- ---------- REQUEST WITHDRAWAL (atomic, per-user serialized) --------
create or replace function escrow_request_withdrawal(p_actor uuid, p_amount numeric, p_method text, p_min numeric default 20, p_idem text default null)
returns uuid language plpgsql security definer as $$
declare avail numeric; w uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_actor::text));  -- serialize this user's payouts
  if p_amount < p_min then raise exception 'below minimum withdrawal of %', p_min; end if;
  select available_balance into avail from wallet_balances where user_id = p_actor;
  if coalesce(avail,0) < p_amount then raise exception 'insufficient available balance (% < %)', avail, p_amount; end if;

  insert into withdrawals(user_id, amount, method, status, idempotency_key, requested_at)
  values (p_actor, p_amount, p_method, 'requested', p_idem, now()) returning id into w;
  insert into escrow_transactions(type, amount, from_party, to_party, created_by, idempotency_key, metadata)
  values ('withdrawal', p_amount, 'freelancer', 'gateway', p_actor,
          case when p_idem is null then null else p_idem || ':wd' end, jsonb_build_object('withdrawal', w, 'method', p_method));
  perform escrow_audit(p_actor, 'withdrawal.request', 'withdrawal', w, 'AVAILABLE', 'WITHDRAWN', p_amount, jsonb_build_object('method', p_method));
  return w;
end; $$;
