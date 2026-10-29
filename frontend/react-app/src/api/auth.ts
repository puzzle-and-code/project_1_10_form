import { isAxiosError } from 'axios';
import { httpClient, refreshClient } from './httpClient';
import { tokenStore } from './tokenStore';
import { loginBody, registrationBody, type LoginPayload, type RegisterPayload } from './authContract';
export type { LoginPayload, RegisterPayload } from './authContract';

export interface User {
  id?: string | number;
  email: string;
  name?: string;
}

export interface AuthResponse {
  accessToken: string;
  user?: User;
}

export interface LoginResult {
  ok: boolean;
  error?: string;
  data?: AuthResponse;
}

/**
 * Выполняет вход в систему (POST /auth/login).
 * Бэкенд возвращает { accessToken, user } и устанавливает HttpOnly cookie с refreshToken.
 */
export async function loginRequest(payload: LoginPayload): Promise<LoginResult> {
  const body = loginBody(payload);

  try {
    const response = await httpClient.post<AuthResponse>('/auth/login', body, { timeout: 15000 });

    if (typeof response.data?.accessToken !== 'string' || !response.data.accessToken) {
      return { ok: false, error: 'Сервер не подтвердил вход. Попробуйте ещё раз.' };
    }
    tokenStore.set(response.data.accessToken);

    return {
      ok: true,
      data: response.data,
    };
  } catch (error: unknown) {
    return {
      ok: false,
      error: authErrorMessage(error, 'Не удалось войти. Проверьте соединение с сервером.'),
    };
  }
}

function authErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) return fallback;
  if (error.response?.status === 401) return 'Неверный email или пароль.';
  const data: unknown = error.response?.data;
  if (data && typeof data === 'object') {
    const details = data as Record<string, unknown>;
    if (typeof details.message === 'string') return details.message;
    if (typeof details.error === 'string') return details.error;
    if (details.errors && typeof details.errors === 'object') {
      const messages = Object.values(details.errors).flat().filter((value) => typeof value === 'string');
      if (messages.length > 0) return messages.join(' ');
    }
  }
  return fallback;
}

export async function registerRequest(payload: RegisterPayload): Promise<{ ok: boolean; error?: string }> {
  try {
    await httpClient.post('/auth/register', registrationBody(payload), { timeout: 15000 });
    return { ok: true };
  } catch (error: unknown) {
    return {
      ok: false,
      error: authErrorMessage(error, 'Не удалось зарегистрироваться. Проверьте данные и соединение с сервером.'),
    };
  }
}

/**
 * Выполняет обновление токена (POST /auth/refresh).
 * Браузер автоматически прикрепляет HttpOnly cookie с refreshToken благодаря withCredentials: true.
 */
export async function refreshRequest(): Promise<AuthResponse | null> {
  try {
    const response = await refreshClient.post<AuthResponse>('/auth/refresh', {});

    if (response.data?.accessToken) {
      tokenStore.set(response.data.accessToken);
      return response.data;
    }
    return null;
  } catch {
    tokenStore.clear();
    return null;
  }
}

/**
 * Завершает сессию пользователя (POST /auth/logout).
 * Независимо от ответа бэкенда токен в памяти клиента будет очищен.
 */
export async function logoutRequest(): Promise<void> {
  try {
    await httpClient.post('/auth/logout', {});
  } catch {
    // Даже если запрос упал (бэк недоступен или ошибка 500),
    // клиент продолжает процедуру локального логаута.
  } finally {
    tokenStore.clear();
  }
}
