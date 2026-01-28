-- Family Planner – Supabase schema
-- Run in Supabase SQL editor or via migrations

-- Families
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Users (extends auth.users via profile)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  family_id uuid references public.families(id) on delete set null,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Recipes (family_id null = global)
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade,
  name text not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'togo', 'dessert')),
  ingredients jsonb not null default '[]', -- [{ name, quantity, unit }]
  instructions text default '',
  cooking_time_minutes int,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  tags text[] default '{}',
  photo_url text,
  created_at timestamptz default now()
);

-- Week plans (one per family per week)
create table if not exists public.week_plans (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  start_date date not null,
  days jsonb not null default '[]', -- [{ date, meals: { breakfast:[], lunch:[], ... } }]
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(family_id, start_date)
);

-- Shopping list (one per family per week; real-time)
create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  week_start date not null,
  ingredient_name text not null,
  total_quantity numeric not null default 0,
  unit text not null default 'pcs',
  checked boolean not null default false,
  checked_by uuid[] default '{}',
  recipe_ids uuid[] default '{}',
  created_at timestamptz default now(),
  unique(family_id, week_start, ingredient_name, unit)
);

-- RLS
alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.week_plans enable row level security;
alter table public.shopping_items enable row level security;

-- Policies: users see/edit data for their family only
create or replace function public.current_family_id()
returns uuid as $$
  select family_id from public.profiles where id = auth.uid()
$$ language sql security definer stable;

-- Families: members can read their family; users without a family can create one
create policy "family_read" on public.families
  for select using (id = public.current_family_id());
create policy "family_insert_no_family" on public.families
  for insert with check (public.current_family_id() is null);

-- Profiles: read own, update own
create policy "profile_read" on public.profiles
  for select using (true);
create policy "profile_update_own" on public.profiles
  for update using (id = auth.uid());

-- Recipes: read own family or global (family_id is null)
create policy "recipes_read" on public.recipes
  for select using (
    family_id is null or family_id = public.current_family_id()
  );
create policy "recipes_insert" on public.recipes
  for insert with check (family_id is null or family_id = public.current_family_id());
create policy "recipes_update" on public.recipes
  for update using (family_id = public.current_family_id() or family_id is null);
create policy "recipes_delete" on public.recipes
  for delete using (family_id = public.current_family_id());

-- Week plans
create policy "week_plans_all" on public.week_plans
  for all using (family_id = public.current_family_id());

-- Shopping items (real-time)
create policy "shopping_items_all" on public.shopping_items
  for all using (family_id = public.current_family_id());

-- Trigger: create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Enable real-time for shopping_items
alter publication supabase_realtime add table public.shopping_items;
