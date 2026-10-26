import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  User as UserIcon,
  KeyRound,
  ArrowRight,
  Check,
  X,
  Loader2,
  Cpu,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { evaluatePasswordStrength } from '../crypto/webCrypto';

export const RegisterPage: React.FC<{ onNavigateToLogin: () => void }> = ({
  onNavigateToLogin,
}) => {
  const { register } = useAuth();
  const { success, error: toastError } = useToast();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cryptoStage, setCryptoStage] = useState<string>('');

  const strength = evaluatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !username || !password) return;

    if (password !== confirmPassword) {
      toastError('Mismatch', 'Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      toastError('Weak Password', 'Master password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      setCryptoStage('Generating 128-bit random salt...');
      await new Promise(r => setTimeout(r, 200));

      setCryptoStage('Deriving AES-256 Master Key via PBKDF2 (310,000 iterations)...');
      await new Promise(r => setTimeout(r, 300));

      setCryptoStage('Generating 2048-bit RSA-OAEP key pair for file sharing...');
      await new Promise(r => setTimeout(r, 300));

      setCryptoStage('Encrypting RSA private key with Master Key...');
      await register(email, username, password);

      success('Vault Created!', 'Zero-knowledge keys initialized in browser memory.');
    } catch (err: any) {
      toastError('Registration Error', err.message || 'Could not register account.');
    } finally {
      setIsLoading(false);
      setCryptoStage('');
    }
  };

  const getStrengthBarColor = () => {
    switch (strength.score) {
      case 0:
      case 1:
        return 'bg-rose-500';
      case 2:
        return 'bg-amber-500';
      case 3:
        return 'bg-cyan-500';
      case 4:
        return 'bg-emerald-500';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-xl shadow-emerald-500/20 mb-2">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Create Encrypted Vault
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Zero-knowledge cryptography ensures only you hold the keys to decrypt your files.
          </p>
        </div>

        {/* Register Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Username
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="cyber_alice"
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Master Password (Key Derivation Base)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Strong unique passphrase"
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Password Strength Meter */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">
                      Strength: <span className="font-semibold text-white">{strength.label}</span>
                    </span>
                    <span className="font-mono text-emerald-400">
                      ~{strength.entropyBits} bits entropy
                    </span>
                  </div>

                  {/* 4-bar indicator */}
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    {[0, 1, 2, 3].map(step => (
                      <div
                        key={step}
                        className={`rounded-full transition-colors ${
                          step <= strength.score ? getStrengthBarColor() : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Requirements checklist */}
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 pt-1">
                    <div className="flex items-center gap-1">
                      {strength.hasMinLength ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <X className="w-3 h-3 text-slate-600" />
                      )}
                      <span>8+ characters</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {strength.hasUppercase && strength.hasLowercase ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <X className="w-3 h-3 text-slate-600" />
                      )}
                      <span>Upper & lower case</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {strength.hasNumber ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <X className="w-3 h-3 text-slate-600" />
                      )}
                      <span>Contains number</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {strength.hasSpecial ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <X className="w-3 h-3 text-slate-600" />
                      )}
                      <span>Special symbol</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Confirm Master Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat master password"
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Cryptographic Generation Status Card if Loading */}
            {isLoading && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-[11px] text-emerald-300 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin shrink-0 text-emerald-400" />
                <span className="font-mono">{cryptoStage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Web Crypto Keys...</span>
                </>
              ) : (
                <>
                  <span>Create Vault & Generate Keys</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-slate-400">
          Already have an encrypted vault?{' '}
          <button
            onClick={onNavigateToLogin}
            className="text-emerald-400 hover:text-emerald-300 font-bold underline transition-colors"
          >
            Sign in here
          </button>
        </p>
      </div>
    </div>
  );
};
