-- Supabase Row Level Security (RLS) Policies for Admin Dashboard

-- Enable RLS on the admins table (assuming we have one)
-- ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read all data
CREATE POLICY "Admins can view all data" ON public.some_table
  FOR SELECT
  USING ( auth.uid() IN (SELECT id FROM public.admins) );

-- Policy: Admins can update data
CREATE POLICY "Admins can update data" ON public.some_table
  FOR UPDATE
  USING ( auth.uid() IN (SELECT id FROM public.admins) );

-- (Replace 'some_table' with your actual table names)
