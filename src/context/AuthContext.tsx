import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { apiRequest } from '../api/client';
import {
  deriveMasterKey,
  generateRandomSalt,
  generateAndWrapRsaKeyPair,
  unwrapPrivateKey,
} from '../crypto/webCrypto';

interface AuthContextType {
  user: User | null;
  token: string | null;
  masterKey: CryptoKey | null;
  rsaPrivateKey: CryptoKey | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsKeyUnlock: boolean;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  unlockVaultWithPassword: (password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  quickDemoLogin: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('vaultbox_token'));
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [rsaPrivateKey, setRsaPrivateKey] = useState<CryptoKey | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [needsKeyUnlock, setNeedsKeyUnlock] = useState<boolean>(false);

  const logout = useCallback(() => {
    localStorage.removeItem('vaultbox_token');
    sessionStorage.removeItem('vaultbox_cached_pwd');
    setToken(null);
    setUser(null);
    setMasterKey(null);
    setRsaPrivateKey(null);
    setNeedsKeyUnlock(false);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ user: User }>('/auth/me');
      setUser(data.user);
    } catch (err: any) {
      if (err.status === 401) {
        logout();
      }
    }
  }, [token, logout]);

  // Derive keys using password + user's salt and unwrap RSA private key
  const initializeClientKeys = async (password: string, userRecord: User): Promise<void> => {
    try {
      // 1. Derive 256-bit AES-GCM Master Key from password + user.salt
      const derivedKey = await deriveMasterKey(password, userRecord.salt);
      setMasterKey(derivedKey);

      // 2. Unwrap RSA private key using derived Master Key
      if (userRecord.encryptedPrivateKey && userRecord.privateKeyIv) {
        try {
          const unwrappedRsa = await unwrapPrivateKey(
            userRecord.encryptedPrivateKey,
            userRecord.privateKeyIv,
            derivedKey
          );
          setRsaPrivateKey(unwrappedRsa);
        } catch (rsaErr) {
          console.warn('[Crypto] Could not unwrap RSA key (may be mock demo key):', rsaErr);
        }
      }

      setNeedsKeyUnlock(false);
      // Cache password in sessionStorage during active tab for seamless background operations
      sessionStorage.setItem('vaultbox_cached_pwd', password);
    } catch (err) {
      console.error('[Crypto] Failed to derive master key:', err);
      throw err;
    }
  };

  const login = async (emailOrUsername: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const data = await apiRequest<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername, password }),
      });

      localStorage.setItem('vaultbox_token', data.token);
      setToken(data.token);
      setUser(data.user);

      // Derive encryption keys in browser
      await initializeClientKeys(password, data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, username: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      // 1. Generate random salt (16 bytes)
      const salt = generateRandomSalt();

      // 2. Derive Master Key using PBKDF2 (SHA-256, 310,000 iterations)
      const newMasterKey = await deriveMasterKey(password, salt);

      // 3. Generate RSA-OAEP key pair and wrap private key with Master Key
      const { keyPair, exported } = await generateAndWrapRsaKeyPair(newMasterKey);

      // 4. Send public credentials and encrypted key to server
      const data = await apiRequest<{ token: string; user: User }>('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          username,
          password,
          salt,
          rsaPublicKey: exported.publicKeySpkiBase64,
          encryptedPrivateKey: exported.encryptedPrivateKeyBase64,
          privateKeyIv: exported.privateKeyIvBase64,
        }),
      });

      localStorage.setItem('vaultbox_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setMasterKey(newMasterKey);
      setRsaPrivateKey(keyPair.privateKey);
      setNeedsKeyUnlock(false);
      sessionStorage.setItem('vaultbox_cached_pwd', password);
    } finally {
      setIsLoading(false);
    }
  };

  const unlockVaultWithPassword = async (password: string): Promise<boolean> => {
    if (!user) return false;
    try {
      await initializeClientKeys(password, user);
      return true;
    } catch {
      return false;
    }
  };

  const quickDemoLogin = async (email: string, password: string): Promise<void> => {
    await login(email, password);
  };

  // Initial load check
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('vaultbox_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await apiRequest<{ user: User }>('/auth/me');
        setUser(data.user);

        // Check if password was cached in sessionStorage for this tab
        const cachedPwd = sessionStorage.getItem('vaultbox_cached_pwd');
        if (cachedPwd) {
          try {
            await initializeClientKeys(cachedPwd, data.user);
          } catch {
            setNeedsKeyUnlock(true);
          }
        } else {
          // Master key is not in memory; user needs to enter password to unlock vault
          setNeedsKeyUnlock(true);
        }
      } catch (err: any) {
        if (err.status === 401) {
          logout();
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        masterKey,
        rsaPrivateKey,
        isAuthenticated: !!token && !!user,
        isLoading,
        needsKeyUnlock,
        login,
        register,
        unlockVaultWithPassword,
        logout,
        refreshUser,
        quickDemoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
