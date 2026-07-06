-- Security question & answer (a backup factor for two-step verification).
-- The answer is never stored in plain text — only a salted scrypt hash.
alter table public.profiles
  add column if not exists security_question text,
  add column if not exists security_answer_hash text;
