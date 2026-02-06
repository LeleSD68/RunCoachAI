
-- 1. AGGIORNA TABELLA PROFILES PER PRESENZA
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

create index if not exists idx_friends_user1 on public.friends(user_id_1);
create index if not exists idx_friends_user2 on public.friends(user_id_2);

alter table public.friends enable row level security;

-- Drop existing policies for friends to ensure clean slate
drop policy if exists "Users can view own friendships" on public.friends;
drop policy if exists "Users can send friend requests" on public.friends;
drop policy if exists "Users can update own friendships" on public.friends;
drop policy if exists "Users can delete own friendships" on public.friends;

create policy "Users can view own friendships" on public.friends for select using (auth.uid() = user_id_1 or auth.uid() = user_id_2);
create policy "Users can send friend requests" on public.friends for insert with check (auth.uid() = user_id_1);
create policy "Users can update own friendships" on public.friends for update using (auth.uid() = user_id_2);
create policy "Users can delete own friendships" on public.friends for delete using (auth.uid() = user_id_1 or auth.uid() = user_id_2);

-- 3. TABELLA GRUPPI
create table if not exists public.social_groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  owner_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.social_groups enable row level security;

create table if not exists public.social_group_members (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.social_groups(id) on delete cascade,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(group_id, user_id)
);

alter table public.social_group_members enable row level security;

-- Policy Gruppi
drop policy if exists "View groups" on public.social_groups;
create policy "View groups" on public.social_groups for select using (true); -- Tutti possono vedere i gruppi esistenti per unirsi

drop policy if exists "Manage own groups" on public.social_groups;
create policy "Manage own groups" on public.social_groups for all using (auth.uid() = owner_id);

-- Policy Membri
drop policy if exists "View group members" on public.social_group_members;
create policy "View group members" on public.social_group_members for select using (true);

-- FIX: Modificata policy per permettere l'aggiunta sia self-join che da parte del proprietario
drop policy if exists "Manage group members" on public.social_group_members;
drop policy if exists "Join groups" on public.social_group_members; -- Remove old policy name if exists

create policy "Manage group members" on public.social_group_members for insert with check (
  auth.uid() = user_id -- L'utente si unisce da solo
  OR
  exists ( -- OPPURE l'utente attuale è il proprietario del gruppo
    select 1 from public.social_groups
    where id = group_id
    and owner_id = auth.uid()
  )
);

drop policy if exists "Leave groups" on public.social_group_members;
create policy "Leave groups" on public.social_group_members for delete using (
    auth.uid() = user_id -- Lascia il gruppo
    OR
    exists ( -- Il proprietario rimuove un membro
        select 1 from public.social_groups
        where id = group_id
        and owner_id = auth.uid()
    )
);

-- 4. AGGIORNA TRACKS CON CAMPI CONDIVISIONE
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'tracks' and column_name = 'shared_with_users') then
        alter table public.tracks add column shared_with_users uuid[] default '{}';
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'tracks' and column_name = 'shared_with_groups') then
        alter table public.tracks add column shared_with_groups uuid[] default '{}';
    end if;
end $$;

-- Helper function: Is member of any of these groups?
create or replace function public.is_member_of_any(group_ids uuid[])
returns boolean as $$
begin
  return exists (
    select 1 from public.social_group_members
    where user_id = auth.uid() and group_id = any(group_ids)
  );
end;
$$ language plpgsql security definer;

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

-- Aggiorna policy tracce per supporto condivisione granulare
drop policy if exists "Users can view own tracks" on public.tracks;
drop policy if exists "Users can view own and friends tracks" on public.tracks;
drop policy if exists "View tracks shared with me" on public.tracks;
drop policy if exists "Insert own tracks" on public.tracks;
drop policy if exists "Update own tracks" on public.tracks;
drop policy if exists "Delete own tracks" on public.tracks;

create policy "View tracks shared with me" on public.tracks
  for select using (
    auth.uid() = user_id -- Owner
    or (is_public = true and public.is_friend(user_id)) -- Public Friends
    or (auth.uid() = any(shared_with_users)) -- Private Share
    or (public.is_member_of_any(shared_with_groups)) -- Group Share
  );

create policy "Insert own tracks" on public.tracks for insert with check (auth.uid() = user_id);
create policy "Update own tracks" on public.tracks for update using (auth.uid() = user_id);
create policy "Delete own tracks" on public.tracks for delete using (auth.uid() = user_id);

-- 5. MESSAGGI DIRETTI (1-to-1)
create table if not exists public.direct_messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references auth.users not null,
  receiver_id uuid references auth.users not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  read_at timestamp with time zone
);

alter table public.direct_messages enable row level security;

drop policy if exists "Users can view own messages" on public.direct_messages;
drop policy if exists "Users can send messages" on public.direct_messages;

create policy "Users can view own messages" on public.direct_messages for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Users can send messages" on public.direct_messages for insert with check (auth.uid() = sender_id);

-- 6. MESSAGGI DI GRUPPO (NEW)
create table if not exists public.group_messages (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.social_groups(id) on delete cascade not null,
  sender_id uuid references auth.users not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.group_messages enable row level security;

-- Policy per Group Messages: Solo i membri del gruppo possono leggere e scrivere
drop policy if exists "Group members can view messages" on public.group_messages;
drop policy if exists "Group members can send messages" on public.group_messages;

create policy "Group members can view messages" on public.group_messages for select using (
  exists (
    select 1 from public.social_group_members 
    where group_id = group_messages.group_id and user_id = auth.uid()
  )
);

create policy "Group members can send messages" on public.group_messages for insert with check (
  auth.uid() = sender_id AND
  exists (
    select 1 from public.social_group_members 
    where group_id = group_messages.group_id and user_id = auth.uid()
  )
);

-- 7. REAZIONI
create table if not exists public.activity_reactions (
  id uuid default uuid_generate_v4() primary key,
  track_id text references public.tracks(id) on delete cascade,
  user_id uuid references auth.users not null,
  emoji text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(track_id, user_id)
);

alter table public.activity_reactions enable row level security;

drop policy if exists "View reactions if access to track" on public.activity_reactions;
drop policy if exists "Insert own reactions" on public.activity_reactions;
drop policy if exists "Delete own reactions" on public.activity_reactions;

create policy "View reactions if access to track" on public.activity_reactions for select using (exists (select 1 from public.tracks where id = activity_reactions.track_id));
create policy "Insert own reactions" on public.activity_reactions for insert with check (auth.uid() = user_id);
create policy "Delete own reactions" on public.activity_reactions for delete using (auth.uid() = user_id);

-- 8. PROFILES VISIBILITY
drop policy if exists "Users can view all profiles" on public.profiles;
create policy "Users can view all profiles" on public.profiles for select using (true);

-- 9. ABILITAZIONE REALTIME
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages') then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'group_messages') then
    alter publication supabase_realtime add table public.group_messages;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friends') then
    alter publication supabase_realtime add table public.friends;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tracks') then
    alter publication supabase_realtime add table public.tracks;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'social_group_members') then
    alter publication supabase_realtime add table public.social_group_members;
  end if;
end $$;
