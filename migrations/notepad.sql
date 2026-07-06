-- ============================================================================
-- Xwork — Personal notepad on conversations
-- A private per-user note attached to a conversation (only the author sees
-- it; RLS on conversation_prefs already restricts rows to their owner).
-- Run in Supabase -> SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.conversation_prefs add column if not exists note text;

-- ============================================================================
-- DONE.
-- ============================================================================
