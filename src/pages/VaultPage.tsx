import React, { useState, useMemo } from 'react';
import {
  Search,
  Grid,
  List,
  Upload,
  FolderPlus,
  ArrowUpDown,
  Filter,
  ShieldAlert,
  HardDrive,
  FileText,
  Lock,
  Layers,
  Sparkles
} from 'lucide-react';
import { VaultFile, Folder } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { apiRequest, apiDownloadBlob } from '../api/client';
import {
  unwrapFileKeyWithMasterKey,
  decryptFilePayload,
} from '../crypto/webCrypto';

import { Breadcrumb } from '../components/Breadcrumb';
import { FileGrid } from '../components/FileGrid';
import { FileList } from '../components/FileList';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { ShareModal } from '../components/ShareModal';
import { VersionHistoryModal } from '../components/VersionHistoryModal';
import { DownloadHistoryModal } from '../components/DownloadHistoryModal';
import { CryptoInspectModal } from '../components/CryptoInspectModal';
import { RenameModal } from '../components/RenameModal';
import { MoveFileModal } from '../components/MoveFileModal';
import { ConfirmModal } from '../components/ConfirmModal';

interface VaultPageProps {
  files: VaultFile[];
  folders: Folder[];
  currentFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onRefreshData: () => void;
  onOpenUploadModal: () => void;
  onOpenCreateFolderModal: () => void;
}

type SortField = 'name' | 'date' | 'size';
type SortDirection = 'asc' | 'desc';
type FileTypeFilter = 'all' | 'documents' | 'images' | 'code' | 'archives';

export const VaultPage: React.FC<VaultPageProps> = ({
  files,
  folders,
  currentFolderId,
  onSelectFolder,
  onRefreshData,
  onOpenUploadModal,
  onOpenCreateFolderModal,
}) => {
  const { masterKey, user } = useAuth();
  const { success, error: toastError } = useToast();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [typeFilter, setTypeFilter] = useState<FileTypeFilter>('all');

  // Modal states
  const [previewFile, setPreviewFile] = useState<VaultFile | null>(null);
  const [shareFile, setShareFile] = useState<VaultFile | null>(null);
  const [versionHistoryFile, setVersionHistoryFile] = useState<VaultFile | null>(null);
  const [downloadHistoryFile, setDownloadHistoryFile] = useState<VaultFile | null>(null);
  const [inspectCryptoFile, setInspectCryptoFile] = useState<VaultFile | null>(null);
  const [renameItem, setRenameItem] = useState<{ type: 'file' | 'folder'; id: string; name: string } | null>(null);
  const [moveFile, setMoveFile] = useState<VaultFile | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ type: 'file' | 'folder'; id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter folders inside current folder
  const currentFolders = useMemo(() => {
    return folders.filter(f => f.parentId === currentFolderId);
  }, [folders, currentFolderId]);

  // Filter and sort files
  const filteredFiles = useMemo(() => {
    let result = files.filter(f => f.folderId === currentFolderId);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        f => f.name.toLowerCase().includes(q) || f.originalName.toLowerCase().includes(q)
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter(f => {
        const mime = f.mimeType.toLowerCase();
        if (typeFilter === 'images') return mime.startsWith('image/');
        if (typeFilter === 'documents') return mime.includes('pdf') || mime.includes('text') || mime.includes('word') || mime.includes('document');
        if (typeFilter === 'code') return mime.includes('json') || mime.includes('javascript') || mime.includes('typescript') || f.name.endsWith('.js') || f.name.endsWith('.ts');
        if (typeFilter === 'archives') return mime.includes('zip') || mime.includes('tar') || mime.includes('compressed');
        return true;
      });
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortField === 'date') comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortField === 'size') comparison = a.size - b.size;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [files, currentFolderId, searchQuery, typeFilter, sortField, sortDirection]);

  // Download & Decrypt in Browser
  const handleDownloadDecrypted = async (file: VaultFile) => {
    if (!masterKey) {
      toastError('Vault Locked', 'Please unlock your vault before decrypting files.');
      return;
    }

    try {
      const { blob, headers } = await apiDownloadBlob(`/files/${file.id}/download?mode=decrypted_client`);
      const ciphertextBuffer = await blob.arrayBuffer();

      const iv = headers.get('X-Vault-IV') || file.iv;
      const wrappedKey = headers.get('X-Vault-Wrapped-Key') || file.wrappedKey;
      const wrappedKeyIv = headers.get('X-Vault-Wrapped-Key-IV') || file.wrappedKeyIv;

      // 1. Unwrap file key with master key
      const fileKey = await unwrapFileKeyWithMasterKey(wrappedKey, wrappedKeyIv, masterKey);

      // 2. Decrypt ciphertext payload and verify AES-GCM 128-bit tag
      const plaintextBuffer = await decryptFilePayload(ciphertextBuffer, fileKey, iv);

      // 3. Save as decrypted file to user disk
      const plainBlob = new Blob([plaintextBuffer], { type: file.mimeType });
      const url = URL.createObjectURL(plainBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName || file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      success('Decrypted & Saved', `Verified AES-GCM authentication tag and saved "${file.name}".`);
    } catch (err: any) {
      console.error('Decryption failed:', err);
      toastError('Decryption Error', err.message || 'AES-GCM integrity check failed.');
    }
  };

  // Download raw encrypted .enc blob
  const handleDownloadEncryptedBlob = async (file: VaultFile) => {
    try {
      const { blob } = await apiDownloadBlob(`/files/${file.id}/download?mode=raw_encrypted`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name}.enc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      success('Raw Ciphertext Downloaded', `Downloaded zero-knowledge blob "${file.name}.enc".`);
    } catch (err: any) {
      toastError('Download Failed', err.message);
    }
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    try {
      if (deleteItem.type === 'file') {
        await apiRequest(`/files/${deleteItem.id}`, { method: 'DELETE' });
        success('File Deleted', `Permanently deleted "${deleteItem.name}" and historical versions.`);
      } else {
        await apiRequest(`/folders/${deleteItem.id}`, { method: 'DELETE' });
        success('Folder Deleted', `Deleted folder "${deleteItem.name}". Nested items moved to parent.`);
      }
      onRefreshData();
      setDeleteItem(null);
    } catch (err: any) {
      toastError('Delete Failed', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Top action toolbar */}
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm space-y-3">
        {/* Breadcrumb & Global counts */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <Breadcrumb
            folders={folders}
            currentFolderId={currentFolderId}
            onSelectFolder={onSelectFolder}
          />

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenCreateFolderModal}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5 text-emerald-500" />
              <span>New Folder</span>
            </button>

            <button
              onClick={onOpenUploadModal}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Encrypted</span>
            </button>
          </div>
        </div>

        {/* Search, Filter, Sort & View Mode */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search files by encrypted metadata..."
              className="w-full bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-emerald-500 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Category Filter */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as FileTypeFilter)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="documents">Documents / PDF</option>
              <option value="images">Images</option>
              <option value="code">Code / Config</option>
              <option value="archives">Archives / ZIP</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={`${sortField}-${sortDirection}`}
              onChange={e => {
                const [f, d] = e.target.value.split('-');
                setSortField(f as SortField);
                setSortDirection(d as SortDirection);
              }}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="size-desc">Size (Large to Small)</option>
              <option value="size-asc">Size (Small to Large)</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center p-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
                title="Grid view"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
                title="List view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content display */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {currentFolders.length === 0 && filteredFiles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
              Vault Directory is Empty
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Upload files to encrypt them in your browser with 256-bit AES-GCM and store zero-knowledge ciphertexts in the cloud.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onOpenCreateFolderModal}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
              >
                Create Folder
              </button>
              <button
                onClick={onOpenUploadModal}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 transition-colors"
              >
                Upload Encrypted Files
              </button>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <FileGrid
            files={filteredFiles}
            folders={currentFolders}
            onOpenFolder={onSelectFolder}
            onPreview={setPreviewFile}
            onDownloadDecrypted={handleDownloadDecrypted}
            onDownloadEncryptedBlob={handleDownloadEncryptedBlob}
            onShare={setShareFile}
            onVersionHistory={setVersionHistoryFile}
            onDownloadHistory={setDownloadHistoryFile}
            onInspectCrypto={setInspectCryptoFile}
            onRenameFile={f => setRenameItem({ type: 'file', id: f.id, name: f.name })}
            onMoveFile={setMoveFile}
            onDeleteFile={f => setDeleteItem({ type: 'file', id: f.id, name: f.name })}
            onRenameFolder={f => setRenameItem({ type: 'folder', id: f.id, name: f.name })}
            onDeleteFolder={f => setDeleteItem({ type: 'folder', id: f.id, name: f.name })}
          />
        ) : (
          <FileList
            files={filteredFiles}
            folders={currentFolders}
            onOpenFolder={onSelectFolder}
            onPreview={setPreviewFile}
            onDownloadDecrypted={handleDownloadDecrypted}
            onDownloadEncryptedBlob={handleDownloadEncryptedBlob}
            onShare={setShareFile}
            onVersionHistory={setVersionHistoryFile}
            onDownloadHistory={setDownloadHistoryFile}
            onInspectCrypto={setInspectCryptoFile}
            onRenameFile={f => setRenameItem({ type: 'file', id: f.id, name: f.name })}
            onMoveFile={setMoveFile}
            onDeleteFile={f => setDeleteItem({ type: 'file', id: f.id, name: f.name })}
            onRenameFolder={f => setRenameItem({ type: 'folder', id: f.id, name: f.name })}
            onDeleteFolder={f => setDeleteItem({ type: 'folder', id: f.id, name: f.name })}
          />
        )}
      </div>

      {/* Modals */}
      <FilePreviewModal
        isOpen={previewFile !== null}
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />

      <ShareModal
        isOpen={shareFile !== null}
        file={shareFile}
        onClose={() => setShareFile(null)}
      />

      <VersionHistoryModal
        isOpen={versionHistoryFile !== null}
        file={versionHistoryFile}
        onClose={() => setVersionHistoryFile(null)}
        onVersionRestored={onRefreshData}
      />

      <DownloadHistoryModal
        isOpen={downloadHistoryFile !== null}
        file={downloadHistoryFile}
        onClose={() => setDownloadHistoryFile(null)}
      />

      <CryptoInspectModal
        isOpen={inspectCryptoFile !== null}
        file={inspectCryptoFile}
        onClose={() => setInspectCryptoFile(null)}
      />

      <RenameModal
        isOpen={renameItem !== null}
        itemType={renameItem?.type || 'file'}
        itemId={renameItem?.id || null}
        currentName={renameItem?.name || ''}
        onClose={() => setRenameItem(null)}
        onRenamed={onRefreshData}
      />

      <MoveFileModal
        isOpen={moveFile !== null}
        file={moveFile}
        folders={folders}
        onClose={() => setMoveFile(null)}
        onFileMoved={onRefreshData}
      />

      <ConfirmModal
        isOpen={deleteItem !== null}
        title={`Delete ${deleteItem?.type === 'file' ? 'Encrypted File' : 'Folder'}?`}
        message={`Are you sure you want to permanently delete "${deleteItem?.name}"? All ciphertext blobs and versions will be removed from disk.`}
        confirmLabel="Delete Permanently"
        isDangerous
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
};
