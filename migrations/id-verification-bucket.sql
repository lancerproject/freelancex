-- Private storage bucket for identity-verification images (ID front/back +
-- selfie). Unlike project-files, this bucket is NOT public — the images are
-- sensitive PII. Users upload into their own folder; admins view them only
-- through short-lived signed URLs generated server-side with the service role
-- (which bypasses these policies).

insert into storage.buckets (id, name, public)
values ('id-verifications', 'id-verifications', false)
on conflict (id) do update set public = false;

-- A user may upload into (and read back) ONLY their own folder: the object
-- path must start with "<their user id>/".
drop policy if exists id_verif_insert on storage.objects;
create policy id_verif_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'id-verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists id_verif_select_own on storage.objects;
create policy id_verif_select_own on storage.objects for select to authenticated
  using (
    bucket_id = 'id-verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists id_verif_update_own on storage.objects;
create policy id_verif_update_own on storage.objects for update to authenticated
  using (
    bucket_id = 'id-verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
