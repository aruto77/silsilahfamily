import { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'member';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  approval_status: ApprovalStatus;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();

    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          // Fetch profile details
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (!error && data) {
            setProfile(data as UserProfile);
          } else if (error && error.code === 'PGRST116') {
            // Profile is created by Supabase Database Trigger. If it's not here yet, we wait for next change.
            console.warn('Wait for trigger sync...', session.user.id);
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (!error && data) {
            setProfile(data as UserProfile);
          } else if (error && error.code === 'PGRST116') {
            // Profile is created by Supabase Database Trigger. If it's not here yet, we wait for next change.
            console.warn('Wait for trigger sync...', session.user.id);
          }
        } catch (err) {
          console.error("Error on auth state change profile fetch:", err);
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { user, profile, loading };
}
