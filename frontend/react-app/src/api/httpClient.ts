import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenStore } from './tokenStore';

/**
 * Базовый URL для всех запросов к API.
 * По умолчанию '/api' (проксируется Vite в dev или Nginx в prod).
 */
export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '/api')
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

// -------------------------------------------------------------
// Request Interceptor: подставляет Authorization: Bearer <accessToken>
// -------------------------------------------------------------
httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStore.get();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// -------------------------------------------------------------
// Response Interceptor: 401 Handling + Refresh Token Queue
// -------------------------------------------------------------

interface FailedRequestQueueItem {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

let isRefreshing = false;
let failedQueue: FailedRequestQueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((item) => {
    if (error) {
      item.reject(error);
    } else if (token) {
      item.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Проверка, является ли URL эндпоинтом аутентификации,
 * который должен быть исключён из общей 401-логики ретраев.
 */
export function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  // Исключаем /auth/login, /api/auth/login, /auth/refresh, /api/auth/refresh, /auth/logout
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout') ||
    url.includes('/auth/register')
  );
}

/**
 * Функция выполнения запроса на обновление токена.
 * Возвращает новый accessToken.
 */
export async function performTokenRefresh(): Promise<string> {
  const response = await refreshClient.post<{
    accessToken: string;
    user?: unknown;
  }>('/auth/refresh', {});

  const newAccessToken = response.data?.accessToken;
  if (!newAccessToken) {
    throw new Error('Ответ refresh не содержит accessToken');
  }

  tokenStore.set(newAccessToken);
  return newAccessToken;
}

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // Если нет ответа или это не 401 — отдаём ошибку как есть
    if (!error.response || error.response.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Исключаем /api/auth/login и /api/auth/refresh из этой 401-логики, чтобы не было бесконечного цикла
    if (isAuthEndpoint(originalRequest.url)) {
      return Promise.reject(error);
    }

    // Если запрос уже повторно выполнялся после рефреша и снова 401
    if (originalRequest._retry) {
      triggerAuthFailure();
      return Promise.reject(error);
    }

    // Если обновление уже выполняется другим запросом — не создаём новый, ждём в очереди
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return httpClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    // Мы первый запрос, который поймал 401 — инициируем refresh
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const newAccessToken = await performTokenRefresh();
      processQueue(null, newAccessToken);

      // Повторяем исходный запрос с новым токеном
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return httpClient(originalRequest);
    } catch (refreshError) {
      // Refresh завершился ошибкой (401 или недоступен)
      processQueue(refreshError, null);
      triggerAuthFailure();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
