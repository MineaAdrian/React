-- Add photo_url column to recipes table
alter table public.recipes 
add column if not exists photo_url text;

-- Add comment to column
comment on column public.recipes.photo_url is 'URL to recipe photo (stored in Supabase Storage or external)';
