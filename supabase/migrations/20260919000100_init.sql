create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  username text not null unique check (char_length(username) between 3 and 32),
  display_name text not null default 'New user' check (char_length(display_name) between 1 and 60),
  created_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  constraint friendship_not_self check (requester_id <> addressee_id),
  constraint friendship_pair_unique unique (requester_id, addressee_id)
);

create unique index if not exists friendships_unordered_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text check (description is null or char_length(description) <= 300),
  daily_goal integer not null default 1 check (daily_goal between 1 and 10),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  completed_on date not null,
  proof text not null check (char_length(proof) between 1 and 500),
  created_at timestamptz not null default now(),
  constraint completion_unique_per_day unique (habit_id, completed_on)
);

create index if not exists habits_owner_active_idx on public.habits(owner_id, active);
create index if not exists completions_habit_date_idx on public.habit_completions(habit_id, completed_on desc);
create index if not exists friendships_addressee_status_idx on public.friendships(addressee_id, status);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, display_name)
  values (
    new.id,
    new.email,
    lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update set
    email = excluded.email,
    username = excluded.username,
    display_name = excluded.display_name;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles for select to authenticated using (true);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "friendships_select_involved" on public.friendships;
create policy "friendships_select_involved" on public.friendships for select to authenticated
using ((select auth.uid()) in (requester_id, addressee_id));

drop policy if exists "friendships_insert_requester" on public.friendships;
create policy "friendships_insert_requester" on public.friendships for insert to authenticated
with check ((select auth.uid()) = requester_id and status = 'pending');

drop policy if exists "friendships_update_addressee" on public.friendships;
create policy "friendships_update_addressee" on public.friendships for update to authenticated
using ((select auth.uid()) = addressee_id and status = 'pending')
with check ((select auth.uid()) = addressee_id and status in ('accepted', 'declined'));

drop policy if exists "habits_select_owner_or_friend" on public.habits;
create policy "habits_select_owner_or_friend" on public.habits for select to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = (select auth.uid()) and f.addressee_id = habits.owner_id)
        or (f.addressee_id = (select auth.uid()) and f.requester_id = habits.owner_id)
      )
  )
);

drop policy if exists "habits_insert_self" on public.habits;
create policy "habits_insert_self" on public.habits for insert to authenticated
with check ((select auth.uid()) = owner_id);

drop policy if exists "habits_update_self" on public.habits;
create policy "habits_update_self" on public.habits for update to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

drop policy if exists "habits_delete_self" on public.habits;
create policy "habits_delete_self" on public.habits for delete to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "completions_select_self_or_friend" on public.habit_completions;
create policy "completions_select_self_or_friend" on public.habit_completions for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = (select auth.uid()) and f.addressee_id = habit_completions.user_id)
        or (f.addressee_id = (select auth.uid()) and f.requester_id = habit_completions.user_id)
      )
  )
);

drop policy if exists "completions_insert_self" on public.habit_completions;
create policy "completions_insert_self" on public.habit_completions for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.habits h where h.id = habit_id and h.owner_id = (select auth.uid()))
);

drop policy if exists "completions_update_self" on public.habit_completions;
create policy "completions_update_self" on public.habit_completions for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.habits h where h.id = habit_id and h.owner_id = (select auth.uid()))
);

drop policy if exists "completions_delete_self" on public.habit_completions;
create policy "completions_delete_self" on public.habit_completions for delete to authenticated
using ((select auth.uid()) = user_id);
