-- public.users has never actually had a foreign key to auth.users on this live
-- database, despite an early migration declaring one ("references auth.users(id)
-- on delete cascade"). That's why deleting a user in the Supabase dashboard left
-- their public.users profile (and therefore their app role/session) behind.
-- This adds the real constraint so deleting from auth.users always cleans up
-- public.users automatically, with no orphaned rows possible again.
ALTER TABLE public.users
  ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
