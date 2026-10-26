import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './components/Toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VaultFile, Folder } from './types';
import { apiRequest } from './api/client';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { UnlockVaultModal } from './components/UnlockVaultModal';
import { UploadModal } from './components/UploadModal';
import { CreateFolderModal } from './components/CreateFolderModal';
import { CryptoInspectModal } from './components/CryptoInspectModal';

import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VaultPage } from './pages/VaultPage';
import { SharedWithMePage } from './pages/SharedWithMePage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { DashboardPage } from './pages/DashboardPage';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, user, refreshUser } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<string>('vault');

  // Vault state
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [sharedCount, setSharedCount] = useState<number>(0);

  // Global modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isCryptoInspectOpen, setIsCryptoInspectOpen] = useState(false);

  const loadVaultData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [filesRes, foldersRes, sharesRes] = await Promise.all([
        apiRequest<{ files: VaultFile[] }>('/files'),
        apiRequest<{ folders: Folder[] }>('/folders'),
        apiRequest<{ sharedItems: any[] }>('/shares/shared-with-me'),
      ]);
      setFiles(filesRes.files || []);
      setFolders(foldersRes.folders || []);
      setSharedCount(sharesRes.sharedItems?.length || 0);
      refreshUser();
    } catch (err) {
      console.error('Error refreshing vault data:', err);
    }
  }, [isAuthenticated, refreshUser]);

  useEffect(() => {
    if (isAuthenticated) {
      loadVaultData();
    }
  }, [isAuthenticated, loadVaultData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-pulse mb-3">
          <span className="font-mono text-xs font-bold">VB</span>
        </div>
        <p className="text-xs font-mono">Initializing Zero-Knowledge VaultBox...</p>
      </div>
    );
  }

  // Not authenticated: Show Login or Register
  if (!isAuthenticated) {
    if (authMode === 'register') {
      return <RegisterPage onNavigateToLogin={() => setAuthMode('login')} />;
    }
    return <LoginPage onNavigateToRegister={() => setAuthMode('register')} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Session Key Unlock Modal */}
      <UnlockVaultModal />

      {/* Top Navbar */}
      <Navbar
        onOpenCryptoInspect={() => setIsCryptoInspectOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          folders={folders}
          currentFolderId={currentFolderId}
          onSelectFolder={setCurrentFolderId}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          onOpenCreateFolderModal={() => setIsCreateFolderModalOpen(true)}
          sharedCount={sharedCount}
        />

        {/* Dynamic Page Router */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'vault' && (
            <VaultPage
              files={files}
              folders={folders}
              currentFolderId={currentFolderId}
              onSelectFolder={setCurrentFolderId}
              onRefreshData={loadVaultData}
              onOpenUploadModal={() => setIsUploadModalOpen(true)}
              onOpenCreateFolderModal={() => setIsCreateFolderModalOpen(true)}
            />
          )}

          {activeTab === 'shared' && <SharedWithMePage />}

          {activeTab === 'audit' && <AuditLogsPage />}

          {activeTab === 'dashboard' && (
            <DashboardPage
              onNavigateToVault={() => setActiveTab('vault')}
              onNavigateToShared={() => setActiveTab('shared')}
              onNavigateToAudit={() => setActiveTab('audit')}
              onOpenCryptoInspect={() => setIsCryptoInspectOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        folders={folders}
        currentFolderId={currentFolderId}
        onUploadSuccess={() => {
          setIsUploadModalOpen(false);
          loadVaultData();
        }}
      />

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        parentId={currentFolderId}
        onFolderCreated={loadVaultData}
      />

      {/* Standalone Crypto Inspector */}
      <CryptoInspectModal
        isOpen={isCryptoInspectOpen}
        file={null}
        onClose={() => setIsCryptoInspectOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
