import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  RotateCcw,
  Download,
  Loader2,
  CheckCircle2,
  FileCode,
  Calendar,
  Layers
} from 'lucide-react';
import { VaultFile, FileVersion } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { apiRequest, apiDownloadBlob } from '../api/client';
import {
  unwrapFileKeyWithMasterKey,
  decryptFilePayload,
} from '../crypto/webCrypto';

interface VersionHistoryModalProps {
  isOpen: boolean;
  file: VaultFile | null;
  onClose: () => void;
  onVersionRestored: () => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  file,
  onClose,
  onVersionRestored,
}) => {
  const { masterKey } = useAuth();
  const { success, error: toastError } = useToast();

  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [activeVersionNumber, setActiveVersionNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingVer, setDownloadingVer] = useState<number | null>(null);
  const [restoringVer, setRestoringVer] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen || !file) return;

    const loadVersions = async () => {
      setIsLoading(true);
      try {
        const data = await apiRequest<{ versions: FileVersion[]; activeVersion: number }>(
          `/files/${file.id}/versions`
        );
        setVersions(data.versions || []);
        setActiveVersionNumber(data.activeVersion || 1);
      } catch (err: any) {
        console.error('Failed to load version history:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadVersions();
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  const handleDownloadAndDecryptVersion = async (v: FileVersion) => {
    if (!masterKey) {
      toastError('Vault Locked', 'Please unlock your vault before decrypting file versions.');
      return;
    }

    setDownloadingVer(v.versionNumber);
    try {
      const { blob, headers } = await apiDownloadBlob(
        `/files/${file.id}/download?version=${v.versionNumber}&mode=decrypted_client`
      );
      const ciphertextBuffer = await blob.arrayBuffer();

      const iv = headers.get('X-Vault-IV') || v.iv;
      const wrappedKey = headers.get('X-Vault-Wrapped-Key') || v.wrappedKey;
      const wrappedKeyIv = headers.get('X-Vault-Wrapped-Key-IV') || v.wrappedKeyIv;

      const fileKey = await unwrapFileKeyWithMasterKey(wrappedKey, wrappedKeyIv, masterKey);
      const plaintextBuffer = await decryptFilePayload(ciphertextBuffer, fileKey, iv);

      const plainBlob = new Blob([plaintextBuffer], { type: file.mimeType });
      const url = URL.createObjectURL(plainBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `v${v.versionNumber}_${file.originalName || file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      success('Version Decrypted & Downloaded', `Downloaded version v${v.versionNumber} of "${file.name}".`);
    } catch (err: any) {
      toastError('Download Failed', err.message || 'Could not decrypt historical version.');
    } finally {
      setDownloadingVer(null);
    }
  };

  const handleRestoreVersion = async (versionNumber: number) => {
    setRestoringVer(versionNumber);
    try {
      await apiRequest(`/files/${file.id}/restore-version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionNumber }),
      });
      setActiveVersionNumber(versionNumber);
      success('Version Restored', `Active file pointer reverted to v${versionNumber}.`);
      onVersionRestored();
    } catch (err: any) {
      toastError('Restore Failed', err.message || 'Failed to restore historical version.');
    } finally {
      setRestoringVer(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-800 dark:text-slate-200 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Version History
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

        {/* Versions List */}
        <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="py-8 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-500 mb-2" />
              <p className="text-xs">Loading immutable version snapshots...</p>
            </div>
          ) : versions.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">
              No version history available for this file.
            </p>
          ) : (
            versions.map(v => {
              const isActive = v.versionNumber === activeVersionNumber;
              return (
                <div
                  key={v.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isActive
                      ? 'border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-500/10'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isActive
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        v{v.versionNumber}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Version {v.versionNumber}
                          </span>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                          <span>{(v.size / 1024).toFixed(1)} KB encrypted</span>
                          <span>•</span>
                          <span>{new Date(v.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDownloadAndDecryptVersion(v)}
                        disabled={downloadingVer === v.versionNumber}
                        className="p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-500 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        title="Download and decrypt this version"
                      >
                        {downloadingVer === v.versionNumber ? (
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </button>

                      {!isActive && (
                        <button
                          onClick={() => handleRestoreVersion(v.versionNumber)}
                          disabled={restoringVer === v.versionNumber}
                          className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1 shadow-sm transition-colors"
                          title="Restore as active version"
                        >
                          {restoringVer === v.versionNumber ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          <span>Restore</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {v.changeNote && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 pl-10 italic">
                      "{v.changeNote}"
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
