import { demoSession } from './demoSession.ts';
import { beginAuthTransition, refreshAccessToken, refreshClient } from './httpClient.ts';
import { tokenStore } from './tokenStore.ts';

export interface User {
  id?: string | number;
  email: string;
  name?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
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
  const finish = await beginAuthTransition();
  try {
    if (
      import.meta.env?.DEV &&
      payload.email === 'admin@example.com' &&
      payload.password === 'password123'
    ) {
      demoSession.remember(true);
      return { ok: true, data: demoSession.signIn() };
    }

    const { data } = await refreshClient.post<AuthResponse>('/auth/login', payload);
    if (typeof data?.accessToken !== 'string' || !data.accessToken.trim()) {
      return { ok: false, error: 'Сервер не подтвердил вход.' };
    }
    demoSession.remember(false);
    tokenStore.set(data.accessToken);
    return { ok: true, data };
  } catch (error: any) {
    const serverMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      (error?.response?.status === 401 ? 'Неверный email или пароль' : null);

    return {
      ok: false,
      error: serverMessage || 'Не удалось войти. Проверьте соединение с сервером.',
    };
  } finally {
    finish();
  }
}

/**
 * Выполняет обновление токена (POST /auth/refresh).
 * Браузер автоматически прикрепляет HttpOnly cookie с refreshToken благодаря withCredentials: true.
 */
export async function refreshRequest(): Promise<AuthResponse | null> {
  if (demoSession.restore()) return demoSession.signIn();
  try {
    return await refreshAccessToken();
  } catch {
    return null;
  }
}

/**
 * Завершает сессию пользователя (POST /auth/logout).
 */
export async function logoutRequest(): Promise<void> {
  demoSession.remember(false);
  const finish = await beginAuthTransition();
  tokenStore.clear();
  try {
    await refreshClient.post('/auth/logout', {}, { timeout: 10000 });
  } catch {
    // Локальный выход работает и при недоступном API.
  } finally {
    finish();
  }
}
