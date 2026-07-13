import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { Logo } from './Logo';

interface SessionGateProps {
  children: (session: Session) => React.ReactNode;
}

// Open-access entry point: everyone gets a Supabase anonymous session
// automatically (no login form) so the shared quotes/draft/pricing-config
// tables keep working under the same "to authenticated" RLS policies.
// Admin sign-in (for the Configuración tab) happens separately, later,
// via AdminLogin -- it simply replaces this anonymous session with a real
// one once the admin authenticates.
export default function SessionGate({ children }: SessionGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setSession(data.session);
        return;
      }
      const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
      if (cancelled) return;
      if (anonError) {
        setError(anonError.message);
        return;
      }
      setSession(anonData.session);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200/80 shadow-md p-8 space-y-4 text-center">
          <Logo className="h-10 w-auto mx-auto" />
          <p className="text-sm text-rose-600">
            Couldn't start a session: {error}
          </p>
          <p className="text-xs text-slate-400">
            (If this is a fresh Supabase project, anonymous sign-ins need to be enabled in Authentication → Settings.)
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-400 text-sm">Cargando...</p>
      </div>
    );
  }

  return <>{children(session)}</>;
}
