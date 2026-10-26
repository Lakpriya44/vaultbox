import React, { useState, useRef } from 'react';
import {
  Upload,
  X,
  File as FileIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Key,
  Folder as FolderIcon
} from 'lucide-react';
import { Folder } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import {
  generateFileKey,
  wrapFileKeyWithMasterKey,
  encryptFilePayload
} from '../crypto/webCrypto';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  currentFolderId: string | null;
  onUploadSuccess: () => void;
}

type EncryptionStage =
  | 'queued'
  | 'generating_keys'
  | 'encrypting'
  | 'wrapping_key'
  | 'uploading'
  | 'done'
  | 'error';

interface FileUploadTask {
  id: string;
  file: File;
  stage: EncryptionStage;
  progressPercent: number;
  errorMsg?: string;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  folders,
  currentFolderId,
  onUploadSuccess,
}) => {
  const { masterKey, user } = useAuth();
  const { success, error: toastError } = useToast();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId);
  const [tasks, setTasks] = useState<FileUploadTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newTasks: FileUploadTask[] = Array.from(files).map(f => ({
      id: `task_${Date.now()}_${Math.random()}`,
      file: f,
      stage: 'queued',
      progressPercent: 0,
    }));
    setTasks(prev => [...prev, ...newTasks]);
  };

  const removeTask = (taskId: string) => {
    if (isProcessing) return;
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const startUploadAll = async () => {
    if (!masterKey) {
      toastError('Master Key Missing', 'Please unlock your vault before encrypting files.');
      return;
    }

    if (tasks.length === 0) return;

    setIsProcessing(true);
    let successCount = 0;

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      if (task.stage === 'done') continue;

      try {
        // Stage 1: Generating 256-bit AES-GCM Key & 12-byte IV
        setTasks(prev =>
          prev.map(t => (t.id === task.id ? { ...t, stage: 'generating_keys', progressPercent: 20 } : t))
        );
        const fileKey = await generateFileKey();

        // Stage 2: Encrypting in browser memory
        setTasks(prev =>
          prev.map(t => (t.id === task.id ? { ...t, stage: 'encrypting', progressPercent: 45 } : t))
        );
        const fileBuffer = await task.file.arrayBuffer();
        const { ciphertext, ivBase64 } = await encryptFilePayload(fileBuffer, fileKey);

        // Stage 3: Wrapping file key with user's Master Key
        setTasks(prev =>
          prev.map(t => (t.id === task.id ? { ...t, stage: 'wrapping_key', progressPercent: 70 } : t))
        );
        const { wrappedKeyBase64, wrappedKeyIvBase64 } = await wrapFileKeyWithMasterKey(
          fileKey,
          masterKey
        );

        // Stage 4: Uploading encrypted ciphertext blob to server
        setTasks(prev =>
          prev.map(t => (t.id === task.id ? { ...t, stage: 'uploading', progressPercent: 85 } : t))
        );

        const formData = new FormData();
        const encryptedBlob = new Blob([ciphertext], { type: 'application/octet-stream' });
        formData.append('file', encryptedBlob, `${task.file.name}.enc`);
        formData.append('name', task.file.name);
        formData.append('originalName', task.file.name);
        formData.append('mimeType', task.file.type || 'application/octet-stream');
        formData.append('originalSize', task.file.size.toString());
        formData.append('folderId', selectedFolderId || 'null');
        formData.append('iv', ivBase64);
        formData.append('wrappedKey', wrappedKeyBase64);
        formData.append('wrappedKeyIv', wrappedKeyIvBase64);

        const token = localStorage.getItem('vaultbox_token');
        const res = await fetch('/api/files/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Upload error HTTP ${res.status}`);
        }

        // Stage 5: Complete!
        setTasks(prev =>
          prev.map(t => (t.id === task.id ? { ...t, stage: 'done', progressPercent: 100 } : t))
        );
        successCount++;
      } catch (err: any) {
        console.error('File encryption / upload error:', err);
        setTasks(prev =>
          prev.map(t => (t.id === task.id ? { ...t, stage: 'error', errorMsg: err.message } : t))
        );
      }
    }

    setIsProcessing(false);
    if (successCount > 0) {
      success('Upload Complete', `Successfully encrypted and uploaded ${successCount} file(s).`);
      onUploadSuccess();
    }
  };

  const getStageLabel = (stage: EncryptionStage) => {
    switch (stage) {
      case 'queued':
        return 'Queued for encryption';
      case 'generating_keys':
        return 'Generating 256-bit AES Key & 12-byte IV...';
      case 'encrypting':
        return 'Encrypting file in browser (AES-GCM)...';
      case 'wrapping_key':
        return 'Wrapping file key with Master Key...';
      case 'uploading':
        return 'Uploading ciphertext blob to server...';
      case 'done':
        return 'Encrypted & Saved';
      case 'error':
        return 'Encryption or Upload Failed';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Upload & Encrypt Files
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                End-to-end encrypted in your browser before transfer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Folder Destination Selector */}
        <div className="mt-4 flex items-center gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            <FolderIcon className="w-3.5 h-3.5" /> Destination Folder:
          </span>
          <select
            value={selectedFolderId || 'null'}
            onChange={e => setSelectedFolderId(e.target.value === 'null' ? null : e.target.value)}
            disabled={isProcessing}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="null">Root Vault</option>
            {folders.map(f => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Drag and drop zone */}
        <div
          onDragOver={e => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => {
            e.preventDefault();
            setIsDragging(false);
            handleFilesAdded(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-4 border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-emerald-500 bg-emerald-500/5'
              : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={e => handleFilesAdded(e.target.files)}
          />
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Drag and drop files here, or <span className="text-emerald-500 underline">browse</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Files are chunked, AES-256 encrypted, and auth-tagged client-side
          </p>
        </div>

        {/* File Queue List */}
        {tasks.length > 0 && (
          <div className="mt-4 max-h-56 overflow-y-auto space-y-2 pr-1">
            {tasks.map(task => (
              <div
                key={task.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate max-w-[280px]">
                    <FileIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {task.file.name}
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      ({(task.file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {task.stage === 'done' && (
                      <span className="text-emerald-500 flex items-center gap-1 font-semibold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                      </span>
                    )}
                    {task.stage === 'error' && (
                      <span className="text-rose-500 flex items-center gap-1 font-semibold text-[11px]">
                        <AlertCircle className="w-3.5 h-3.5" /> Error
                      </span>
                    )}
                    {task.stage !== 'done' && task.stage !== 'error' && task.stage !== 'queued' && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                    )}

                    {!isProcessing && task.stage === 'queued' && (
                      <button
                        onClick={() => removeTask(task.id)}
                        className="text-slate-400 hover:text-rose-500 p-0.5 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar and stage description */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        task.stage === 'error'
                          ? 'bg-rose-500'
                          : task.stage === 'done'
                          ? 'bg-emerald-500'
                          : 'bg-emerald-500 animate-pulse'
                      }`}
                      style={{ width: `${task.progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{getStageLabel(task.stage)}</span>
                    {task.errorMsg && <span className="text-rose-400">{task.errorMsg}</span>}
                    <span>{task.progressPercent}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Actions */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {tasks.length} file(s) selected
          </span>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {tasks.some(t => t.stage === 'done') ? 'Done' : 'Cancel'}
            </button>

            <button
              onClick={startUploadAll}
              disabled={isProcessing || tasks.length === 0 || tasks.every(t => t.stage === 'done')}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Encrypting & Uploading...
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  Encrypt & Upload
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
