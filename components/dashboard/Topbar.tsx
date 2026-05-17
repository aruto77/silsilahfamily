'use client';

import React from 'react';
import { Bell, LogOut } from 'lucide-react';
import { UserProfile } from '../../hooks/use-user';
import { getSupabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

interface TopbarProps {
  profile: UserProfile | null;
}

export function Topbar({ profile }: TopbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Logout error", e);
    } finally {
      // Force clear local storage keys for Supabase just in case lock is stolen
      if (typeof window !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
            localStorage.removeItem(key);
          }
        }
        window.location.href = '/login';
      }
    }
  };

  const getInitials = (email: string) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
      <div></div> {/* Placeholder for search bar */}
      
      <div className="flex items-center space-x-4 ml-auto">
        <button className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-full transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
        </button>
        
        <div className="h-8 w-px bg-slate-200 mx-2"></div>
        
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-700 leading-tight">{profile?.email?.split('@')[0] || 'User'}</p>
            <p className="text-[11px] font-medium text-slate-400 capitalize">{profile?.role || 'Member'}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
            <span className="text-indigo-700 font-bold text-sm tracking-wide">
              {getInitials(profile?.email || '')}
            </span>
          </div>
          <button 
            onClick={handleLogout}
            title="Keluar"
            className="w-8 h-8 ml-2 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
