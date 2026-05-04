'use client';

import { useEffect, useRef } from 'react';
import { getSupabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export function AutoLogout() {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const TIMEOUT_MS = 60 * 60 * 1000; // 1 hr

  const logout = async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    } finally {
      // Clear localStorage auth state just in case
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key);
        }
      }
      router.push('/login?message=Berhasil logout otomatis karena tidak ada aktivitas.');
    }
  };

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      logout();
    }, TIMEOUT_MS);
  };

  useEffect(() => {
    // Check if user is logged in first
    const checkSessionAndSetup = async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return; // Only apply auto-logout if there is a session
      
      const events = ['pointermove', 'keydown', 'scroll', 'click'];
      
      const handleActivity = () => {
        resetTimer();
      };

      events.forEach(event => {
        window.addEventListener(event, handleActivity, { passive: true });
      });

      resetTimer(); // Initialize timer

      return () => {
        events.forEach(event => {
          window.removeEventListener(event, handleActivity);
        });
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    };

    let cleanup: (() => void) | undefined;
    checkSessionAndSetup().then(fn => { cleanup = fn; });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return null;
}
