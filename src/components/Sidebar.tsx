import React, { useState } from 'react';
import {
  Folder,
  FolderPlus,
  Upload,
  Files,
  Share2,
  ScrollText,
  LayoutDashboard,
  Shield,
  ChevronRight,
  ChevronDown,
  HardDrive
} from 'lucide-react';
import { Folder as FolderType } from '../types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  folders: FolderType[];
  currentFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onOpenUploadModal: () => void;
  onOpenCreateFolderModal: () => void;
  sharedCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  folders,
  currentFolderId,
  onSelectFolder,
  onOpenUploadModal,
  onOpenCreateFolderModal,
  sharedCount = 0,
}) => {
  const { user } = useAuth();
  const [foldersOpen, setFoldersOpen] = useState(true);

  // Storage calculation
  const storageUsedBytes = user?.storageUsed || 0;
  const storageQuotaBytes = 100 * 1024 * 1024; // 100 MB quota
  const storagePercentage = Math.min(100, Math.round((storageUsedBytes / storageQuotaBytes) * 100));

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const navItems = [
    {
      id: 'vault',
      label: 'All Files',
      icon: Files,
      count: undefined,
    },
    {
      id: 'shared',
      label: 'Shared with Me',
      icon: Share2,
      count: sharedCount > 0 ? sharedCount : undefined,
    },
    {
      id: 'audit',
      label: 'Audit & Security Logs',
      icon: ScrollText,
      count: undefined,
    },
    {
      id: 'dashboard',
      label: 'Vault Dashboard',
      icon: LayoutDashboard,
      count: undefined,
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex flex-col h-[calc(100vh-4rem)] shrink-0 transition-colors">
      {/* Action buttons */}
      <div className="p-4 space-y-2">
        <button
          onClick={onOpenUploadModal}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 transition-all hover:shadow-lg active:scale-95"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Encrypted File</span>
        </button>

        <button
          onClick={onOpenCreateFolderModal}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors"
        >
          <FolderPlus className="w-4 h-4 text-emerald-500" />
          <span>New Folder</span>
        </button>
      </div>

      {/* Nav Menu */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
        <div>
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Vault Navigation
          </p>
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (item.id === 'vault') onSelectFolder(null);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-500 font-bold">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Folders Tree Section */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <button
              onClick={() => setFoldersOpen(!foldersOpen)}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {foldersOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <span>Folders ({folders.length})</span>
            </button>
            <button
              onClick={onOpenCreateFolderModal}
              title="Add folder"
              className="p-1 hover:text-emerald-500 text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          {foldersOpen && (
            <div className="space-y-0.5 pl-1">
              <button
                onClick={() => {
                  setActiveTab('vault');
                  onSelectFolder(null);
                }}
                className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 transition-colors ${
                  activeTab === 'vault' && currentFolderId === null
                    ? 'text-emerald-500 font-semibold bg-emerald-500/10'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Folder className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">Root Vault</span>
              </button>

              {folders.map(f => {
                const isSelected = activeTab === 'vault' && currentFolderId === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => {
                      setActiveTab('vault');
                      onSelectFolder(f.id);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 transition-colors ${
                      isSelected
                        ? 'text-emerald-500 font-semibold bg-emerald-500/10'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Folder
                      className="w-3.5 h-3.5"
                      style={{ color: f.color || '#3b82f6' }}
                    />
                    <span className="truncate">{f.name}</span>
                  </button>
                );
              })}

              {folders.length === 0 && (
                <div className="px-3 py-2 text-[11px] text-slate-400 italic">
                  No folders created yet
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Storage Quota Card */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
              Storage Used
            </span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {storagePercentage}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                storagePercentage > 85
                  ? 'bg-rose-500'
                  : storagePercentage > 60
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${storagePercentage}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>{formatSize(storageUsedBytes)}</span>
            <span>{formatSize(storageQuotaBytes)} Limit</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
