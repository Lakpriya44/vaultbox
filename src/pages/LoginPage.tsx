import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  Sparkles,
  Loader2,
  CheckCircle2,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

export const LoginPage: React.FC<{ onNavigateToRegister: () => void }> = ({
  onNavigateToRegister,
}) => {
  const { login, quickDemoLogin } = useAuth();
  const { success, error: toastError } = useToast();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;

    setIsLoading(true);
    try {
      await login(identifier, password);
      success('Welcome Back!', 'Vault session established. Master Key derived in browser memory.');
    } catch (err: any) {
      toastError('Login Failed', err.message || 'Invalid email/username or master password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (email: string) => {
    setLoadingDemo(email);
    try {
      await quickDemoLogin(email, 'Password123!#');
      success('Demo Account Ready', `Logged in as ${email}. Derived keys ready in RAM.`);
    } catch (err: any) {
      toastError('Demo Login Failed', err.message);
    } finally {
      setLoadingDemo(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-xl shadow-emerald-500/20 mb-2">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Vault<span className="text-emerald-500">Box</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Zero-knowledge encrypted cloud file vault. Plaintext never touches the server.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Email or Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="alice@vaultbox.io or alice"
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Master Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deriving PBKDF2 Master Key (310k iter)...</span>
                </>
              ) : (
                <>
                  <span>Sign In & Unlock Vault</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              1-Click Demo Accounts (Pre-configured)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('alice@vaultbox.io')}
                disabled={loadingDemo !== null}
                className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-left transition-colors text-xs disabled:opacity-50"
              >
                <div className="font-bold text-emerald-400">Alice (Owner)</div>
                <div className="text-[10px] text-slate-400">alice@vaultbox.io</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('bob@vaultbox.io')}
                disabled={loadingDemo !== null}
                className="p-2.5 rounded-xl border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-left transition-colors text-xs disabled:opacity-50"
              >
                <div className="font-bold text-teal-400">Bob (Recipient)</div>
                <div className="text-[10px] text-slate-400">bob@vaultbox.io</div>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center">
              Password for both demo accounts: <code className="text-emerald-400">Password123!#</code>
            </p>
          </div>
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-slate-400">
          Need a private vault?{' '}
          <button
            onClick={onNavigateToRegister}
            className="text-emerald-400 hover:text-emerald-300 font-bold underline transition-colors"
          >
            Create new encrypted vault
          </button>
        </p>
      </div>
    </div>
  );
};
