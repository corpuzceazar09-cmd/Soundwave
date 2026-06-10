-- Fix RLS infinite recursion on user_roles
--
-- Problem: Policies on podcasts/episodes/feeds/ingestion_jobs/user_roles
-- all query public.user_roles to check admin/editor status. Each subquery
-- triggers RLS on user_roles, whose own policy does another self-query → ∞.
--
-- Fix: SECURITY DEFINER functions bypass RLS when checking roles,
-- breaking the recursion chain.

-- ── Helper: is_admin() ────────────────────────────────────────────
-- Runs with privileges of the function creator (bypasses RLS on user_roles).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'Admin'::public.app_role
  );
$$;

-- ── Helper: is_editor_or_admin() ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_editor_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE id = auth.uid() AND role IN ('Editor'::public.app_role, 'Admin'::public.app_role)
  );
$$;

-- ── Fix user_roles policies ───────────────────────────────────────

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.is_admin());

-- No change needed for "Users can read their own role" – it uses auth.uid() = id,
-- which does NOT query user_roles (no recursion risk).

-- ── Fix podcasts policies ─────────────────────────────────────────

DROP POLICY IF EXISTS "Admin full access podcasts" ON public.podcasts;
CREATE POLICY "Admin full access podcasts" ON public.podcasts
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Editor select podcasts" ON public.podcasts;
CREATE POLICY "Editor select podcasts" ON public.podcasts
  FOR SELECT USING (public.is_editor_or_admin());

DROP POLICY IF EXISTS "Editor update podcasts" ON public.podcasts;
CREATE POLICY "Editor update podcasts" ON public.podcasts
  FOR UPDATE USING (public.is_editor_or_admin())
  WITH CHECK (public.is_editor_or_admin());

-- "Public read published podcasts" (qual: true) – no change needed.

-- ── Fix episodes policies ─────────────────────────────────────────

DROP POLICY IF EXISTS "Admin full access episodes" ON public.episodes;
CREATE POLICY "Admin full access episodes" ON public.episodes
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Editor select episodes" ON public.episodes;
CREATE POLICY "Editor select episodes" ON public.episodes
  FOR SELECT USING (public.is_editor_or_admin());

DROP POLICY IF EXISTS "Editor update episodes" ON public.episodes;
CREATE POLICY "Editor update episodes" ON public.episodes
  FOR UPDATE USING (public.is_editor_or_admin())
  WITH CHECK (public.is_editor_or_admin());

-- "Public read published episodes" (status = 'published') – no change needed.

-- ── Fix feeds policies ────────────────────────────────────────────

DROP POLICY IF EXISTS "Admin full access feeds" ON public.feeds;
CREATE POLICY "Admin full access feeds" ON public.feeds
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- "Public read active feeds" (status = 'active') – no change needed.

-- ── Fix ingestion_jobs policies ───────────────────────────────────

DROP POLICY IF EXISTS "Admin full access ingestion_jobs" ON public.ingestion_jobs;
CREATE POLICY "Admin full access ingestion_jobs" ON public.ingestion_jobs
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Editor select ingestion_jobs" ON public.ingestion_jobs;
CREATE POLICY "Editor select ingestion_jobs" ON public.ingestion_jobs
  FOR SELECT USING (public.is_editor_or_admin());
