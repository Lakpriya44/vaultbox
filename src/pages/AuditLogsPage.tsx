import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Download,
  Filter,
  Calendar,
  Shield,
  Loader2,
  FileCheck,
  User,
  Activity,
  Globe
} from 'lucide-react';
import { ActivityLog } from '../types';
import { apiRequest } from '../api/client';
import { useToast } from '../components/Toast';

export const AuditLogsPage: React.FC = () => {
  const { error: toastError, success } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter !== 'all') params.append('action', actionFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const data = await apiRequest<{ logs: ActivityLog[] }>(`/audit/activity?${params.toString()}`);
      setLogs(data.logs || []);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter, startDate, endDate]);

  const handleExportCsv = async () => {
    try {
      const token = localStorage.getItem('vaultbox_token');
      const params = new URLSearchParams();
      if (actionFilter !== 'all') params.append('action', actionFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/audit/activity/export-csv?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to download CSV');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vaultbox_audit_logs_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      success('CSV Exported', 'Audit trail exported successfully.');
    } catch (err: any) {
      toastError('Export Failed', err.message);
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('uploaded')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    if (action.includes('downloaded')) return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
    if (action.includes('shared')) return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    if (action.includes('revoked') || action.includes('deleted')) return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
    if (action.includes('registered') || action.includes('login')) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ScrollText className="w-6 h-6 text-emerald-500" />
            Security & Activity Audit Logs
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Immutable cryptographic tamper-evident activity log and download tracking
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export Audit to CSV</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="mb-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Filter className="w-4 h-4 text-emerald-500" />
          <span>Filter:</span>
        </div>

        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
        >
          <option value="all">All Security Actions</option>
          <option value="file_uploaded">File Uploads</option>
          <option value="file_downloaded">File Downloads</option>
          <option value="file_shared">File Shares</option>
          <option value="share_revoked">Share Revocations</option>
          <option value="file_deleted">File Deletions</option>
          <option value="file_renamed">File Renames</option>
          <option value="file_moved">File Moves</option>
          <option value="file_restored_version">Version Restores</option>
          <option value="folder_created">Folder Created</option>
          <option value="user_login">User Login</option>
          <option value="user_registered">User Registration</option>
        </select>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">From:</span>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">To:</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
          />
        </div>

        {(actionFilter !== 'all' || startDate || endDate) && (
          <button
            onClick={() => {
              setActionFilter('all');
              setStartDate('');
              setEndDate('');
            }}
            className="text-xs text-emerald-500 hover:underline ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Log Table */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
          <p className="text-xs">Querying audit trail...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 text-xs">
          No audit records matched the filter criteria.
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/90 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Name</th>
                  <th className="py-3 px-4">Audit Details</th>
                  <th className="py-3 px-4">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getActionBadgeColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                      {log.targetName || log.targetType}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-md">
                      {log.details}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.userEmail}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
