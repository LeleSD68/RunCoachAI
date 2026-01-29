
-- 1. AGGIORNA TABELLA PROFILES PER PRESENZA
alter table public.profiles 
add column if not exists last_seen_at timestamp with time zone;

-- 2. TABELLA AMICI
create table public.friends (
  id uuid default uuid_generate_v4() primary key,
  user_id_1 uuid references auth.users not null,
  user_id_2 uuid references auth.users not null,
  status text check (status in ('pending', 'accepted')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id_1, user_id_2)
);

-- Indici per performance
create index idx_friends_user1 on public.friends(user_id_1);
create index idx_friends_user2 on public.friends(user_id_2);

-- RLS per Amici
alter table public.friends enable row level security;

-- Visiualizza le proprie amicizie
create policy "Users can view own friendships" on public.friends
  for select using (auth.uid() = user_id_1 or auth.uid() = user_id_2);

-- Inserisci richieste (solo come user_id_1)
create policy "Users can send friend requests" on public.friends
  for insert with check (auth.uid() = user_id_1);

-- Aggiorna stato (accetta richiesta)
create policy "Users can update own friendships" on public.friends
  for update using (auth.uid() = user_id_2);

-- 3. AGGIORNA POLICY TRACCE PER VISIBILITA' AMICI
-- Permetti la lettura se l'utente è il proprietario O se è amico del proprietario
create or replace function public.is_friend(check_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.friends
    where (user_id_1 = auth.uid() and user_id_2 = check_id and status = 'accepted')
       or (user_id_1 = check_id and user_id_2 = auth.uid() and status = 'accepted')
  );
end;
$$ language plpgsql security definer;

-- Rimuovi la vecchia policy restrittiva solo per owner
drop policy if exists "Users can view own tracks" on public.tracks;

-- Nuova policy: Owner + Friends
create policy "Users can view own and friends tracks" on public.tracks
  for select using (
    auth.uid() = user_id or public.is_friend(user_id)
  );

-- 4. AGGIORNA POLICY PROFILI (Per cercare amici)
drop policy if exists "Users can view own profile" on public.profiles;
-- Tutti possono vedere i profili base (nome, avatar) per cercarsi
create policy "Users can view all profiles" on public.profiles
  for select using (true);
