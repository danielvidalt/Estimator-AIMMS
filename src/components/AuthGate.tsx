import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { Logo } from './Logo';

interface AuthGateProps {
  children: (session: Session) => React.ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formInfo, setFormInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormInfo(null);
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setFormInfo('Cuenta creada. Revisa tu correo para confirmar la cuenta antes de iniciar sesión.');
          setMode('signin');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Ocurrió un error. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-400 text-sm">Cargando...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200/80 shadow-md p-8 space-y-6">
          <div className="flex justify-center">
            <Logo className="h-10 w-auto" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-display font-black text-slate-900">
              {mode === 'signin' ? 'Iniciar sesión' : 'Crear cuenta'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">Project Estimator — acceso de equipo</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-aimms-blue/40"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contraseña</label>
              <input
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-aimms-blue/40"
              />
            </div>
            {formError && <p className="text-sm text-rose-600">{formError}</p>}
            {formInfo && <p className="text-sm text-emerald-600">{formInfo}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-aimms-blue text-white font-bold py-2.5 rounded-xl hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Procesando...' : mode === 'signin' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>
          <button
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setFormError(null);
              setFormInfo(null);
            }}
            className="w-full text-center text-sm text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            {mode === 'signin' ? '¿No tienes cuenta? Crear una' : '¿Ya tienes cuenta? Iniciar sesión'}
          </button>
        </div>
      </div>
    );
  }

  return <>{children(session)}</>;
}
