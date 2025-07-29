
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { getUsers, StoredUser, getMaintenanceStatus, saveUsers } from '@/services/webdav'; 

interface User {
  username: string;
  isAdmin: boolean;
  isTrusted: boolean;
}

interface AuthContextType {
  user: User | null;
  isMaintenanceMode: boolean;
  login: (username: string, password_input: string) => Promise<boolean>;
  logout: () => void;
  register: (username: string, password_input: string) => Promise<{ success: boolean; message: string }>;
  isLoading: boolean;
  updateUserStatus: (username: string) => Promise<void>;
  setMaintenanceMode: (isMaintenance: boolean) => void;
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
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  const verifyAndSetUser = async (username: string, hash: string) => {
    try {
      const [users, maintenanceStatus] = await Promise.all([
        getUsers(),
        getMaintenanceStatus(),
      ]);

      const foundUser = users.find(u => u.username === username && u.passwordHash === hash);
      if (foundUser) {
        const userData = { 
          username: foundUser.username, 
          isAdmin: foundUser.isAdmin, 
          isTrusted: foundUser.isAdmin || foundUser.isTrusted 
        };
        setUser(userData);
        setIsMaintenanceMode(maintenanceStatus.isMaintenance);
        return true;
      }
    } catch (error) {
      console.error("Failed to fetch user data during verification", error);
    }
    logout();
    return false;
  };


  useEffect(() => {
    const loadUserFromCookie = async () => {
      setIsLoading(true);
      try {
          const storedSession = Cookies.get(USER_COOKIE_KEY);
          if (storedSession) {
            const sessionData: SessionData = JSON.parse(storedSession);
            if (sessionData.username && sessionData.hash) {
                await verifyAndSetUser(sessionData.username, sessionData.hash);
            } else {
               // If cookie is invalid, check maintenance status for public view
               const status = await getMaintenanceStatus();
               setIsMaintenanceMode(status.isMaintenance);
            }
          } else {
             const status = await getMaintenanceStatus();
             setIsMaintenanceMode(status.isMaintenance);
          }
      } catch (error) {
          console.error("Failed to process user from cookie", error);
          logout();
      } finally {
        setIsLoading(false);
      }
    };

    loadUserFromCookie();
  }, []);

  const updateUserStatus = async (username: string) => {
    if (user && user.username === username) {
      const storedSession = Cookies.get(USER_COOKIE_KEY);
      if (storedSession) {
        setIsLoading(true);
        const sessionData: SessionData = JSON.parse(storedSession);
        await verifyAndSetUser(sessionData.username, sessionData.hash);
        setIsLoading(false);
      }
    }
  };
  
  const login = async (username: string, password_input: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const users = await getUsers();
      const passwordHash = await hashPassword(password_input);
      const foundUser = users.find(u => u.username === username && u.passwordHash === passwordHash);

      if (foundUser) {
        const userData = { 
          username: foundUser.username, 
          isAdmin: foundUser.isAdmin, 
          isTrusted: foundUser.isAdmin || foundUser.isTrusted 
        };
        const sessionData: SessionData = { username: foundUser.username, hash: foundUser.passwordHash };
        Cookies.set(USER_COOKIE_KEY, JSON.stringify(sessionData), { expires: 7 }); 
        setUser(userData);
        // Also fetch maintenance status on login
        const status = await getMaintenanceStatus();
        setIsMaintenanceMode(status.isMaintenance);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
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
        let users = await getUsers();

        if (users.find(u => u.username === username)) {
            return { success: false, message: "该用户名已存在。" };
        }

        const isAdmin = users.length === 0;
        const isTrusted = isAdmin;
        const passwordHash = await hashPassword(password_input);

        const newUser: StoredUser = {
            username,
            passwordHash,
            isAdmin,
            isTrusted,
        };
        
        const currentUsers = await getUsers();
        if (currentUsers.find(u => u.username === username)) {
            return { success: false, message: "该用户名刚刚被注册，请换一个。" };
        }
        
        const updatedUsers = [...currentUsers, newUser];
        const { success, error } = await saveUsers(updatedUsers);

        if (success) {
            const userData = { username: newUser.username, isAdmin: newUser.isAdmin, isTrusted: newUser.isTrusted };
            const sessionData: SessionData = { username: newUser.username, hash: newUser.passwordHash };
            Cookies.set(USER_COOKIE_KEY, JSON.stringify(sessionData), { expires: 7 });
            setUser(userData);
            const status = await getMaintenanceStatus();
            setIsMaintenanceMode(status.isMaintenance);
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

  const value = { user, isMaintenanceMode, login, logout, register, isLoading, updateUserStatus, setMaintenanceMode: setIsMaintenanceMode };

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
