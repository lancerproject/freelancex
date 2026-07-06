-- ===========================================================================
-- Xwork — Row-Level Security (RLS) hardening
-- Locks every table so users can only read/write what they should.
-- Safe to run multiple times (drops + recreates policies).
-- If anything breaks, you can temporarily disable RLS on a table with:
--   alter table public.<table> disable row level security;
-- ===========================================================================

-- ---------- PROFILES (public read; edit only your own) ----------
alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (true);
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------- JOBS (open jobs public; drafts + writes only owner) ----------
alter table public.jobs enable row level security;
drop policy if exists jobs_select on public.jobs;
create policy jobs_select on public.jobs for select
  using (status::text is distinct from 'draft' or client_id = auth.uid());
drop policy if exists jobs_insert on public.jobs;
create policy jobs_insert on public.jobs for insert with check (client_id = auth.uid());
drop policy if exists jobs_update on public.jobs;
create policy jobs_update on public.jobs for update using (client_id = auth.uid()) with check (client_id = auth.uid());
drop policy if exists jobs_delete on public.jobs;
create policy jobs_delete on public.jobs for delete using (client_id = auth.uid());

-- ---------- PROPOSALS (freelancer who sent it + the job's client) ----------
alter table public.proposals enable row level security;
drop policy if exists proposals_select on public.proposals;
create policy proposals_select on public.proposals for select using (
  freelancer_id = auth.uid()
  or exists (select 1 from public.jobs j where j.id = proposals.job_id and j.client_id = auth.uid())
);
drop policy if exists proposals_insert on public.proposals;
create policy proposals_insert on public.proposals for insert with check (freelancer_id = auth.uid());
drop policy if exists proposals_update on public.proposals;
create policy proposals_update on public.proposals for update using (
  freelancer_id = auth.uid()
  or exists (select 1 from public.jobs j where j.id = proposals.job_id and j.client_id = auth.uid())
);

-- ---------- CONTRACTS (client or freelancer party only) ----------
alter table public.contracts enable row level security;
drop policy if exists contracts_select on public.contracts;
create policy contracts_select on public.contracts for select using (client_id = auth.uid() or freelancer_id = auth.uid());
drop policy if exists contracts_insert on public.contracts;
create policy contracts_insert on public.contracts for insert with check (client_id = auth.uid() or freelancer_id = auth.uid());
drop policy if exists contracts_update on public.contracts;
create policy contracts_update on public.contracts for update using (client_id = auth.uid() or freelancer_id = auth.uid());

-- ---------- MILESTONES (parties to the parent contract) ----------
alter table public.milestones enable row level security;
drop policy if exists milestones_all on public.milestones;
create policy milestones_all on public.milestones for all
  using (exists (select 1 from public.contracts c where c.id = milestones.contract_id and (c.client_id = auth.uid() or c.freelancer_id = auth.uid())))
  with check (exists (select 1 from public.contracts c where c.id = milestones.contract_id and (c.client_id = auth.uid() or c.freelancer_id = auth.uid())));

-- ---------- CONVERSATIONS (participants only) ----------
alter table public.conversations enable row level security;
drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations for select using (participant_1 = auth.uid() or participant_2 = auth.uid());
drop policy if exists conversations_insert on public.conversations;
create policy conversations_insert on public.conversations for insert with check (participant_1 = auth.uid() or participant_2 = auth.uid());

-- ---------- MESSAGES (participants of the conversation) ----------
alter table public.messages enable row level security;
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select using (
  exists (select 1 from public.conversations c where c.id = messages.conversation_id and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid()))
);
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert with check (
  sender_id = auth.uid()
  and exists (select 1 from public.conversations c where c.id = messages.conversation_id and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid()))
);

-- ---------- NOTIFICATIONS (read/edit own; anyone signed-in may create one
--             for another user, e.g. "you got a proposal") ----------
alter table public.notifications enable row level security;
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select using (user_id = auth.uid());
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert to authenticated with check (true);
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update using (user_id = auth.uid());
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete using (user_id = auth.uid());

-- ---------- REVIEWS (public read; write as yourself) ----------
alter table public.reviews enable row level security;
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews for select using (true);
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert with check (reviewer_id = auth.uid());

-- ---------- SAVED_JOBS / SAVED_TALENT (only your own) ----------
alter table public.saved_jobs enable row level security;
drop policy if exists saved_jobs_all on public.saved_jobs;
create policy saved_jobs_all on public.saved_jobs for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.saved_talent enable row level security;
drop policy if exists saved_talent_all on public.saved_talent;
create policy saved_talent_all on public.saved_talent for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- CONTRACT_FILES (parties to the contract) ----------
alter table public.contract_files enable row level security;
drop policy if exists contract_files_all on public.contract_files;
create policy contract_files_all on public.contract_files for all
  using (exists (select 1 from public.contracts c where c.id = contract_files.contract_id and (c.client_id = auth.uid() or c.freelancer_id = auth.uid())))
  with check (uploaded_by = auth.uid() and exists (select 1 from public.contracts c where c.id = contract_files.contract_id and (c.client_id = auth.uid() or c.freelancer_id = auth.uid())));

-- ---------- TIME_LOGS (parties to the contract) ----------
alter table public.time_logs enable row level security;
drop policy if exists time_logs_all on public.time_logs;
create policy time_logs_all on public.time_logs for all using (freelancer_id = auth.uid() or client_id = auth.uid()) with check (freelancer_id = auth.uid() or client_id = auth.uid());

-- ---------- PORTFOLIO_ITEMS + COWORKER_INVITES (empty/unused — lock down) ----------
-- These tables aren't used by the app yet (portfolio lives in profiles.portfolio
-- jsonb). Enabling RLS with no policy denies all access = safe by default.
alter table public.portfolio_items enable row level security;
alter table public.coworker_invites enable row level security;
