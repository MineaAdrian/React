-- Create a bucket for recipe photos if it doesn't exist
insert into storage.buckets (id, name, public)
values ('recipes', 'recipes', true)
on conflict (id) do nothing;

-- Set up RLS policies for the recipes bucket
-- 1. Allow public access to read photos
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'recipes' );

-- 2. Allow authenticated users to upload photos
create policy "Authenticated Upload"
on storage.objects for insert
with check (
  bucket_id = 'recipes' 
  and auth.role() = 'authenticated'
);

-- 3. Allow users to update/delete their own uploads (optional, but good for management)
create policy "Authenticated Management"
on storage.objects for update
using ( bucket_id = 'recipes' and auth.role() = 'authenticated' );

create policy "Authenticated Deletion"
on storage.objects for delete
using ( bucket_id = 'recipes' and auth.role() = 'authenticated' );
