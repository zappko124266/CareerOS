-- Creates the private "resumes" Storage bucket and RLS policies scoping
-- each user to their own folder (object paths are `{userId}/{resumeId}/{filename}`,
-- written by src/lib/storage/resume-bucket.ts).
--
-- Not owned by Prisma Migrate (Supabase Storage lives outside `public`).
-- Apply once per environment:
--
--   npx prisma db execute --file prisma/sql/002_resume_storage.sql --schema prisma/schema.prisma
--
-- (or paste into the Supabase SQL editor). Idempotent — safe to re-run.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  5242880, -- 5 MB
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read own resume files" on storage.objects;
create policy "Users can read own resume files"
  on storage.objects for select
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can upload own resume files" on storage.objects;
create policy "Users can upload own resume files"
  on storage.objects for insert
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update own resume files" on storage.objects;
create policy "Users can update own resume files"
  on storage.objects for update
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete own resume files" on storage.objects;
create policy "Users can delete own resume files"
  on storage.objects for delete
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
