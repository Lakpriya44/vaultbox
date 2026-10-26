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
  Lock
} from 'lucide-react';
import { VaultFile, Folder } from '../types';

interface FileListProps {
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

export const FileList: React.FC<FileListProps> = ({
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
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-emerald-500" />;
    if (mimeType === 'application/pdf') return <FileText className="w-4 h-4 text-rose-500" />;
    if (mimeType.includes('zip') || name.endsWith('.zip')) {
      return <FileArchive className="w-4 h-4 text-amber-500" />;
    }
    if (mimeType.includes('javascript') || mimeType.includes('json') || name.endsWith('.ts')) {
      return <FileCode className="w-4 h-4 text-cyan-500" />;
    }
    return <FileIcon className="w-4 h-4 text-slate-400" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/90 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            <tr>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Encryption</th>
              <th className="py-3 px-4">Version</th>
              <th className="py-3 px-4">Size</th>
              <th className="py-3 px-4">Modified</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {/* Folders */}
            {folders.map(f => (
              <tr
                key={f.id}
                onClick={() => onOpenFolder(f.id)}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <FolderIcon className="w-4 h-4" style={{ color: f.color || '#3b82f6' }} />
                    <span className="font-bold text-slate-900 dark:text-white">{f.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-400">—</td>
                <td className="py-3 px-4 text-slate-400">—</td>
                <td className="py-3 px-4 text-slate-400">—</td>
                <td className="py-3 px-4 text-slate-400">
                  {new Date(f.createdAt).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onRenameFolder(f)}
                      className="p-1 text-slate-400 hover:text-emerald-500 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteFolder(f)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {/* Files */}
            {files.map(file => (
              <tr
                key={file.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
              >
                <td className="py-3 px-4">
                  <div
                    onClick={() => onPreview(file)}
                    className="flex items-center gap-2.5 cursor-pointer max-w-xs sm:max-w-md truncate"
                  >
                    {getFileIcon(file.mimeType, file.name)}
                    <span className="font-semibold text-slate-900 dark:text-white truncate group-hover:text-emerald-500 transition-colors">
                      {file.name}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10">
                    <Lock className="w-3 h-3" /> AES-256-GCM
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                  <button
                    onClick={() => onVersionHistory(file)}
                    className="hover:text-amber-500 underline decoration-dotted"
                  >
                    v{file.activeVersion}
                  </button>
                </td>
                <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                  {formatSize(file.size)}
                </td>
                <td className="py-3 px-4 text-slate-400">
                  {new Date(file.updatedAt || file.createdAt).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onPreview(file)}
                      className="p-1.5 text-slate-400 hover:text-cyan-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Preview in RAM"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDownloadDecrypted(file)}
                      className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Download & Decrypt"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onShare(file)}
                      className="p-1.5 text-slate-400 hover:text-purple-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Share File"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    {/* More dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === file.id ? null : file.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {activeMenuId === file.id && (
                        <div
                          onMouseLeave={() => setActiveMenuId(null)}
                          className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-1.5 z-40 text-xs text-left"
                        >
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onDownloadEncryptedBlob(file);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Download Raw .enc
                          </button>
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onVersionHistory(file);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                          >
                            <History className="w-3.5 h-3.5" />
                            Version History
                          </button>
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onDownloadHistory(file);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download Audit
                          </button>
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onInspectCrypto(file);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Inspect Crypto
                          </button>
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onMoveFile(file);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                          >
                            <FolderInput className="w-3.5 h-3.5" />
                            Move
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
