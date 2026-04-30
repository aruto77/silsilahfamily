-- PostgreSQL Database Schema for Family Tree / Genealogy Application
-- This script is ready to be executed in the Supabase SQL Editor.

-- Enable UUID extension if not already enabled (Supabase usually has this by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. ENUM TYPES
-- ==========================================
CREATE TYPE role_enum AS ENUM ('admin', 'member');
CREATE TYPE approval_status_enum AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other');
CREATE TYPE marriage_status_enum AS ENUM ('active', 'divorced', 'widowed', 'annulled');

-- ==========================================
-- 2. TABLES
-- ==========================================

-- 2.1 Users Table
-- Extends the Supabase auth.users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    role role_enum DEFAULT 'member',
    approval_status approval_status_enum DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.2 Family Members Table
-- Uses self-referencing logic for vertical hierarchy
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    gender gender_enum NOT NULL,
    birth_date DATE,
    death_date DATE,
    bio TEXT,
    photo_url TEXT,
    -- Self-referencing Foreign Keys with SET NULL constraint
    father_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
    mother_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
    is_adopted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.3 Marriages Table
-- Handles horizontal relationships
CREATE TABLE IF NOT EXISTS public.marriages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Foreign keys to family_members with CASCADE deletion
    husband_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
    wife_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
    marriage_date DATE,
    divorce_date DATE,
    status marriage_status_enum DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Prevent duplicate active marriages between the same two people
    CONSTRAINT unique_marriage_couple UNIQUE (husband_id, wife_id)
);

-- 2.4 Change Requests Table
-- Stores proposed changes before they are merged
CREATE TABLE IF NOT EXISTS public.change_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    -- target_id is a generic UUID because it might refer to family_members OR marriages.
    -- We don't enforce a hard FK constraint here to allow flexibility across different tables.
    target_id UUID NOT NULL, 
    target_table VARCHAR(50) NOT NULL, -- e.g., 'family_members', 'marriages'
    old_data JSONB,
    new_data JSONB NOT NULL,
    status approval_status_enum DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.5 Audit Logs Table
-- Strict audit trail
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    target_id UUID NOT NULL,
    action_type VARCHAR(100) NOT NULL, -- e.g., 'APPROVE_CHANGE', 'DELETE_MEMBER'
    details JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 3. INDEXING
-- ==========================================

-- Indexes for fast tree traversal (Vertical Hierarchy)
CREATE INDEX IF NOT EXISTS idx_family_members_father_id ON public.family_members USING btree (father_id);
CREATE INDEX IF NOT EXISTS idx_family_members_mother_id ON public.family_members USING btree (mother_id);

-- Indexes for fast marriage lookups (Horizontal Connections)
CREATE INDEX IF NOT EXISTS idx_marriages_husband_id ON public.marriages USING btree (husband_id);
CREATE INDEX IF NOT EXISTS idx_marriages_wife_id ON public.marriages USING btree (wife_id);

-- GIN Index for fast searching inside JSONB change request payloads
CREATE INDEX IF NOT EXISTS idx_change_requests_new_data ON public.change_requests USING gin (new_data);

-- ==========================================
-- 4. RLS (Row Level Security) Setup (Optional/Recommended)
-- ==========================================
-- Good security practice for Supabase. 
-- You might want to customize these policies based on your exact app requirements.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marriages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view family members and marriages
CREATE POLICY "Anyone can view family members" ON public.family_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view marriages" ON public.marriages FOR SELECT TO authenticated USING (true);

-- Allow admins full access (Requires a function to check role)
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin policies (Admins have full write/edit access)
CREATE POLICY "Admins have full access to family members" ON public.family_members FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Admins have full access to marriages" ON public.marriages FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Admins have full access to change requests" ON public.change_requests FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Admins have full access to audit logs" ON public.audit_logs FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Admins have full access to users" ON public.users FOR ALL TO authenticated USING (is_admin());

-- Function to completely delete a user's Auth account and public profile (because of CASCADE)
CREATE OR REPLACE FUNCTION delete_auth_user(target_user_id UUID)
RETURNS void AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Only admins can delete users.';
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
