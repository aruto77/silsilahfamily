'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../../hooks/use-user';
import { Sidebar } from '../../components/dashboard/Sidebar';
import { Topbar } from '../../components/dashboard/Topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
             <span className="material-symbols-outlined text-red-600 text-3xl">error_outline</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Akun Dihapus / Tidak Ditemukan</h2>
          <p className="text-slate-500 mb-6">Akun Anda telah dihapus oleh administrator atau profil Anda tidak ditemukan. Hubungi administrator jika ini adalah kesalahan.</p>
          <button 
            onClick={async () => {
              try {
                const { getSupabase } = await import('../../lib/supabase');
                await getSupabase().auth.signOut();
              } catch (e) {} finally {
                if (typeof window !== 'undefined') window.location.href = '/login';
              }
            }}
            className="px-6 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  // If user is pending or rejected, perhaps we show waiting-approval page.
  if (profile && profile.approval_status !== 'approved' && profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
             <span className="material-symbols-outlined text-amber-600 text-3xl">hourglass_empty</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Akun Pending</h2>
          <p className="text-slate-500 mb-6">Akun Anda sedang menunggu persetujuan dari administrator keluarga. Mohon hubungi admin untuk mempercepat proses persetujuan.</p>
          <button 
            onClick={async () => {
              try {
                const { getSupabase } = await import('../../lib/supabase');
                await getSupabase().auth.signOut();
              } catch (e) {
                console.error("Logout error", e);
              } finally {
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
            }}
            className="px-6 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
          >
            Keluar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen bg-slate-50 flex overflow-hidden font-sans text-slate-900">
      <Sidebar profile={profile} />
      <main className="flex-1 flex flex-col min-w-0">
        <Topbar profile={profile} />
        <div className="flex-1 overflow-auto bg-slate-50 relative">
          <div className="p-8 pb-24 max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
