import React from 'react';
import { ChevronRight, Home, Folder } from 'lucide-react';
import { Folder as FolderType } from '../types';

interface BreadcrumbProps {
  folders: FolderType[];
  currentFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  folders,
  currentFolderId,
  onSelectFolder,
}) => {
  // Reconstruct folder path
  const path: FolderType[] = [];
  let curr = currentFolderId ? folders.find(f => f.id === currentFolderId) : null;
  while (curr) {
    path.unshift(curr);
    curr = curr.parentId ? folders.find(f => f.id === curr!.parentId) : null;
  }

  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium overflow-x-auto py-1">
      <button
        onClick={() => onSelectFolder(null)}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
          currentFolderId === null
            ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10'
            : 'text-slate-600 dark:text-slate-400'
        }`}
      >
        <Home className="w-3.5 h-3.5" />
        <span>Root Vault</span>
      </button>

      {path.map((f, idx) => {
        const isLast = idx === path.length - 1;
        return (
          <React.Fragment key={f.id}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
            <button
              onClick={() => onSelectFolder(f.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors truncate max-w-[140px] ${
                isLast
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: f.color || '#3b82f6' }} />
              <span className="truncate">{f.name}</span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
