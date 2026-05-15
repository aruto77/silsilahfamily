'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabase } from '../../lib/supabase';
import { Mail, Lock, Eye, EyeOff, Clock } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleResize = () => {
      setIsPortraitMobile(window.innerWidth < 768 && window.innerHeight > window.innerWidth);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
       window.removeEventListener('resize', handleResize);
       window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dashboard');
      }
    };
    checkSession();
  }, [router]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        if (event.data.session) {
           const supabase = getSupabase();
           await supabase.auth.setSession({
             access_token: event.data.session.access_token,
             refresh_token: event.data.session.refresh_token,
           });
        }
        window.location.href = '/dashboard';
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else if (data.user) {
        // Redirect to dashboard on success
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = getSupabase();
      const redirectUrl = `${window.location.origin}/auth/callback`;

      // Open popup synchronously to prevent browser popup blockers from blocking it after async logic
      let popup: Window | null = null;
      // We check if we might be in an iframe like AI Studio to decide on popup vs full redirect
      const isIframe = window !== window.top;
      
      if (isIframe) {
        popup = window.open('about:blank', 'oauth_popup', 'width=500,height=600');
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: isIframe // If it's an iframe, we skip redirect and use popup. Else, redirect normally.
        }
      });
      
      if (error) {
        if (popup) popup.close();
        throw error;
      }
      
      if (isIframe && data?.url && popup) {
        popup.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message || 'Gagal login menggunakan Google.');
    } finally {
      // Don't set loading to false if we are not in an iframe and are redirecting
      const isIframe = window !== window.top;
      if (isIframe) setLoading(false);
    }
  };

  return (
    <>
      {isPortraitMobile && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6 text-center">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-slate-200">
            <span className="material-symbols-outlined text-indigo-600 text-5xl mb-4 animate-bounce">screen_rotation</span>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Putar Perangkat Anda</h2>
            <p className="text-slate-600 text-sm">
              Untuk pengalaman terbaik dalam melihat silsilah keluarga, mohon putar smartphone Anda ke mode lanskap (horizontal).
            </p>
          </div>
        </div>
      )}
      <div className="min-h-screen flex items-center justify-center p-4 antialiased text-on-surface bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuAncgm94O1p2xoPcICXe__cT3zbu2YqcaYRfVqipzAutALp2_QK9DrqKSh9TE2wr-Ya2H6qlMFR_Z9QM_0K2B2mroxOYzthxWfyw9AID7RJe1SA60e6FjvClIsHDEEWrBmQ2ubuJRss8RwOhqp-shGF-Xd9or9aW-ndtIYmHvfVXbF75-iZHKIyX6zPpPLZczpW-8GR3QTXAcvSEQXCMxhc6qOXpnsIkuELNu6AeOWulznqFUUWHjMSe2Tn6ked9bfnXecU0zP0mP0')] bg-cover bg-center bg-no-repeat bg-fixed">
      <main className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-h1 text-h1 text-primary tracking-tight">Kinship</h1>
          <p className="font-body-md text-body-md text-secondary mt-2">Connecting generations, preserving legacy.</p>
        </div>
        
        <div className="bg-surface-bright/95 backdrop-blur-xl rounded-xl shadow-lg border border-surface-variant p-8 w-full transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary-fixed to-primary-container"></div>
          
          <div className="mb-6">
            <h2 className="font-h2 text-h2 text-primary">Selamat Datang</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Masuk untuk mengakses silsilah keluarga Anda.</p>
          </div>
          
          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase tracking-wider" htmlFor="email">Alamat Email</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary font-body-md text-body-md text-on-surface transition-colors" 
                  id="email" 
                  name="email" 
                  placeholder="anda@contoh.com" 
                  required
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider" htmlFor="password">Kata Sandi</label>
                <Link className="font-body-sm text-body-sm text-primary hover:text-surface-tint transition-colors" href="/forgot-password">Lupa?</Link>
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  className="w-full pl-10 pr-10 py-2 bg-surface-container-lowest border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary font-body-md text-body-md text-on-surface transition-colors" 
                  id="password" 
                  name="password" 
                  placeholder="••••••••" 
                  required 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {error && <div className="text-error font-body-sm">{error}</div>}

            <div className="pt-2">
              <button disabled={loading} type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded bg-primary text-on-primary font-body-md text-body-md font-medium hover:bg-surface-tint focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
                {loading ? 'Masuk...' : 'Masuk dengan Email'}
              </button>
            </div>
          </form>

          <div className="mt-6 flex items-center justify-center space-x-2">
            <span className="h-px bg-outline-variant w-full"></span>
            <span className="font-body-sm text-outline-variant px-2">ATAU</span>
            <span className="h-px bg-outline-variant w-full"></span>
          </div>

          <div className="mt-6">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center py-3 px-4 border border-outline-variant rounded bg-surface-container-lowest text-on-surface font-body-md text-body-md font-medium hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Masuk dengan Google
            </button>
          </div>
          
          <div className="mt-8 pt-6 border-t border-surface-variant text-center">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Belum punya akun? 
              <Link className="font-body-md text-body-md text-primary font-medium hover:underline ml-1" href="/register">Daftar Akun Baru</Link>
            </p>
            <div className="mt-4 inline-flex items-center justify-center px-4 py-2 bg-surface-container-low rounded-full">
              <Clock className="w-4 h-4 text-slate-400 mr-2" />
              <Link className="font-body-sm text-body-sm text-secondary hover:text-primary transition-colors" href="/waiting-approval">Cek Status Persetujuan</Link>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <p className="font-label-caps text-label-caps text-surface-tint uppercase tracking-wider">A Private Family Platform</p>
        </div>
      </main>
    </div>
    </>
  );
}
