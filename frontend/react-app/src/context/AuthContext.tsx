import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  type AuthResponse,
  type LoginPayload,
  type LoginResult,
  type User,
  loginRequest,
  logoutRequest,
  refreshRequest,
} from '../api/auth';
import { registerAuthFailureHandler } from '../api/httpClient';
import { tokenStore } from '../api/tokenStore';
import { AuthContext, type AuthContextType } from './authContextDef';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  // isLoading = true до завершения первичного вызова /api/auth/refresh
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearAuthState = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  /**
   * Вызов /api/auth/refresh для восстановления сессии
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const data = await refreshRequest();
      if (data?.user) {
        setUser(data.user);
        return true;
      }
      if (data?.accessToken) {
        setUser({ email: 'user@example.com' });
        return true;
      }
      clearAuthState();
      return false;
    } catch {
      clearAuthState();
      return false;
    }
  }, [clearAuthState]);

  /**
   * При старте приложения вызываем refresh до показа страниц
   */
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        await refreshSession();
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, [refreshSession]);

  /**
   * Регистрация слушателя потери авторизации от HTTP-перехватчика (когда refresh вернул 401)
   */
  useEffect(() => {
    const unregister = registerAuthFailureHandler(() => {
      clearAuthState();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    });

    return () => {
      unregister();
    };
  }, [clearAuthState]);

  /**
   * Логин: сохраняет токен в памяти и обновляет данные пользователя
   */
  const login = useCallback(
    async (payload: LoginPayload): Promise<LoginResult> => {
      const result = await loginRequest(payload);
      if (result.ok && result.data) {
        const authData: AuthResponse = result.data;
        setUser(authData.user ?? { email: payload.email });
      }
      return result;
    },
    [],
  );

  /**
   * Логаут: вызывает POST /auth/logout и обязательно очищает access-токен и пользователя
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutRequest();
    } finally {
      clearAuthState();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
  }, [clearAuthState]);

  const value: AuthContextType = {
    user,
    isAuthenticated: Boolean(user && tokenStore.get()),
    isLoading,
    login,
    logout,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
