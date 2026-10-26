export * from './tokenStore';
export * from './httpClient';
export * from './auth';

import { httpClient } from './httpClient';
import { tokenStore } from './tokenStore';

export const API_URL = (import.meta.env.VITE_API_URL ?? '')
  .trim()
  .replace(/\/+$/, '');

export type ApiResult<T> =
  | { ok: true; data: T | null }
  | { ok: false; error: string; status: number | null };

/**
 * Обертка apiRequest для обратной совместимости,
 * использующая единый httpClient (Axios) с Authorization интерцептором и withCredentials: true.
 */
export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<ApiResult<T>> {
  try {
    const url = path.startsWith('/') ? path : `/${path}`;
    const response = await httpClient.request<T>({
      url,
      method: options.method || 'GET',
      data: options.body,
      headers: options.headers,
    });

    return {
      ok: true,
      data: response.data ?? null,
    };
  } catch (error: any) {
    if (error.response?.status === 401) {
      tokenStore.clear();
      return {
        ok: false,
        error: 'Необходимо войти в аккаунт.',
        status: 401,
      };
    }

    const status = error.response?.status ?? null;
    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Ошибка запроса к API';

    return {
      ok: false,
      error: errorMsg,
      status,
    };
  }
}