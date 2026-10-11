-- Storage files and bucket creation use the Storage API. Only verified admins
-- can create this private bucket; partners read objects through document RLS.
create policy b2b_bucket_admin_read on storage.buckets for select to authenticated
  using(id='b2b-documents' and (select private.is_admin()));
create policy b2b_bucket_admin_insert on storage.buckets for insert to authenticated
  with check(id='b2b-documents' and public=false and file_size_limit>0 and file_size_limit<=10485760
    and allowed_mime_types is not null and allowed_mime_types <@ array[
      'application/pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword','image/jpeg','image/png','image/webp'] and (select private.is_admin()));
create policy b2b_storage_admin on storage.objects for all to authenticated
  using(bucket_id='b2b-documents' and (select private.is_admin()))
  with check(bucket_id='b2b-documents' and (select private.is_admin()));
create policy b2b_storage_partner_read on storage.objects for select to authenticated
  using(bucket_id='b2b-documents' and exists(select 1 from public.b2b_documents d where d.storage_path=name));
