-- Keep the PostgREST relationship name used by the app stable.
-- Older versions of the schema may have created this FK as habits_user_id_fkey
-- before the habits column was renamed to owner_id.

alter table public.habits
  drop constraint if exists habits_user_id_fkey;

alter table public.habits
  drop constraint if exists habits_owner_id_fkey;

alter table public.habits
  add constraint habits_owner_id_fkey
  foreign key (owner_id) references public.profiles(id) on delete cascade;

notify pgrst, 'reload schema';
