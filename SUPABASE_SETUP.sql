
-- 1. ABILITA I TIPI NECESSARI
create extension if not exists "uuid-ossp";

-- 2. TABELLA PROFILI UTENTE
create table public.profiles (
  id uuid references auth.users not null primary key,
  name text,
  age integer,
  weight numeric,
  height numeric,
  gender text,
  max_hr integer,
  resting_hr integer,
  goals text[], -- Array di stringhe
  ai_personality text,
  personal_notes text,
  shoes text[], -- Array di stringhe
  weight_history jsonb, -- Array di oggetti {date, weight}
  strava_auto_sync boolean default false, -- NUOVO CAMPO
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Sicurezza: Ognuno vede e modifica solo il proprio profilo
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- 3. TABELLA TRACCE (TRACKS)
create table public.tracks (
  id text not null primary key, -- Usiamo text perché alcuni ID locali potrebbero non essere UUID standard, altrimenti usa UUID
  user_id uuid references auth.users not null,
  name text not null,
  start_time timestamp with time zone,
  distance_km numeric,
  duration_ms numeric,
  activity_type text,
  points_data jsonb, -- Qui salviamo l'array gigante di punti coordinate/elevazione/hr
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
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Sicurezza: Ognuno vede e modifica solo le proprie tracce
alter table public.tracks enable row level security;
create policy "Users can view own tracks" on public.tracks for select using (auth.uid() = user_id);
create policy "Users can insert own tracks" on public.tracks for insert with check (auth.uid() = user_id);
create policy "Users can update own tracks" on public.tracks for update using (auth.uid() = user_id);
create policy "Users can delete own tracks" on public.tracks for delete using (auth.uid() = user_id);

-- 4. TABELLA ALLENAMENTI PIANIFICATI (DIARIO)
create table public.planned_workouts (
  id text not null primary key,
  user_id uuid references auth.users not null,
  title text,
  description text,
  date timestamp with time zone,
  activity_type text,
  is_ai_suggested boolean default false,
  completed_track_id text, -- Collegamento opzionale alla traccia svolta
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.planned_workouts enable row level security;
create policy "Users can view own workouts" on public.planned_workouts for select using (auth.uid() = user_id);
create policy "Users can insert own workouts" on public.planned_workouts for insert with check (auth.uid() = user_id);
create policy "Users can update own workouts" on public.planned_workouts for update using (auth.uid() = user_id);
create policy "Users can delete own workouts" on public.planned_workouts for delete using (auth.uid() = user_id);

-- 5. TABELLA CHAT AI
create table public.chats (
  id text not null primary key,
  user_id uuid references auth.users not null,
  messages jsonb, -- Array di messaggi
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.chats enable row level security;
create policy "Users can view own chats" on public.chats for select using (auth.uid() = user_id);
create policy "Users can insert own chats" on public.chats for insert with check (auth.uid() = user_id);
create policy "Users can update own chats" on public.chats for update using (auth.uid() = user_id);
create policy "Users can delete own chats" on public.chats for delete using (auth.uid() = user_id);

-- 6. TRIGGER PER GESTIONE UTENTI
-- Questo serve a creare automaticamente una riga nella tabella profiles quando un utente si registra
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- MIGRATION: SE LA TABELLA ESISTE GIA', ESEGUI SOLO QUESTO COMANDO NELLA CONSOLE SQL DI SUPABASE:
-- alter table public.profiles add column if not exists strava_auto_sync boolean default false;
