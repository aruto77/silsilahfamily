-- ==========================================
-- FIX RLS POLICY FOR USERS TABLE
-- ==========================================
-- This solves the issue where admin user's profile cannot be read upon login,
-- making them look like a regular 'Member' because RLS blocked the read.

CREATE POLICY "Users can view own profile" ON public.users FOR SELECT TO authenticated USING (id = auth.uid());

-- ==========================================
-- ADD TRIGGER FOR NEW USER REGISTRATION
-- ==========================================
-- Automatically creates a profile in public.users when a new user signs up

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role, approval_status)
  VALUES (new.id, new.email, 'member', 'pending');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists to replace it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- DATA DUMP UNTUK SILSILAH KELUARGA
-- ==========================================
-- Note: Replace 'admin-uuid-here' with the actual UUID of an admin user if you want
-- to assign an explicit requester_id for change requests later, but for family_members
-- we just insert raw data directly as admin.

-- 1. Bersihkan data lama (HATI-HATI JIKA SUDAH ADA DATA PENTING)
-- DELETE FROM public.family_members;
-- DELETE FROM public.marriages;

-- 2. Insert Kakek & Nenek (Generasi 1)
INSERT INTO public.family_members (id, first_name, last_name, gender, birth_date, is_adopted)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Budi', 'Santoso', 'male', '1940-05-12', false),
  ('22222222-2222-2222-2222-222222222222', 'Siti', 'Aminah', 'female', '1945-08-17', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.marriages (husband_id, wife_id, marriage_date, status)
VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '1965-10-10', 'active')
ON CONFLICT DO NOTHING;

-- 3. Insert Anak-anak (Generasi 2)
INSERT INTO public.family_members (id, first_name, last_name, gender, birth_date, father_id, mother_id)
VALUES 
  ('33333333-3333-3333-3333-333333333333', 'Agus', 'Santoso', 'male', '1968-02-20', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'),
  ('44444444-4444-4444-4444-444444444444', 'Dewi', 'Santoso', 'female', '1970-11-05', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- Pasangan dari Generasi 2
INSERT INTO public.family_members (id, first_name, last_name, gender, birth_date)
VALUES 
  ('55555555-5555-5555-5555-555555555555', 'Rina', 'Wati', 'female', '1972-04-15'),
  ('66666666-6666-6666-6666-666666666666', 'Joko', 'Widodo', 'male', '1968-09-09')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.marriages (husband_id, wife_id, marriage_date, status)
VALUES 
  ('33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', '1995-12-12', 'active'),
  ('66666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444', '1997-03-03', 'active')
ON CONFLICT DO NOTHING;

-- 4. Insert Cucu (Generasi 3)
INSERT INTO public.family_members (id, first_name, last_name, gender, birth_date, father_id, mother_id)
VALUES 
  (uuid_generate_v4(), 'Cakra', 'Santoso', 'male', '1998-05-10', '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555'),
  (uuid_generate_v4(), 'Bintang', 'Santoso', 'male', '2001-08-21', '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555'),
  (uuid_generate_v4(), 'Putri', 'Widodo', 'female', '2000-12-01', '66666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444')
ON CONFLICT DO NOTHING;
