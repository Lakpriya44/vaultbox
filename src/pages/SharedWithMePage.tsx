import React, { useState, useEffect } from 'react';
import {
  Share2,
  Download,
  Eye,
  Lock,
  User,
  Calendar,
  ShieldCheck,
  Loader2,
  FileText,
  AlertTriangle,
  FileCode,
  Image as ImageIcon,
  FileArchive,
  File
} from 'lucide-react';
import { SharedFileItem, VaultFile } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { apiRequest, apiDownloadBlob } from '../api/client';
import {
  unwrapFileKeyWithRsa,
  decryptFilePayload,
} from '../crypto/webCrypto';
import { FilePreviewModal } from '../components/FilePreviewModal';

export const SharedWithMePage: React.FC = () => {
  const { rsaPrivateKey, user } = useAuth();
  const { success, error: toastError } = useToast();

  const [sharedItems, setSharedItems] = useState<SharedFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewItem, setPreviewItem] = useState<SharedFileItem | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadSharedFiles = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<{ sharedItems: SharedFileItem[] }>('/shares/shared-with-me');
      setSharedItems(data.sharedItems || []);
    } catch (err: any) {
      console.error('Failed to load shared files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSharedFiles();
  }, []);

  const handleDownloadDecryptedShared = async (item: SharedFileItem) => {
    if (!rsaPrivateKey) {
      toastError('RSA Key Locked', 'Please unlock your vault to unwrap shared keys.');
      return;
    }

    setDownloadingId(item.shareId);
    try {
      // 1. Download ciphertext blob
      const { blob, headers } = await apiDownloadBlob(`/files/${item.file.id}/download?mode=decrypted_client`);
      const ciphertextBuffer = await blob.arrayBuffer();

      const iv = headers.get('X-Vault-IV') || item.file.iv;
      const wrappedKey = item.wrappedKeyForRecipient;

      // 2. Unwrap AES-GCM 256-bit file key using recipient's RSA-OAEP private key
      const fileKey = await unwrapFileKeyWithRsa(wrappedKey, rsaPrivateKey);

      // 3. Decrypt payload with AES-GCM
      const plaintextBuffer = await decryptFilePayload(ciphertextBuffer, fileKey, iv);

      // 4. Trigger download
      const plainBlob = new Blob([plaintextBuffer], { type: item.file.mimeType });
      const url = URL.createObjectURL(plainBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.file.originalName || item.file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      success('Decrypted & Saved', `Unwrapped key using your RSA private key and saved "${item.file.name}".`);
    } catch (err: any) {
      console.error('Decryption error on shared file:', err);
      toastError('Decryption Failed', err.message || 'Could not unwrap key with your RSA private key.');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Share2 className="w-6 h-6 text-emerald-500" />
            Shared With Me
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Files shared with you via end-to-end RSA-OAEP key encapsulation
          </p>
        </div>

        <button
          onClick={loadSharedFiles}
          className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors self-start sm:self-auto"
        >
          Refresh Shared
        </button>
      </div>

      {/* Explainer card */}
      <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-emerald-900 dark:text-emerald-200">
            Asymmetric RSA-OAEP Cryptographic Sharing
          </p>
          <p className="text-[11px] leading-relaxed opacity-90">
            These files were encrypted by their owners with random 256-bit AES keys. Each file key was encapsulated with your registered RSA public key. When you download or preview, your browser locally unwraps the key using your private key in memory. The server never observes plaintext keys or files.
          </p>
        </div>
      </div>

      {/* Table / List */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
          <p className="text-xs">Fetching shared files and RSA key records...</p>
        </div>
      ) : sharedItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-4">
            <Share2 className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
            No Shared Files Yet
          </h3>
          <p className="text-xs text-slate-400">
            When another registered user shares an encrypted file with your email ({user?.email}), it will appear here.
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/90 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <tr>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Shared By</th>
                  <th className="py-3 px-4">Permission</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Shared On</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {sharedItems.map(item => (
                  <tr
                    key={item.shareId}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <File className="w-4 h-4 text-emerald-500" />
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {item.file.name}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-500 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> RSA Encapsulated Key
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.owner.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 capitalize">
                        {item.permission}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                      {formatSize(item.file.size)}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(item.sharedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewItem(item)}
                          className="p-1.5 text-slate-400 hover:text-cyan-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Preview in RAM"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {item.permission === 'download' && (
                          <button
                            onClick={() => handleDownloadDecryptedShared(item)}
                            disabled={downloadingId === item.shareId}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shadow-sm flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            {downloadingId === item.shareId ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            <span>Decrypt</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview Modal for shared file */}
      {previewItem && (
        <FilePreviewModal
          isOpen={true}
          file={previewItem.file}
          isShared={true}
          sharedWrappedKey={previewItem.wrappedKeyForRecipient}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
};
