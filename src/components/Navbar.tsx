import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Moon,
  Sun,
  LogOut,
  User as UserIcon,
  HardDrive,
  Users,
  ChevronDown,
  Sparkles,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from './Toast';

export const Navbar: React.FC<{
  onOpenCryptoInspect?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}> = ({ onOpenCryptoInspect, activeTab, setActiveTab }) => {
  const { user, masterKey, logout, quickDemoLogin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { success } = useToast();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDemoSwitch, setShowDemoSwitch] = useState(false);

  const DEMO_ACCOUNTS: Record<string, string> = {
  'user01@domain.com': 'user01Pass!',
  'user02@domain.com': 'user02Pass!',
};

const handleSwitchUser = async (targetEmail: string) => {
  setShowDemoSwitch(false);
  setShowUserMenu(false);

  const password = DEMO_ACCOUNTS[targetEmail];

  if (!password) {
    return;
  }

  try {
    await quickDemoLogin(targetEmail, password);
    success('Switched User', `Now logged in as ${targetEmail}.`);
  } catch (error) {
    console.error('Account switching failed:', error);
  }
};

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div
          onClick={() => setActiveTab('vault')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                Vault<span className="text-emerald-500">Box</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Zero-Knowledge
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Client-Side Web Crypto AES-256-GCM
            </p>
          </div>
        </div>

        {/* Cryptographic Status Pill */}
        <button
          onClick={onOpenCryptoInspect}
          title="Click to view live cryptographic parameters"
          className="hidden md:flex items-center gap-2 ml-4 px-3 py-1.5 rounded-full text-xs border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/60 hover:border-emerald-500/50 transition-colors"
        >
          {masterKey ? (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          ) : (
            <span className="inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          )}
          <span className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">
            {masterKey ? 'Master Key Active (RAM)' : 'Key Locked'}
          </span>
          <Info className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Navigation tabs for mobile / small screen */}
      <div className="flex items-center gap-2">
        {/* Quick Demo Switcher Button for Viva/Grading */}
        <div className="relative">
          <button
            onClick={() => setShowDemoSwitch(prev => !prev)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Demo Switch</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>

          {showDemoSwitch && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
              <p className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Switch Test Account
              </p>
              <button
                onClick={() => handleSwitchUser('user01@domain.com')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                  user?.email === 'user01@domain.com' ? 'bg-emerald-500/10 text-emerald-500 font-semibold' : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                <div>
                  <div className="font-medium">User01</div>
                  <div className="text-[11px] text-slate-400">user01@domain.com</div>
                </div>
                {user?.email === 'user01@domain.com' && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
              </button>
              <button
                onClick={() => handleSwitchUser('user02@domain.com')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                  user?.email === 'user02@domain.com' ? 'bg-emerald-500/10 text-emerald-500 font-semibold' : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                <div>
                  <div className="font-medium">User02</div>
                  <div className="text-[11px] text-slate-400">user02@domain.com</div>
                </div>
                {user?.email === 'user02@domain.com' && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
              </button>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(prev => !prev)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs uppercase border border-emerald-500/30">
              {user?.username ? user.username.substring(0, 2) : 'VB'}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                {user?.username || 'User'}
              </div>
              <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                {user?.email}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 mb-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {user?.email}
                </p>
                <p className="text-[10px] text-emerald-500 font-mono mt-0.5">
                  ID: {user?.id?.substring(0, 12)}...
                </p>
              </div>

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  onOpenCryptoInspect?.();
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Crypto Architecture
              </button>

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  setActiveTab('dashboard');
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
              >
                <HardDrive className="w-4 h-4 text-cyan-500" />
                Vault Dashboard
              </button>

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 mt-1 border-t border-slate-100 dark:border-slate-700 pt-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
