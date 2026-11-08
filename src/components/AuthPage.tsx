import { useState } from 'react';
import { Music, Mail, Lock, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type AuthMode = 'login' | 'register';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(null);
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim() || !password.trim()) {
      setError('Inserisci email e password.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setError('La password deve avere almeno 6 caratteri.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Le password non corrispondono.');
        return;
      }
    }

    setLoading(true);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        setError(translateError(error));
      }
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        setError(translateError(error));
      } else {
        setSuccess('Account creato! Ora puoi accedere.');
        switchMode('login');
        setEmail(email);
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Music className="w-10 h-10 text-slate-800 dark:text-slate-100" />
            <h1 className="text-5xl font-bold text-slate-800 dark:text-slate-100">Tonal Explorer</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-lg">Music Training Assistant</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-4 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                mode === 'login'
                  ? 'text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border-b-2 border-slate-800 dark:border-sky-500'
                  : 'text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Accedi
            </button>
            <button
              onClick={() => switchMode('register')}
              className={`flex-1 py-4 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                mode === 'register'
                  ? 'text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border-b-2 border-slate-800 dark:border-sky-500'
                  : 'text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Registrati
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400">
                {success}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="la-tua@email.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-slate-800 dark:focus:border-sky-500 focus:outline-none text-sm transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Minimo 6 caratteri' : 'La tua password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-slate-800 dark:focus:border-sky-500 focus:outline-none text-sm transition-colors"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  Conferma Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ripeti la password"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-slate-800 dark:focus:border-sky-500 focus:outline-none text-sm transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-800 dark:bg-sky-600 hover:bg-slate-900 dark:hover:bg-sky-500 disabled:bg-slate-400 dark:disabled:bg-slate-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Accedi' : 'Crea Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
          I tuoi dati di allenamento saranno salvati in modo sicuro.
        </p>
      </div>
    </div>
  );
}

function translateError(error: string): string {
  if (error.includes('Invalid login credentials')) {
    return 'Email o password non corretti.';
  }
  if (error.includes('User already registered')) {
    return 'Questa email e\' gia\' registrata. Prova ad accedere.';
  }
  if (error.includes('Password should be at least')) {
    return 'La password deve avere almeno 6 caratteri.';
  }
  if (error.includes('Unable to validate email')) {
    return 'Indirizzo email non valido.';
  }
  return error;
}
