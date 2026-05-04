'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '../../../lib/supabase';

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    
    const handleSuccess = (session: any) => {
      if (window.opener && window.name === 'oauth_popup') {
        window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', session }, '*');
        window.close();
      } else {
        window.location.href = '/dashboard';
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        handleSuccess(session);
      }
    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setError(error.message);
      }
      if (session) {
        handleSuccess(session);
      }
    }).catch(err => {
      setError(err.message);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest text-on-surface">
      <div className="text-center p-8 bg-surface-bright/95 backdrop-blur-xl rounded-xl shadow-lg border border-surface-variant">
        {error ? (
          <div>
            <h2 className="text-error font-h3 mb-2">Login Gagal</h2>
            <p>{error}</p>
          </div>
        ) : (
          <div>
             <h2 className="font-h3 text-primary mb-2">Memproses Login...</h2>
             <p className="text-on-surface-variant">Jendela ini akan tertutup otomatis.</p>
          </div>
        )}
      </div>
    </div>
  );
}
