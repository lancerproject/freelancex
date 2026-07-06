-- Attachments on support/dispute messages.
-- Stored as a JSON array of { name, url, type } objects. The files themselves
-- live in the existing "project-files" storage bucket (uploaded client-side,
-- referenced here by public URL) — same pattern as chat attachments.
alter table support_messages
  add column if not exists attachments jsonb;
