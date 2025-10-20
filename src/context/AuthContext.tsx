
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { getSystemSettings, addUser, StoredUser, UserRole, getLastUploadTime, checkSelfDestructStatus, getUsers, saveUsers } from '@/services/db'; 
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
  isSelfDestructed: boolean;
  lastUploadTime: number | null;
  login: (username: string, password_input: string) => Promise<{success: boolean, message?: string}>;
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
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}


export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isSelfDestructed, setIsSelfDestructed] = useState(false);
  const [lastUploadTime, setLastUploadTime] = useState<number | null>(null);
  
  const isMaintenanceMode = settings?.isMaintenance ?? false;

  const verifyAndSetUser = async (username: string, hash: string): Promise<boolean> => {
    try {
      const { data: users, error } = await getUsers();

      if (error) {
        console.error('Failed to get users during verification:', error);
        return false; 
      }
      
      const foundUser = users?.find(u => u.username === username && u.passwordHash === hash);

      if (foundUser) {
        if (foundUser.role === 'banned') {
           Cookies.remove(USER_COOKIE_KEY);
           setUser(null);
           return false;
        }

        const userData = { 
          username: foundUser.username, 
          role: foundUser.role as UserRole,
          isAdmin: foundUser.role === 'admin', 
          isTrusted: foundUser.role === 'admin' || foundUser.role === 'trusted', 
        };
        setUser(userData);
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
          const [selfDestructResult, lastUploadResult, settingsResult] = await Promise.all([
             checkSelfDestructStatus(),
             getLastUploadTime(),
             getSystemSettings()
          ]);

          if (lastUploadResult.data) setLastUploadTime(lastUploadResult.data);
          if (settingsResult.data) setSettings(settingsResult.data);
          
          if (selfDestructResult.data?.selfDestruct) {
            setIsSelfDestructed(true);
            setIsLoading(false);
            return;
          }

          const storedSession = Cookies.get(USER_COOKIE_KEY);
          if (storedSession) {
            const sessionData: SessionData = JSON.parse(storedSession);
            if (sessionData.username && sessionData.hash) {
                await verifyAndSetUser(sessionData.username, sessionData.hash);
            } else {
               setUser(null);
               Cookies.remove(USER_COOKIE_KEY);
            }
          } else {
             setUser(null);
          }
      } catch (error) {
          console.error("Failed to process initial data", error);
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
  
  const login = async (username: string, password_input: string): Promise<{success: boolean, message?: string}> => {
    setIsLoading(true);
    try {
      const { data: users, error } = await getUsers();
      if (error) {
        return { success: false, message: `登录时发生错误: ${error}` };
      }

      const passwordHash = await hashPassword(password_input);
      const foundUser = users?.find(u => u.username === username && u.passwordHash === passwordHash);

      if (foundUser) {
        const role = foundUser.role as UserRole;
        if (role === 'banned') {
            return { success: false, message: '您的账户已被封禁。' };
        }

        const userData = { 
          username: foundUser.username, 
          role: role,
          isAdmin: role === 'admin',
          isTrusted: role === 'admin' || role === 'trusted'
        };
        const sessionData: SessionData = { username: foundUser.username, hash: foundUser.passwordHash };
        Cookies.set(USER_COOKIE_KEY, JSON.stringify(sessionData), { expires: 7 }); 
        setUser(userData);
        const {data: systemSettings, error: settingsError} = await getSystemSettings();
        if (settingsError) {
            console.error("Could not fetch system settings after login:", settingsError);
        }
        if (systemSettings) setSettings(systemSettings);
        return { success: true };
      }
      return { success: false, message: '无效的用户名或密码。' };
    } catch (error: any) {
      return { success: false, message: error.message || '登录时发生错误。' };
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
        const { data: users, error: getUsersError } = await getUsers();

        if (getUsersError) {
          return { success: false, message: `注册时发生错误: ${getUsersError}` };
        }

        if (users?.find(u => u.username === username)) {
            return { success: false, message: "该用户名已存在。" };
        }

        const role: UserRole = (users?.length ?? 0) === 0 ? 'admin' : 'user';
        const passwordHash = await hashPassword(password_input);

        const newUser: StoredUser = {
            username,
            passwordHash,
            role,
        };
        
        const { data: addedUser, error: addUserError } = await addUser(newUser);

        if (addUserError || !addedUser) {
            return { success: false, message: addUserError || "无法保存用户数据。" };
        }

        const userData = { 
            username: addedUser.username,
            role: addedUser.role as UserRole,
            isAdmin: addedUser.role === 'admin',
            isTrusted: addedUser.role === 'admin' || addedUser.role === 'trusted'
        };
        const sessionData: SessionData = { username: addedUser.username, hash: addedUser.passwordHash };
        Cookies.set(USER_COOKIE_KEY, JSON.stringify(sessionData), { expires: 7 });
        setUser(userData);
        const {data: systemSettings, error: settingsError} = await getSystemSettings();
        if (settingsError) {
            console.error("Could not fetch system settings after register:", settingsError);
        }
        if(systemSettings) setSettings(systemSettings);
        return { success: true, message: "注册成功！" };
        
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

  const value = { user, settings, setSettings, isMaintenanceMode, isSelfDestructed, lastUploadTime, login, logout, register, isLoading, updateUserStatus };

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

    