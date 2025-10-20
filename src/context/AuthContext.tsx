
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';
import {
  getSystemSettings,
  addUser,
  StoredUser,
  UserRole,
  getLastUploadTime,
  checkSelfDestructStatus,
  getUsers
} from '@/services/db';
import { SystemSettings } from '@/types';

interface User {
  username: string;
  role: UserRole;
  isAdmin: boolean;
  isTrusted: boolean;
}

interface AuthContextType {
  user: User | null;
  settings: SystemSettings | null;
  isMaintenanceMode: boolean;
<<<<<<< HEAD
  isSelfDestructed: boolean;
  lastUploadTime: number | null;
=======
>>>>>>> c1b8b04 (Revert "使该项目符合 ClassIsland Hub 规范（逃）")
  login: (username: string, password_input: string) => Promise<{ success: boolean, message?: string }>;
  logout: () => void;
  register: (username: string, password_input: string) => Promise<{ success: boolean; message: string }>;
  isLoading: boolean;
  updateUserStatus: (username: string) => Promise<void>;
  setSettings: (settings: SystemSettings) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const USER_COOKIE_KEY = 'hubqueue_session';

interface SessionData {
  username: string;
  hash: string;
}

interface AuthProviderProps {
  children: ReactNode;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
<<<<<<< HEAD
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
<<<<<<< HEAD
=======
  const [settings, setSettings] = useState<SystemSettings | null>(null);
>>>>>>> 150a881 (自毁时间可以自定义，不是固定的五天，但必须是从最后活跃开始算起，只能自定义偏移时间。精准到天数)
  const [isSelfDestructed, setIsSelfDestructed] = useState(false);
  const [lastUploadTime, setLastUploadTime] = useState<number | null>(null);

  const isMaintenanceMode = settings?.isMaintenance ?? false;

  const verifyAndSetUser = async (username: string, hash: string): Promise<boolean> => {
    try {
      const users = await getUsers();
=======

  const verifyAndSetUser = async (username: string, hash: string): Promise<boolean> => {
    try {
      const [users, maintenanceStatus] = await Promise.all([
        getUsers(),
        getMaintenanceStatus(),
      ]);

>>>>>>> c1b8b04 (Revert "使该项目符合 ClassIsland Hub 规范（逃）")
      const foundUser = users.find(u => u.username === username && u.passwordHash === hash);
      if (foundUser) {
        if (foundUser.role === 'banned') {
          Cookies.remove(USER_COOKIE_KEY);
          setUser(null);
          return false;
        }

        const userData = {
          username: foundUser.username,
          role: foundUser.role,
          isAdmin: foundUser.role === 'admin',
          isTrusted: foundUser.role === 'admin' || foundUser.role === 'trusted',
        };
        setUser(userData);
<<<<<<< HEAD
<<<<<<< HEAD
        // Maintenance status is loaded once at startup
=======
        setIsMaintenanceMode(maintenanceStatus.isMaintenance);
>>>>>>> c1b8b04 (Revert "使该项目符合 ClassIsland Hub 规范（逃）")
=======
>>>>>>> 150a881 (自毁时间可以自定义，不是固定的五天，但必须是从最后活跃开始算起，只能自定义偏移时间。精准到天数)
        return true;
      }
    } catch (error) {
      console.error("Failed to fetch user data during verification", error);
    }
    Cookies.remove(USER_COOKIE_KEY);
    setUser(null);
    return false;
  };


  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
<<<<<<< HEAD
<<<<<<< HEAD
        const [selfDestructStatus, lastUpload, maintenanceStatus] = await Promise.all([
=======
          const [selfDestructStatus, lastUpload, systemSettings] = await Promise.all([
>>>>>>> 150a881 (自毁时间可以自定义，不是固定的五天，但必须是从最后活跃开始算起，只能自定义偏移时间。精准到天数)
          checkSelfDestructStatus(),
          getLastUploadTime(),
          getSystemSettings()
        ]);
        setLastUploadTime(lastUpload);
        setSettings(systemSettings);

        if (selfDestructStatus.selfDestruct) {
          setIsSelfDestructed(true);
          setIsLoading(false);
          return;
        }

=======
>>>>>>> c1b8b04 (Revert "使该项目符合 ClassIsland Hub 规范（逃）")
        const storedSession = Cookies.get(USER_COOKIE_KEY);
        if (storedSession) {
          const sessionData: SessionData = JSON.parse(storedSession);
          if (sessionData.username && sessionData.hash) {
            await verifyAndSetUser(sessionData.username, sessionData.hash);
          } else {
<<<<<<< HEAD
=======
               // If cookie is invalid, still check maintenance status for public view
               const status = await getMaintenanceStatus();
               setIsMaintenanceMode(status.isMaintenance);
>>>>>>> c1b8b04 (Revert "使该项目符合 ClassIsland Hub 规范（逃）")
            setUser(null);
            Cookies.remove(USER_COOKIE_KEY);
          }
        } else {
<<<<<<< HEAD
=======
             const status = await getMaintenanceStatus();
             setIsMaintenanceMode(status.isMaintenance);
>>>>>>> c1b8b04 (Revert "使该项目符合 ClassIsland Hub 规范（逃）")
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to process initial data", error);
        // Don't auto-logout on server-side errors, just clear user state
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateUserStatus = async (username: string) => {
    if (user && user.username === username) {
      const storedSession = Cookies.get(USER_COOKIE_KEY);
      if (storedSession) {
        const sessionData: SessionData = JSON.parse(storedSession);
        await verifyAndSetUser(sessionData.username, sessionData.hash);
      }
    }
  };

  const login = async (username: string, password_input: string): Promise<{ success: boolean, message?: string }> => {
    setIsLoading(true);
    try {
      const users = await getUsers();
      const passwordHash = await hashPassword(password_input);
      const foundUser = users.find(u => u.username === username && u.passwordHash === passwordHash);

      if (foundUser) {
        if (foundUser.role === 'banned') {
          return { success: false, message: '您的账户已被封禁。' };
        }

        const userData = {
          username: foundUser.username,
          role: foundUser.role,
          isAdmin: foundUser.role === 'admin',
          isTrusted: foundUser.role === 'admin' || foundUser.role === 'trusted'
        };
        const sessionData: SessionData = { username: foundUser.username, hash: foundUser.passwordHash };
        Cookies.set(USER_COOKIE_KEY, JSON.stringify(sessionData), { expires: 7 });
        setUser(userData);
        const systemSettings = await getSystemSettings();
        setSettings(systemSettings);
        return { success: true };
      }
      return { success: false, message: '无效的用户名或密码。' };
    } catch (error) {
      console.error("Login failed:", error);
      return { success: false, message: '登录时发生错误。' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, password_input: string): Promise<{ success: boolean; message: string }> => {
    if (!username || !password_input) {
      return { success: false, message: "用户名和密码不能为空。" };
    }

    setIsLoading(true);
    try {
      const users = await getUsers();

      if (users.find(u => u.username === username)) {
        return { success: false, message: "该用户名已存在。" };
      }

      const role: UserRole = users.length === 0 ? 'admin' : 'user';
      const passwordHash = await hashPassword(password_input);

      const newUser: StoredUser = {
        username,
        passwordHash,
        role,
      };

      const { success, error } = await addUser(newUser);

      if (success) {
        const userData = {
          username: newUser.username,
          role: newUser.role,
          isAdmin: newUser.role === 'admin',
          isTrusted: newUser.role === 'admin' || newUser.role === 'trusted'
        };
        const sessionData: SessionData = { username: newUser.username, hash: newUser.passwordHash };
        Cookies.set(USER_COOKIE_KEY, JSON.stringify(sessionData), { expires: 7 });
        setUser(userData);
        const systemSettings = await getSystemSettings();
        setSettings(systemSettings);
        return { success: true, message: "注册成功！" };
      } else {
        return { success: false, message: error || "无法保存用户数据。" };
      }
    } catch (error: any) {
      return { success: false, message: error.message || "发生未知错误。" };
    } finally {
      setIsLoading(false);
    }
  };


  const logout = () => {
    Cookies.remove(USER_COOKIE_KEY);
    setUser(null);
  };

<<<<<<< HEAD
<<<<<<< HEAD
  const value = { user, isMaintenanceMode, isSelfDestructed, lastUploadTime, login, logout, register, isLoading, updateUserStatus, setMaintenanceMode: setIsMaintenanceMode };
=======
  const value = { user, isMaintenanceMode, login, logout, register, isLoading, updateUserStatus, setMaintenanceMode: setIsMaintenanceMode };
>>>>>>> c1b8b04 (Revert "使该项目符合 ClassIsland Hub 规范（逃）")
=======
  const value = { user, settings, setSettings, isMaintenanceMode, isSelfDestructed, lastUploadTime, login, logout, register, isLoading, updateUserStatus };
>>>>>>> 150a881 (自毁时间可以自定义，不是固定的五天，但必须是从最后活跃开始算起，只能自定义偏移时间。精准到天数)

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth 必须在 AuthProvider 中使用');
  }
  return context;
}
