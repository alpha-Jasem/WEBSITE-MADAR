insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-assets',
  'company-assets',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "company assets are publicly readable" on storage.objects;
drop policy if exists "company owners can upload assets" on storage.objects;
drop policy if exists "company owners can update assets" on storage.objects;
drop policy if exists "company owners can delete assets" on storage.objects;

create policy "company assets are publicly readable"
on storage.objects for select
to public
using (bucket_id = 'company-assets');

create policy "company owners can upload assets"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'company-assets'
  and exists (
    select 1
    from public.companies c
    where c.id::text = (storage.foldername(name))[1]
      and c.auth_user_id = auth.uid()
  )
);

create policy "company owners can update assets"
on storage.objects for update
to authenticated
using (
  bucket_id = 'company-assets'
  and exists (
    select 1
    from public.companies c
    where c.id::text = (storage.foldername(name))[1]
      and c.auth_user_id = auth.uid()
  )
)
with check (
  bucket_id = 'company-assets'
  and exists (
    select 1
    from public.companies c
    where c.id::text = (storage.foldername(name))[1]
      and c.auth_user_id = auth.uid()
  )
);

create policy "company owners can delete assets"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'company-assets'
  and exists (
    select 1
    from public.companies c
    where c.id::text = (storage.foldername(name))[1]
      and c.auth_user_id = auth.uid()
  )
);
