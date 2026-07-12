import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

// Without this, any render-time exception (e.g. a Supabase-stored draft or
// config missing a field a newer build expects) unmounts the whole tree with
// no message -- the "blank white screen" bug. This at least surfaces the
// error and gives a way out instead of a silent dead end.
export default class ErrorBoundary extends React.Component<Props, State> {
  // This project has no @types/react installed, so React.Component's
  // inherited members don't typecheck reliably -- redeclare props explicitly
  // (see SettingsPanel.tsx for the same workaround pattern).
  props: Props;
  state: State = { error: null };

  constructor(props: Props) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Render crashed:', error, info.componentStack);
  }

  handleResetLocalData = () => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('aimms_'))
      .forEach((key) => localStorage.removeItem(key));
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 shadow-md p-8 space-y-4">
            <h1 className="text-lg font-display font-black text-slate-900">
              Algo salió mal
            </h1>
            <p className="text-sm text-slate-600">
              La aplicación encontró un error inesperado y no pudo continuar. Copia el mensaje de abajo si vas a reportarlo.
            </p>
            <pre className="text-xs bg-slate-900 text-rose-300 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-slate-100 text-slate-800 font-bold py-2.5 rounded-xl hover:bg-slate-200 transition cursor-pointer"
              >
                Recargar
              </button>
              <button
                onClick={this.handleResetLocalData}
                className="flex-1 bg-aimms-blue text-white font-bold py-2.5 rounded-xl hover:opacity-90 transition cursor-pointer"
              >
                Borrar datos locales y recargar
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
