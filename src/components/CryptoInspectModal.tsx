import React from 'react';
import {
  X,
  ShieldCheck,
  Key,
  Lock,
  Cpu,
  Layers,
  CheckCircle2,
  FileKey,
  Fingerprint
} from 'lucide-react';
import { VaultFile } from '../types';
import { useAuth } from '../context/AuthContext';

interface CryptoInspectModalProps {
  isOpen: boolean;
  file: VaultFile | null;
  onClose: () => void;
}

export const CryptoInspectModal: React.FC<CryptoInspectModalProps> = ({
  isOpen,
  file,
  onClose,
}) => {
  const { user, masterKey } = useAuth();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 transition-all font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Cryptographic Inspection
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                  Zero-Knowledge Proof
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Auditing client-side Web Crypto primitives and key wrappers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
          {/* Section 1: PBKDF2 Master Derivation */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Key className="w-4 h-4" /> 1. Master Key Derivation (PBKDF2)
              </span>
              <span className="text-[10px] font-mono text-slate-400">NIST SP 800-132</span>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Algorithm</span>
                <span className="text-slate-200">PBKDF2 / HMAC-SHA-256</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Iterations</span>
                <span className="text-emerald-400 font-semibold">310,000 passes</span>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] truncate">
              <span className="text-slate-500 block text-[10px]">Unique User Salt (16 bytes Base64)</span>
              <span className="text-slate-300 select-all">{user?.salt || 'Not initialized'}</span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Derived AES-256 Master Key is held strictly in volatile RAM ({masterKey ? 'Active' : 'Locked'}).
              </span>
            </div>
          </div>

          {/* Section 2: File Encryption (if file is provided) */}
          {file ? (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <FileKey className="w-4 h-4" /> 2. Selected File: {file.name}
                </span>
                <span className="text-[10px] font-mono text-slate-400">AES-GCM (256-bit)</span>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Cipher / Mode</span>
                  <span className="text-slate-200">AES-GCM (256-bit key)</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Auth Tag Length</span>
                  <span className="text-emerald-400">128-bit GHASH Tag</span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px]">
                <span className="text-slate-500 block text-[10px]">Unique Initialization Vector (IV - 12 bytes Base64)</span>
                <span className="text-cyan-300 break-all select-all">{file.iv}</span>
              </div>

              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px]">
                <span className="text-slate-500 block text-[10px]">Master-Wrapped AES Key (Ciphertext in DB)</span>
                <span className="text-slate-300 break-all select-all">{file.wrappedKey}</span>
              </div>

              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px]">
                <span className="text-slate-500 block text-[10px]">Key Wrap IV (12 bytes Base64)</span>
                <span className="text-slate-300 break-all select-all">{file.wrappedKeyIv}</span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-slate-400">
              <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                <FileKey className="w-4 h-4" /> 2. Symmetric Cipher Architecture
              </span>
              <p className="text-[11px] leading-relaxed">
                Every file receives a fresh, cryptographically random 256-bit AES-GCM file key and a unique 12-byte IV generated with <code className="text-emerald-400 font-mono">crypto.getRandomValues</code>. File contents are encrypted and tagged with a 128-bit authentication tag before departing the browser.
              </p>
            </div>
          )}

          {/* Section 3: Asymmetric Sharing (RSA-OAEP) */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-400 flex items-center gap-1.5">
                <Fingerprint className="w-4 h-4" /> 3. Asymmetric Key Exchange (RSA-OAEP)
              </span>
              <span className="text-[10px] font-mono text-slate-400">2048-bit SHA-256</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              When sharing a file, the owner's browser fetches the recipient's RSA public key and wraps the file key using RSA-OAEP. The recipient then unwraps the file key with their private key, which was decrypted locally via their own Master Key.
            </p>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[10px] truncate">
              <span className="text-slate-500 block text-[9px]">Your RSA-OAEP Public Key (SPKI)</span>
              <span className="text-purple-300 select-all">{user?.rsaPublicKey || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
