import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  HardDrive,
  Files,
  Folder,
  Share2,
  ShieldCheck,
  Key,
  Lock,
  Cpu,
  ArrowRight,
  Download,
  Eye,
  CheckCircle2,
  Loader2,
  Activity
} from 'lucide-react';
import { VaultFile, ActivityLog, DashboardStats } from '../types';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';

export const DashboardPage: React.FC<{
  onNavigateToVault: () => void;
  onNavigateToShared: () => void;
  onNavigateToAudit: () => void;
  onOpenCryptoInspect: () => void;
}> = ({
  onNavigateToVault,
  onNavigateToShared,
  onNavigateToAudit,
  onOpenCryptoInspect,
}) => {
  const { user, masterKey } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentFiles, setRecentFiles] = useState<VaultFile[]>([]);
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      try {
        const data = await apiRequest<{
          stats: DashboardStats;
          recentFiles: VaultFile[];
          recentLogs: ActivityLog[];
        }>('/audit/dashboard');
        setStats(data.stats);
        setRecentFiles(data.recentFiles || []);
        setRecentLogs(data.recentLogs || []);
      } catch (err: any) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const storageUsed = stats?.totalStorageBytes || 0;
  const storageLimit = stats?.storageQuotaBytes || 100 * 1024 * 1024;
  const storagePercent = Math.min(100, Math.round((storageUsed / storageLimit) * 100));

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <LayoutDashboard className="w-6 h-6 text-emerald-500" />
            Security & Vault Dashboard
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time telemetry on zero-knowledge encryption, storage quotas, and access audit
          </p>
        </div>

        <button
          onClick={onOpenCryptoInspect}
          className="px-3.5 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Audit Crypto Primitives</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
          <p className="text-xs">Loading vault telemetry...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Storage Quota Card */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Storage Used
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <HardDrive className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatSize(storageUsed)}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  of {formatSize(storageLimit)} limit ({storagePercent}%)
                </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
            </div>

            {/* Encrypted Files Count */}
            <div
              onClick={onNavigateToVault}
              className="cursor-pointer group p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-500/50 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Encrypted Files
                </span>
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
                  <Files className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                  {stats?.fileCount || 0}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Across {stats?.folderCount || 0} organized folders
                </div>
              </div>
              <div className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1 mt-3">
                <span>View file explorer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Shared Files Count */}
            <div
              onClick={onNavigateToShared}
              className="cursor-pointer group p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-purple-500/50 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Shared With Me
                </span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                  <Share2 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-purple-500 transition-colors">
                  {stats?.sharedWithMeCount || 0}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  End-to-end RSA encapsulated
                </div>
              </div>
              <div className="text-[11px] text-purple-500 font-semibold flex items-center gap-1 mt-3">
                <span>View shared files</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Zero-Knowledge Security Status */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Security Grade
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-base font-black text-emerald-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Zero-Knowledge
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                  AES-GCM-256 / PBKDF2 310k
                </div>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                Plaintext cached in DB: <span className="font-bold text-emerald-500">0 Bytes</span>
              </div>
            </div>
          </div>

          {/* Cryptographic Architecture Callout */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 text-slate-100 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    End-to-End Cryptographic Protocol
                  </h3>
                  <p className="text-xs text-slate-400">
                    Compliant with NIST SP 800-132 & OWASP 2023+ zero-knowledge standards
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hidden sm:inline">
                Client-Side Web Crypto API
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" /> PBKDF2 Key Derivation
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  310,000 SHA-256 iterations with 128-bit unique salt. Master Key lives only in client browser memory.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <div className="font-bold text-cyan-400 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> AES-256-GCM File Cipher
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Ephemeral 256-bit symmetric keys with 12-byte IVs. Every upload is protected by a 128-bit GHASH authentication tag.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <div className="font-bold text-purple-400 mb-1 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5" /> RSA-OAEP Key Exchange
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  2048-bit modulus sharing. Encapsulated file keys are unwrapped purely via the recipient’s private key.
                </p>
              </div>
            </div>
          </div>

          {/* Recent Files & Recent Audit logs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Files Card */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Files className="w-4 h-4 text-emerald-500" />
                    Recent Encrypted Files
                  </h3>
                  <button
                    onClick={onNavigateToVault}
                    className="text-xs text-emerald-500 hover:underline font-semibold"
                  >
                    View All
                  </button>
                </div>

                {recentFiles.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-6 text-center">
                    No files uploaded yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {recentFiles.map(file => (
                      <div key={file.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="truncate max-w-[200px] sm:max-w-xs">
                          <span className="font-semibold text-slate-900 dark:text-white truncate block">
                            {file.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatSize(file.size)} • v{file.activeVersion}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          AES-256
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Audit Activities Card */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-500" />
                    Recent Security Audit Feed
                  </h3>
                  <button
                    onClick={onNavigateToAudit}
                    className="text-xs text-cyan-500 hover:underline font-semibold"
                  >
                    Audit Trail
                  </button>
                </div>

                {recentLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-6 text-center">
                    No activity recorded yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recentLogs.slice(0, 5).map(log => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="truncate max-w-[220px]">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                            {log.details}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                          {log.action.split('_')[1] || log.action}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
