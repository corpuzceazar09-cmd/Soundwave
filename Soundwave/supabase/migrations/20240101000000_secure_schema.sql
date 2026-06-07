-- Podcast Admin - Database Security & RBAC Schema
-- Run this in the Supabase SQL Editor

-- 1. Create custom types for Roles
CREATE TYPE public.app_role AS ENUM ('Admin', 'Editor', 'User');

-- 2. Create the Roles table to map auth users to their roles
CREATE TABLE public.user_roles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  role public.app_role NOT NULL DEFAULT 'User'::public.app_role,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Only Admins can read or update all roles
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (
    (SELECT role FROM public.user_roles WHERE id = auth.uid()) = 'Admin'
  );

-- Policy: Users can read their own role
CREATE POLICY "Users can read their own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = id);


-- 3. Example of a protected table: Podcasts
CREATE TABLE public.podcasts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.podcasts ENABLE ROW LEVEL SECURITY;

-- Policy: Only Admins can modify podcasts (Create, Update, Delete)
CREATE POLICY "Admins have full access to podcasts" ON public.podcasts
  FOR ALL USING (
    (SELECT role FROM public.user_roles WHERE id = auth.uid()) = 'Admin'
  );

-- Policy: Users/Editors can only read podcasts
CREATE POLICY "Users can view podcasts" ON public.podcasts
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );


-- 4. Initial Admin User Setup
-- It is recommended to create the first user via the Supabase Dashboard,
-- or sign up once and then manually change their role to 'Admin' in `user_roles`.
-- Then, DISABLE "Enable Signup" in the Supabase Dashboard (Authentication -> Providers -> Email).

-- If you already have a user in `auth.users`, run this to make them an Admin:
-- INSERT INTO public.user_roles (id, role)
-- VALUES ('<YOUR_USER_ID_HERE>', 'Admin');
