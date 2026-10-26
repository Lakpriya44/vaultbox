import React, { useState } from 'react';
import {
  File as FileIcon,
  Folder as FolderIcon,
  MoreVertical,
  Download,
  Eye,
  Share2,
  History,
  FolderInput,
  Edit2,
  Trash2,
  ShieldCheck,
  FileCode,
  FileText,
  Image as ImageIcon,
  FileArchive,
  Lock,
  Layers
} from 'lucide-react';
import { VaultFile, Folder } from '../types';

interface FileGridProps {
  files: VaultFile[];
  folders: Folder[];
  onOpenFolder: (folderId: string) => void;
  onPreview: (file: VaultFile) => void;
  onDownloadDecrypted: (file: VaultFile) => void;
  onDownloadEncryptedBlob: (file: VaultFile) => void;
  onShare: (file: VaultFile) => void;
  onVersionHistory: (file: VaultFile) => void;
  onDownloadHistory: (file: VaultFile) => void;
  onInspectCrypto: (file: VaultFile) => void;
  onRenameFile: (file: VaultFile) => void;
  onMoveFile: (file: VaultFile) => void;
  onDeleteFile: (file: VaultFile) => void;
  onRenameFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
}

export const FileGrid: React.FC<FileGridProps> = ({
  files,
  folders,
  onOpenFolder,
  onPreview,
  onDownloadDecrypted,
  onDownloadEncryptedBlob,
  onShare,
  onVersionHistory,
  onDownloadHistory,
  onInspectCrypto,
  onRenameFile,
  onMoveFile,
  onDeleteFile,
  onRenameFolder,
  onDeleteFolder,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const getFileIcon = (mimeType: string, name: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-8 h-8 text-emerald-500" />;
    if (mimeType === 'application/pdf') return <FileText className="w-8 h-8 text-rose-500" />;
    if (
      mimeType.includes('zip') ||
      mimeType.includes('tar') ||
      mimeType.includes('compressed') ||
      name.endsWith('.zip')
    ) {
      return <FileArchive className="w-8 h-8 text-amber-500" />;
    }
    if (
      mimeType.includes('javascript') ||
      mimeType.includes('json') ||
      mimeType.includes('html') ||
      name.endsWith('.ts') ||
      name.endsWith('.js')
    ) {
      return <FileCode className="w-8 h-8 text-cyan-500" />;
    }
    return <FileIcon className="w-8 h-8 text-slate-400" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
      {/* Folders */}
      {folders.map(folder => (
        <div
          key={folder.id}
          className="group relative p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-emerald-500/50 hover:shadow-lg dark:hover:shadow-slate-950/50 transition-all flex flex-col justify-between"
        >
          <div
            onClick={() => onOpenFolder(folder.id)}
            className="cursor-pointer flex items-center gap-2.5 mb-2"
          >
            <div
              className="p-2 rounded-xl"
              style={{ backgroundColor: `${folder.color || '#3b82f6'}20` }}
            >
              <FolderIcon className="w-5 h-5" style={{ color: folder.color || '#3b82f6' }} />
            </div>
            <div className="truncate flex-1">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate block">
                {folder.name}
              </span>
              <span className="text-[10px] text-slate-400">Folder</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <span>{new Date(folder.createdAt).toLocaleDateString()}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onRenameFolder(folder)}
                className="p-1 hover:text-emerald-500 rounded"
                title="Rename folder"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => onDeleteFolder(folder)}
                className="p-1 hover:text-rose-500 rounded"
                title="Delete folder"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Files */}
      {files.map(file => (
        <div
          key={file.id}
          className="group relative p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-emerald-500/50 hover:shadow-lg dark:hover:shadow-slate-950/50 transition-all flex flex-col justify-between"
        >
          {/* File Header & Icon */}
          <div className="flex items-start justify-between">
            <div
              onClick={() => onPreview(file)}
              className="cursor-pointer p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 group-hover:bg-emerald-500/10 transition-colors"
            >
              {getFileIcon(file.mimeType, file.name)}
            </div>

            {/* Menu trigger */}
            <div className="relative">
              <button
                onClick={e => {
                  e.stopPropagation();
                  setActiveMenuId(activeMenuId === file.id ? null : file.id);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Dropdown Menu */}
              {activeMenuId === file.id && (
                <div
                  onMouseLeave={() => setActiveMenuId(null)}
                  className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-1.5 z-40 text-xs text-slate-700 dark:text-slate-200"
                >
                  <button
                    onClick={() => {
                      setActiveMenuId(null);
                      onPreview(file);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Eye className="w-3.5 h-3.5 text-cyan-500" />
                    Preview in RAM
                  </button>

                  <button
                    onClick={() => {
                      setActiveMenuId(null);
                      onDownloadDecrypted(file);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download & Decrypt
                  </button>

                  <button
                    onClick={() => {
                      setActiveMenuId(null);
                      onDownloadEncryptedBlob(file);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Download Raw .enc
                  </button>

                  <button
                    onClick={() => {
                      setActiveMenuId(null);
                      onShare(file);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Share2 className="w-3.5 h-3.5 text-purple-500" />
                    Share (RSA Wrap)
                  </button>

                  <button
                    onClick={() => {
                      setActiveMenuId(null);
                      onVersionHistory(file);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <History className="w-3.5 h-3.5 text-amber-500" />
                    Version History (v{file.activeVersion})
                  </button>

                  <button
                    onClick={() => {
                      setActiveMenuId(null);
                      onDownloadHistory(file);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-500" />
                    Download Logs
                  </button>

                  <button
                    onClick={() => {
                      setActiveMenuId(null);
                      onInspectCrypto(file);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Inspect Crypto
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                  <button
                    onClick={() => {
                      setActiveMenuId(null);
                      onMoveFile(file);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <FolderInput className="w-3.5 h-3.5" />
                    Move to Folder
                  </button>

                  <button
                    onClick={() => {
                      setActiveMenuId(null);
                      onRenameFile(file);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Rename
                  </button>

                  <button
                    onClick={() => {
                      setActiveMenuId(null);
                      onDeleteFile(file);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* File Name & Info */}
          <div
            onClick={() => onPreview(file)}
            className="cursor-pointer my-2.5"
          >
            <span
              className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate block group-hover:text-emerald-500 transition-colors"
              title={file.name}
            >
              {file.name}
            </span>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
              <span>{formatSize(file.size)}</span>
              <span>•</span>
              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded">
                v{file.activeVersion}
              </span>
            </div>
          </div>

          {/* Security tag footer */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
            <span className="text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1 font-semibold">
              <Lock className="w-3 h-3" /> AES-256
            </span>
            <button
              onClick={() => onDownloadDecrypted(file)}
              className="p-1 hover:text-emerald-500 text-slate-400 rounded transition-colors"
              title="Download & Decrypt"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
