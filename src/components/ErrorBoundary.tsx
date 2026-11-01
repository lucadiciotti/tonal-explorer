import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 p-8 text-center">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Qualcosa e andato storto</h1>
            <p className="text-slate-600 text-sm mb-4">
              L'app ha riscontrato un errore durante il caricamento.
            </p>
            <pre className="text-left text-xs bg-slate-100 rounded-lg p-4 overflow-auto text-red-600 mb-4">
              {this.state.error?.message ?? 'Errore sconosciuto'}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Ricarica
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
