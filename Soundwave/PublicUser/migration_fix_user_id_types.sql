-- Fix: user_follows.user_id and ratings.user_id are type UUID but need to store
-- Firebase UIDs (text) alongside Supabase Auth UUIDs.
--
-- user_roles.id is already type text and contains both Firebase UIDs and Supabase UUIDs.
-- The FK constraints reference user_roles(id). We need to change the column type
-- to text to match.
--
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor).

-- 1. Drop FK constraints (they reference user_roles.id which is already text)
ALTER TABLE public.user_follows DROP CONSTRAINT IF EXISTS user_follows_user_id_fkey;
ALTER TABLE public.ratings DROP CONSTRAINT IF EXISTS ratings_user_id_fkey;

-- 2. Change column types from uuid to text so Firebase UIDs can be stored
ALTER TABLE public.user_follows ALTER COLUMN user_id TYPE text;
ALTER TABLE public.ratings ALTER COLUMN user_id TYPE text;

-- 3. Re-add FK constraints (user_roles.id is already text)
ALTER TABLE public.user_follows ADD CONSTRAINT user_follows_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.user_roles(id) ON DELETE CASCADE;
ALTER TABLE public.ratings ADD CONSTRAINT ratings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.user_roles(id) ON DELETE CASCADE;
