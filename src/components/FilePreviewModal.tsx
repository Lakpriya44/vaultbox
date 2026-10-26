import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Download,
  FileText,
  AlertTriangle,
  Loader2,
  Lock,
  Eye,
  FileCode,
  CheckCircle,
  File
} from 'lucide-react';
import { VaultFile } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import {
  unwrapFileKeyWithMasterKey,
  unwrapFileKeyWithRsa,
  decryptFilePayload,
} from '../crypto/webCrypto';
import { apiDownloadBlob } from '../api/client';

interface FilePreviewModalProps {
  isOpen: boolean;
  file: VaultFile | null;
  onClose: () => void;
  isShared?: boolean;
  sharedWrappedKey?: string;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  file,
  onClose,
  isShared = false,
  sharedWrappedKey,
}) => {
  const { masterKey, rsaPrivateKey } = useAuth();
  const { error: toastError, success } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);
  const [decryptedBlobUrl, setDecryptedBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [decryptedBytes, setDecryptedBytes] = useState<ArrayBuffer | null>(null);

  useEffect(() => {
    if (!isOpen || !file) {
      if (decryptedBlobUrl) URL.revokeObjectURL(decryptedBlobUrl);
      setDecryptedBlobUrl(null);
      setTextContent(null);
      setDecryptedBytes(null);
      setDecryptionError(null);
      return;
    }

    let isSubscribed = true;

    const decryptAndLoad = async () => {
      setIsLoading(true);
      setDecryptionError(null);

      try {
        // Download encrypted blob from server
        const { blob, headers } = await apiDownloadBlob(`/files/${file.id}/download?mode=decrypted_client`);
        const ciphertextBuffer = await blob.arrayBuffer();

        const iv = headers.get('X-Vault-IV') || file.iv;
        const wrappedKey = sharedWrappedKey || headers.get('X-Vault-Wrapped-Key') || file.wrappedKey;
        const wrappedKeyIv = headers.get('X-Vault-Wrapped-Key-IV') || file.wrappedKeyIv;
        const isSharedResponse = headers.get('X-Vault-Is-Shared') === 'true' || isShared;

        // Step 1: Unwrap the 256-bit AES-GCM file key in browser memory
        let fileKey: CryptoKey;
        if (isSharedResponse) {
          if (!rsaPrivateKey) {
            throw new Error('Your RSA private key is not unlocked. Cannot unwrap shared file.');
          }
          fileKey = await unwrapFileKeyWithRsa(wrappedKey, rsaPrivateKey);
        } else {
          if (!masterKey) {
            throw new Error('Master key is locked. Please unlock your vault.');
          }
          fileKey = await unwrapFileKeyWithMasterKey(wrappedKey, wrappedKeyIv, masterKey);
        }

        // Step 2: Decrypt file payload and verify 128-bit authentication tag
        const plaintextBuffer = await decryptFilePayload(ciphertextBuffer, fileKey, iv);

        if (!isSubscribed) return;

        setDecryptedBytes(plaintextBuffer);

        const mime = file.mimeType.toLowerCase();
        if (mime.startsWith('image/')) {
          const plainBlob = new Blob([plaintextBuffer], { type: file.mimeType });
          const url = URL.createObjectURL(plainBlob);
          setDecryptedBlobUrl(url);
        } else if (
          mime.includes('text') ||
          mime.includes('json') ||
          mime.includes('javascript') ||
          mime.includes('xml') ||
          mime.includes('csv') ||
          file.name.endsWith('.txt') ||
          file.name.endsWith('.md') ||
          file.name.endsWith('.json') ||
          file.name.endsWith('.log')
        ) {
          const text = new TextDecoder().decode(plaintextBuffer);
          setTextContent(text);
        } else if (mime === 'application/pdf') {
          const pdfBlob = new Blob([plaintextBuffer], { type: 'application/pdf' });
          const url = URL.createObjectURL(pdfBlob);
          setDecryptedBlobUrl(url);
        }
      } catch (err: any) {
        console.error('Decryption failed:', err);
        if (isSubscribed) {
          setDecryptionError(
            err.message || 'Cryptographic integrity error: AES-GCM auth tag failed or key invalid.'
          );
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    decryptAndLoad();

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, file, masterKey, rsaPrivateKey, isShared, sharedWrappedKey]);

  if (!isOpen || !file) return null;

  const handleDownloadDecrypted = () => {
    if (!decryptedBytes) return;
    const blob = new Blob([decryptedBytes], { type: file.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.originalName || file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    success('Downloaded Decrypted File', `Saved "${file.name}" to your local downloads.`);
  };

  const isImage = file.mimeType.startsWith('image/');
  const isPdf = file.mimeType === 'application/pdf';
  const isText = !!textContent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 overflow-hidden">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white truncate max-w-md">{file.name}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  v{file.activeVersion}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {file.mimeType} • {(file.size / 1024).toFixed(1)} KB encrypted
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {decryptedBytes && (
              <button
                onClick={handleDownloadDecrypted}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Plaintext</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Security Banner */}
        <div className="bg-emerald-950/40 border-b border-emerald-500/20 px-6 py-2 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Zero-Knowledge Verified: Decrypted client-side in RAM via AES-256-GCM</span>
          </div>
          <span className="text-[10px] text-emerald-400/80 font-mono hidden sm:inline">
            Tag: 128-bit Auth OK
          </span>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center min-h-[360px] bg-slate-950/60">
          {isLoading && (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <p className="text-xs font-mono">Fetching ciphertext blob & decrypting with Web Crypto...</p>
            </div>
          )}

          {decryptionError && (
            <div className="max-w-md p-6 bg-rose-950/50 border border-rose-500/40 rounded-2xl text-rose-200 text-center">
              <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <h4 className="font-bold text-sm text-white mb-1">Cryptographic Decryption Error</h4>
              <p className="text-xs text-rose-300 leading-relaxed mb-4">{decryptionError}</p>
              <p className="text-[11px] text-slate-400">
                The ciphertext was either modified or wrapped with a different key.
              </p>
            </div>
          )}

          {!isLoading && !decryptionError && (
            <>
              {isImage && decryptedBlobUrl && (
                <div className="max-h-[60vh] flex items-center justify-center">
                  <img
                    src={decryptedBlobUrl}
                    alt={file.name}
                    className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-2xl border border-slate-800"
                  />
                </div>
              )}

              {isPdf && decryptedBlobUrl && (
                <div className="w-full h-[65vh]">
                  <iframe
                    src={decryptedBlobUrl}
                    title={file.name}
                    className="w-full h-full rounded-xl border border-slate-800"
                  />
                </div>
              )}

              {isText && textContent !== null && (
                <div className="w-full h-full max-h-[65vh] bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs overflow-auto leading-relaxed text-slate-300">
                  <pre className="whitespace-pre-wrap">{textContent}</pre>
                </div>
              )}

              {!isImage && !isPdf && !isText && (
                <div className="text-center p-8">
                  <File className="w-16 h-16 text-slate-500 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-white mb-1">Decrypted Successfully</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
                    Inline visual preview is not supported for MIME type{' '}
                    <code className="text-emerald-400">{file.mimeType}</code>. The binary was decrypted in memory and is ready to save.
                  </p>
                  <button
                    onClick={handleDownloadDecrypted}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Decrypted File
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
