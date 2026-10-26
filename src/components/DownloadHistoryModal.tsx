import React, { useState, useEffect } from 'react';
import { X, Download, Shield, Loader2, Calendar, User, Globe } from 'lucide-react';
import { VaultFile, DownloadLog } from '../types';
import { apiRequest } from '../api/client';

interface DownloadHistoryModalProps {
  isOpen: boolean;
  file: VaultFile | null;
  onClose: () => void;
}

export const DownloadHistoryModal: React.FC<DownloadHistoryModalProps> = ({
  isOpen,
  file,
  onClose,
}) => {
  const [logs, setLogs] = useState<DownloadLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !file) return;

    const loadLogs = async () => {
      setIsLoading(true);
      try {
        const data = await apiRequest<{ logs: DownloadLog[] }>(
          `/audit/download-history/${file.id}`
        );
        setLogs(data.logs || []);
      } catch (err: any) {
        console.error('Failed to load download history:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadLogs();
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-800 dark:text-slate-200 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Download Audit History
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                {file.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Table */}
        <div className="mt-4">
          {isLoading ? (
            <div className="py-8 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-500 mb-2" />
              <p className="text-xs">Fetching download security audit log...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No recorded downloads for this file yet.
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
              {logs.map(log => (
                <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{log.userEmail}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                        v{log.versionNumber}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(log.downloadedAt).toLocaleString()}</span>
                      {log.ipAddress && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{log.ipAddress}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      log.mode === 'decrypted_client'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
                    }`}
                  >
                    {log.mode === 'decrypted_client' ? 'Decrypted in RAM' : 'Raw .enc Blob'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
