
-- 1. ABILITA I TIPI NECESSARI
create extension if not exists "uuid-ossp";

-- 2. TABELLA PROFILI UTENTE (Create if not exists + Alter columns)
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  name text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Aggiungi colonne se non esistono (Migrazione sicura)
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'age') then
        alter table public.profiles add column age integer;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'weight') then
        alter table public.profiles add column weight numeric;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'height') then
        alter table public.profiles add column height numeric;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'gender') then
        alter table public.profiles add column gender text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'max_hr') then
        alter table public.profiles add column max_hr integer;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'resting_hr') then
        alter table public.profiles add column resting_hr integer;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'goals') then
        alter table public.profiles add column goals text[];
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'ai_personality') then
        alter table public.profiles add column ai_personality text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'personal_notes') then
        alter table public.profiles add column personal_notes text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'shoes') then
        alter table public.profiles add column shoes text[];
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'retired_shoes') then
        alter table public.profiles add column retired_shoes text[]; -- NUOVA COLONNA
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'weight_history') then
        alter table public.profiles add column weight_history jsonb;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'strava_auto_sync') then
        alter table public.profiles add column strava_auto_sync boolean default false;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'last_seen_at') then
        alter table public.profiles add column last_seen_at timestamp with time zone;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'ga_measurement_id') then
        alter table public.profiles add column ga_measurement_id text;
    end if;
end $$;

-- Policy profili
alter table public.profiles enable row level security;
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "Users can view all profiles" on public.profiles;
create policy "Users can view all profiles" on public.profiles for select using (true); -- Per social features

-- 3. TABELLA TRACCE (TRACKS)
create table if not exists public.tracks (
  id text not null primary key,
  user_id uuid references auth.users not null,
  name text not null,
  start_time timestamp with time zone,
  distance_km numeric,
  duration_ms numeric,
  activity_type text,
  points_data jsonb,
  color text,
  folder text,
  notes text,
  shoe text,
  rpe integer,
  rating integer,
  rating_reason text,
  tags text[],
  is_favorite boolean default false,
  is_archived boolean default false,
  has_chat boolean default false,
  linked_workout jsonb,
  is_public boolean default false,
  shared_with_users uuid[] default '{}',
  shared_with_groups uuid[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Aggiornamenti colonne tracks
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'tracks' and column_name = 'shared_with_users') then
        alter table public.tracks add column shared_with_users uuid[] default '{}';
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'tracks' and column_name = 'shared_with_groups') then
        alter table public.tracks add column shared_with_groups uuid[] default '{}';
    end if;
end $$;

alter table public.tracks enable row level security;
-- Le policy vengono gestite dallo script social setup più avanzato, qui mettiamo la base
drop policy if exists "Users can insert own tracks" on public.tracks;
create policy "Users can insert own tracks" on public.tracks for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own tracks" on public.tracks;
create policy "Users can update own tracks" on public.tracks for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own tracks" on public.tracks;
create policy "Users can delete own tracks" on public.tracks for delete using (auth.uid() = user_id);

-- 4. TABELLA ALLENAMENTI PIANIFICATI (DIARIO)
create table if not exists public.planned_workouts (
  id text not null primary key,
  user_id uuid references auth.users not null,
  title text,
  description text,
  date timestamp with time zone,
  activity_type text,
  is_ai_suggested boolean default false,
  completed_track_id text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.planned_workouts enable row level security;
drop policy if exists "Users can view own workouts" on public.planned_workouts;
create policy "Users can view own workouts" on public.planned_workouts for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own workouts" on public.planned_workouts;
create policy "Users can insert own workouts" on public.planned_workouts for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own workouts" on public.planned_workouts;
create policy "Users can update own workouts" on public.planned_workouts for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own workouts" on public.planned_workouts;
create policy "Users can delete own workouts" on public.planned_workouts for delete using (auth.uid() = user_id);

-- 5. TABELLA CHAT AI
create table if not exists public.chats (
  id text not null primary key,
  user_id uuid references auth.users not null,
  messages jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.chats enable row level security;
drop policy if exists "Users can view own chats" on public.chats;
create policy "Users can view own chats" on public.chats for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own chats" on public.chats;
create policy "Users can insert own chats" on public.chats for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own chats" on public.chats;
create policy "Users can update own chats" on public.chats for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own chats" on public.chats;
create policy "Users can delete own chats" on public.chats for delete using (auth.uid() = user_id);

-- 6. TRIGGER
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing; -- Previene errori se il profilo esiste
  return new;
end;
$$ language plpgsql security definer;

-- Ricrea trigger se necessario
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
