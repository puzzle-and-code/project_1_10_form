import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { AuthResponse } from './auth.ts';
import { tokenStore } from './tokenStore.ts';

/**
 * Базовый URL для всех запросов к API.
 * По умолчанию '/api' (проксируется Vite в dev или Nginx в prod).
 */
export const API_BASE_URL = (import.meta.env?.VITE_API_URL ?? '/api')
  .trim()
  .replace(/\/+$/, '');

/**
 * Единый HTTP-клиент (Axios) для всех запросов приложения.
 * - withCredentials: true (чтобы httpOnly cookie с refreshToken уходила на бэк)
 */
export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Отдельный клиент для запросов обновления токена,
 * чтобы сам запрос на refresh не попадал в перехватчик httpClient.
 */
export const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/** Обработчик потери авторизации (вызывается при 401 на refresh) */
type AuthFailureHandler = () => void;
let authFailureHandler: AuthFailureHandler | null = null;

export function registerAuthFailureHandler(handler: AuthFailureHandler): () => void {
  authFailureHandler = handler;
  return () => {
    if (authFailureHandler === handler) {
      authFailureHandler = null;
    }
  };
}

function triggerAuthFailure(): void {
  tokenStore.clear();
  if (authFailureHandler) {
    authFailureHandler();
  } else {
    // Дефолтный переход на страницу логина, если контекст ещё не смонтирован
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.assign('/login');
    }
  }
}

interface AuthRequestConfig extends InternalAxiosRequestConfig {
  authVersion?: number;
  retried?: boolean;
}

let authVersion = 0;
let changingSession = false;
let pendingRefresh: Promise<AuthResponse> | null = null;

export async function beginAuthTransition(): Promise<() => void> {
  const version = ++authVersion;
  changingSession = true;
  // Дождаться установки новой cookie, чтобы следующий login или logout обработал её.
  await pendingRefresh?.catch(() => undefined);
  return () => {
    if (version === authVersion) changingSession = false;
  };
}

export function isAuthEndpoint(url?: string): boolean {
  const path = url?.split(/[?#]/, 1)[0].replace(/\/+$/, '') ?? '';
  return /(?:^|\/)auth\/(?:login|refresh|logout|register)$/.test(path);
}

export function refreshAccessToken(): Promise<AuthResponse> {
  if (changingSession) return Promise.reject(new axios.CanceledError('Сессия меняется'));
  if (pendingRefresh) return pendingRefresh;

  const version = authVersion;
  pendingRefresh = refreshClient.post<AuthResponse>('/auth/refresh', {}, { timeout: 10000 })
    .then(({ data }) => {
      if (version !== authVersion) throw new axios.CanceledError('Сессия изменилась');
      if (typeof data?.accessToken !== 'string' || !data.accessToken.trim()) {
        throw new Error('Ответ refresh не содержит accessToken');
      }
      tokenStore.set(data.accessToken);
      return data;
    })
    .finally(() => { pendingRefresh = null; });
  return pendingRefresh;
}

httpClient.interceptors.request.use((config: AuthRequestConfig) => {
  if (config.retried && config.authVersion !== authVersion) {
    throw new axios.CanceledError('Сессия изменилась');
  }
  config.authVersion = authVersion;
  const token = tokenStore.get();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

httpClient.interceptors.response.use(undefined, async (error: AxiosError) => {
  const request = error.config as AuthRequestConfig | undefined;
  if (error.response?.status !== 401 || !request || isAuthEndpoint(request.url) ||
      changingSession || request.authVersion !== authVersion || request.retried) {
    throw error;
  }

  request.retried = true;
  const token = tokenStore.get();
  // Другой запрос мог уже обновить токен к моменту получения этого 401.
  if (!token || request.headers.get('Authorization') === `Bearer ${token}`) {
    try {
      await refreshAccessToken();
    } catch (refreshError) {
      if (request.authVersion === authVersion &&
          axios.isAxiosError(refreshError) && refreshError.response?.status === 401) {
        ++authVersion;
        triggerAuthFailure();
      }
      throw refreshError;
    }
  }

  return httpClient(request);
});
