
-- 1. AGGIORNA TABELLA PROFILES PER PRESENZA
-- Usa un blocco DO per controllare l'esistenza della colonna in modo sicuro
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'last_seen_at') then
        alter table public.profiles add column last_seen_at timestamp with time zone;
    end if;
end $$;

-- 2. TABELLA AMICI
create table if not exists public.friends (
  id uuid default uuid_generate_v4() primary key,
  user_id_1 uuid references auth.users not null,
  user_id_2 uuid references auth.users not null,
  status text check (status in ('pending', 'accepted')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id_1, user_id_2)
);

-- Indici per performance
create index if not exists idx_friends_user1 on public.friends(user_id_1);
create index if not exists idx_friends_user2 on public.friends(user_id_2);

-- RLS per Amici
alter table public.friends enable row level security;

-- Pulizia vecchie policy per evitare errori "policy already exists"
drop policy if exists "Users can view own friendships" on public.friends;
drop policy if exists "Users can send friend requests" on public.friends;
drop policy if exists "Users can update own friendships" on public.friends;
drop policy if exists "Users can delete own friendships" on public.friends;

-- Visualizza le proprie amicizie
create policy "Users can view own friendships" on public.friends
  for select using (auth.uid() = user_id_1 or auth.uid() = user_id_2);

-- Inserisci richieste (solo come user_id_1)
create policy "Users can send friend requests" on public.friends
  for insert with check (auth.uid() = user_id_1);

-- Aggiorna stato (accetta richiesta come user_id_2)
create policy "Users can update own friendships" on public.friends
  for update using (auth.uid() = user_id_2);

-- Cancella amicizia o rifiuta richiesta
create policy "Users can delete own friendships" on public.friends
  for delete using (auth.uid() = user_id_1 or auth.uid() = user_id_2);

-- 3. FUNZIONE HELPER PER VISIBILITA' TRACCE AMICI
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

-- Aggiorna policy tracce
drop policy if exists "Users can view own tracks" on public.tracks;
drop policy if exists "Users can view own and friends tracks" on public.tracks;

-- Nuova policy: Owner + Friends
create policy "Users can view own and friends tracks" on public.tracks
  for select using (
    auth.uid() = user_id or public.is_friend(user_id)
  );

-- 4. AGGIORNA POLICY PROFILI (Per ricerca)
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can view all profiles" on public.profiles;

create policy "Users can view all profiles" on public.profiles
  for select using (true);

-- 5. TABELLA MESSAGGI DIRETTI (CHAT PRIVATA)
create table if not exists public.direct_messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references auth.users not null,
  receiver_id uuid references auth.users not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  read_at timestamp with time zone
);

alter table public.direct_messages enable row level security;

-- Pulizia policy messaggi
drop policy if exists "Users can view own messages" on public.direct_messages;
drop policy if exists "Users can send messages" on public.direct_messages;

-- Policy: Vedi messaggi inviati o ricevuti da te
create policy "Users can view own messages" on public.direct_messages
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Policy: Inserisci messaggi solo come mittente
create policy "Users can send messages" on public.direct_messages
  for insert with check (auth.uid() = sender_id);
