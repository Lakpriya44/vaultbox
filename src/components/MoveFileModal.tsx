import React, { useState } from 'react';
import { X, FolderInput, Folder, Loader2 } from 'lucide-react';
import { VaultFile, Folder as FolderType } from '../types';
import { apiRequest } from '../api/client';
import { useToast } from './Toast';

interface MoveFileModalProps {
  isOpen: boolean;
  file: VaultFile | null;
  folders: FolderType[];
  onClose: () => void;
  onFileMoved: () => void;
}

export const MoveFileModal: React.FC<MoveFileModalProps> = ({
  isOpen,
  file,
  folders,
  onClose,
  onFileMoved,
}) => {
  const { success, error: toastError } = useToast();
  const [targetFolderId, setTargetFolderId] = useState<string | null>(file?.folderId || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !file) return null;

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiRequest(`/files/${file.id}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetFolderId }),
      });

      const folderName = targetFolderId ? folders.find(f => f.id === targetFolderId)?.name || 'Folder' : 'Root Vault';
      success('File Moved', `Moved "${file.name}" to "${folderName}".`);
      onFileMoved();
      onClose();
    } catch (err: any) {
      toastError('Move Failed', err.message || 'Failed to move file.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-800 dark:text-slate-200 transition-all">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
              <FolderInput className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Move File</h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{file.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleMove} className="mt-4 space-y-4">
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => setTargetFolderId(null)}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 border transition-colors ${
                targetFolderId === null
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Folder className="w-4 h-4 text-slate-400" />
              <span>Root Vault</span>
            </button>

            {folders.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTargetFolderId(f.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 border transition-colors ${
                  targetFolderId === f.id
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Folder className="w-4 h-4" style={{ color: f.color || '#3b82f6' }} />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-500/20 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Move Here'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
