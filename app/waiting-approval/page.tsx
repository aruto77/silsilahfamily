'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabase } from '../../lib/supabase';
import { Hourglass, RefreshCw, Lock } from 'lucide-react';

export default function WaitingApproval() {
  const router = useRouter();

  useEffect(() => {
    const checkStatus = async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (!error && data) {
        if (data.role === 'admin' || data.approval_status === 'approved') {
          router.push('/dashboard');
        }
      }
    };
    checkStatus();
  }, [router]);

  return (
    <div className="bg-background min-h-screen flex flex-col font-body-md text-body-md text-on-background antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Minimal Header */}
      <header className="flex justify-between items-center w-full px-8 py-6 border-b border-surface-variant bg-surface-container-lowest">
        <div className="font-h3 text-h3 text-primary tracking-tight">Silsilah</div>
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
          className="font-label-caps text-label-caps text-secondary hover:text-primary transition-colors duration-200"
        >
          Keluar
        </button>
      </header>
      
      {/* Main Content Canvas */}
      <main className="flex-grow flex items-center justify-center p-6 sm:p-8 relative overflow-hidden">
        {/* Abstract Background Decoration */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-fixed rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary-fixed rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
        </div>
        
        {/* Centered Card */}
        <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-sm max-w-[480px] w-full p-10 flex flex-col items-center text-center z-10 relative">
          {/* Illustration / Icon */}
          <div className="w-24 h-24 rounded-full bg-primary-fixed flex items-center justify-center mb-8 shadow-sm border border-outline-variant/20">
            <Hourglass className="w-12 h-12 text-on-primary-fixed" strokeWidth={1.5} />
          </div>
          
          {/* Typography Copy */}
          <h1 className="font-h2 text-h2 text-on-surface mb-4">Akun Anda Sedang Ditinjau oleh Admin</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mb-10 leading-relaxed px-4">
            Untuk menjaga privasi dan keamanan silsilah keluarga, akses hanya diberikan kepada anggota yang terverifikasi. Admin kami akan segera meninjau permintaan Anda.
          </p>
          
          {/* Actions */}
          <div className="w-full flex flex-col gap-4">
            <button className="w-full bg-primary text-on-primary font-label-caps text-label-caps py-4 rounded-lg hover:bg-primary-container transition-colors duration-200 flex items-center justify-center gap-2 shadow-sm" onClick={() => window.location.reload()}>
              <RefreshCw className="w-5 h-5" />
              Segarkan Status
            </button>
            <button className="w-full font-body-sm text-body-sm text-secondary hover:text-primary transition-colors py-3">
              Hubungi Bantuan
            </button>
          </div>
          
          {/* Contextual Note */}
          <div className="mt-8 pt-6 border-t border-surface-variant w-full flex items-center justify-center gap-2 text-on-surface-variant opacity-80">
            <Lock className="w-4 h-4" />
            <span className="font-body-sm text-body-sm">Akses eksklusif dan aman</span>
          </div>
        </div>
      </main>
    </div>
  );
}
