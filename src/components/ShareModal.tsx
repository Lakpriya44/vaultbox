import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  UserCheck,
  Shield,
  Loader2,
  Trash2,
  Lock,
  Mail,
  CheckCircle,
  Eye,
  Download
} from 'lucide-react';
import { VaultFile, ShareRecord } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { apiRequest } from '../api/client';
import {
  unwrapFileKeyWithMasterKey,
  importRsaPublicKey,
  wrapFileKeyWithRsa,
} from '../crypto/webCrypto';

interface ShareModalProps {
  isOpen: boolean;
  file: VaultFile | null;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, file, onClose }) => {
  const { masterKey, user } = useAuth();
  const { success, error: toastError } = useToast();

  const [availableUsers, setAvailableUsers] = useState<{ id: string; email: string; username: string; rsaPublicKey: string }[]>([]);
  const [selectedRecipientEmail, setSelectedRecipientEmail] = useState('');
  const [permission, setPermission] = useState<'download' | 'view'>('download');
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !file) return;

    const loadData = async () => {
      setIsLoadingShares(true);
      try {
        const [usersRes, sharesRes] = await Promise.all([
          apiRequest<{ users: any[] }>('/auth/users'),
          apiRequest<{ shares: ShareRecord[] }>(`/shares/file/${file.id}`),
        ]);
        setAvailableUsers(usersRes.users || []);
        setShares(sharesRes.shares || []);
        if (usersRes.users?.length > 0) {
          setSelectedRecipientEmail(usersRes.users[0].email);
        }
      } catch (err: any) {
        console.error('Failed to load sharing info:', err);
      } finally {
        setIsLoadingShares(false);
      }
    };

    loadData();
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterKey) {
      toastError('Vault Locked', 'Please unlock your vault before sharing files.');
      return;
    }

    if (!selectedRecipientEmail.trim()) {
      toastError('Missing Recipient', 'Please select or enter a recipient email.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Unwrap this file's raw 256-bit AES-GCM key using the owner's Master Key
      const rawFileKey = await unwrapFileKeyWithMasterKey(
        file.wrappedKey,
        file.wrappedKeyIv,
        masterKey
      );

      // 2. Fetch the recipient's RSA-OAEP Public Key
      let recipientPubKeySpki = '';
      const matchingUser = availableUsers.find(
        u => u.email.toLowerCase() === selectedRecipientEmail.toLowerCase()
      );

      if (matchingUser?.rsaPublicKey) {
        recipientPubKeySpki = matchingUser.rsaPublicKey;
      } else {
        const target = await apiRequest<{ user: { rsaPublicKey: string } }>(
          `/auth/public-key?email=${encodeURIComponent(selectedRecipientEmail)}`
        );
        recipientPubKeySpki = target.user.rsaPublicKey;
      }

      // 3. Import recipient's public key
      const recipientRsaPublicKey = await importRsaPublicKey(recipientPubKeySpki);

      // 4. Re-wrap the raw file key with the recipient's RSA public key
      const wrappedKeyForRecipient = await wrapFileKeyWithRsa(rawFileKey, recipientRsaPublicKey);

      // 5. Store share record in backend
      await apiRequest('/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: file.id,
          recipientEmail: selectedRecipientEmail,
          wrappedKeyForRecipient,
          permission,
        }),
      });

      success('File Shared Securely', `File key encapsulated with ${selectedRecipientEmail}'s RSA public key.`);

      // Refresh shares list
      const sharesRes = await apiRequest<{ shares: ShareRecord[] }>(`/shares/file/${file.id}`);
      setShares(sharesRes.shares || []);
    } catch (err: any) {
      console.error('Failed to share file:', err);
      toastError('Sharing Failed', err.message || 'Could not re-encrypt key for recipient.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      await apiRequest(`/shares/${shareId}`, { method: 'DELETE' });
      setShares(prev => prev.filter(s => s.id !== shareId));
      success('Access Revoked', 'Recipient can no longer access this file.');
    } catch (err: any) {
      toastError('Revoke Failed', err.message || 'Failed to revoke access.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-800 dark:text-slate-200 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Share Encrypted File
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                {file.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cryptographic Flow Explainer */}
        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
          <div className="font-semibold text-emerald-500 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> End-to-End RSA Key Wrapping
          </div>
          <p>
            Your browser unwraps the 256-bit AES file key with your Master Key, re-wraps it with the recipient’s RSA-OAEP public key, and delivers the ciphertext. The server never observes plaintext keys.
          </p>
        </div>

        {/* Share Form */}
        <form onSubmit={handleShare} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Select or Enter Recipient
            </label>
            {availableUsers.length > 0 ? (
              <div className="space-y-2">
                <select
                  value={selectedRecipientEmail}
                  onChange={e => setSelectedRecipientEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {availableUsers.map(u => (
                    <option key={u.id} value={u.email}>
                      {u.username} ({u.email})
                    </option>
                  ))}
                </select>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={selectedRecipientEmail}
                    onChange={e => setSelectedRecipientEmail(e.target.value)}
                    placeholder="Or type custom email address"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            ) : (
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={selectedRecipientEmail}
                  onChange={e => setSelectedRecipientEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Permission Level
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPermission('download')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                  permission === 'download'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 font-semibold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                View & Download
              </button>
              <button
                type="button"
                onClick={() => setPermission('view')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                  permission === 'view'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 font-semibold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                View Only
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Re-wrapping RSA Key...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Encrypt Key & Share
              </>
            )}
          </button>
        </form>

        {/* Active Shares List */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Existing Access Permissions ({shares.length})
          </h4>

          {isLoadingShares ? (
            <div className="py-4 text-center">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-500" />
            </div>
          ) : shares.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              This file has not been shared with anyone yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {shares.map(s => (
                <div
                  key={s.id}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {s.recipientEmail}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Permission: <span className="text-emerald-500 capitalize">{s.permission}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevokeShare(s.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Revoke access"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
