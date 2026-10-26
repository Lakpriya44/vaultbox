import React, { useState } from 'react';
import { ShieldAlert, KeyRound, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

export const UnlockVaultModal: React.FC = () => {
  const { user, needsKeyUnlock, unlockVaultWithPassword, logout } = useAuth();
  const { error, success } = useToast();
  const [password, setPassword] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  if (!needsKeyUnlock || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsUnlocking(true);
    try {
      const ok = await unlockVaultWithPassword(password);
      if (ok) {
        success('Vault unlocked', 'Master Key derived (310,000 PBKDF2 iterations) and ready in volatile memory.');
      } else {
        error('Unlock failed', 'Incorrect master password. Unable to derive key.');
      }
    } catch (err: any) {
      error('Unlock error', err.message || 'Failed to derive master key.');
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Unlock Vault Session</h3>
            <p className="text-xs text-slate-400">Zero-knowledge memory key derivation</p>
          </div>
        </div>

        <div className="p-3.5 bg-slate-800/60 border border-slate-700/50 rounded-xl mb-5 text-xs text-slate-300 leading-relaxed">
          <p className="font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Client-Side Security Assurance
          </p>
          To maintain strict zero-knowledge security, your Master Key is never saved on disk or cookies. Enter your master password for <span className="font-medium text-white">{user.email}</span> to re-derive your key via PBKDF2 (SHA-256, 310k iterations).
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Master Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your master password"
                className="w-full bg-slate-950/70 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                autoFocus
              />
            </div>
            {user.email === 'alice@vaultbox.io' && (
              <p className="text-[11px] text-slate-400 mt-1">
                Demo hint: Alice's password is <code className="text-emerald-400">Password123!#</code>
              </p>
            )}
            {user.email === 'bob@vaultbox.io' && (
              <p className="text-[11px] text-slate-400 mt-1">
                Demo hint: Bob's password is <code className="text-emerald-400">Password123!#</code>
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={logout}
              className="flex-1 px-4 py-2.5 text-xs font-medium rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors"
            >
              Log Out
            </button>
            <button
              type="submit"
              disabled={isUnlocking}
              className="flex-1 px-4 py-2.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isUnlocking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deriving Key...
                </>
              ) : (
                'Unlock Vault'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
