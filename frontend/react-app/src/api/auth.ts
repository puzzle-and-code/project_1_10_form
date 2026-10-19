import { httpClient, refreshClient } from './httpClient';
import { tokenStore } from './tokenStore';

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
  // Тестовые данные для локальной разработки, пока бэкенд не реализовал ручки
  if (
    payload.email === 'admin@example.com' &&
    payload.password === 'password123'
  ) {
    const mockToken = 'mock-dev-jwt-access-token';
    tokenStore.set(mockToken);
    return {
      ok: true,
      data: {
        accessToken: mockToken,
        user: { email: payload.email, name: 'Admin (Dev Mode)' },
      },
    };
  }

  try {
    const response = await httpClient.post<AuthResponse>('/auth/login', payload);

    if (response.data?.accessToken) {
      tokenStore.set(response.data.accessToken);
    }

    return {
      ok: true,
      data: response.data,
    };
  } catch (error: any) {
    const serverMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      (error?.response?.status === 401 ? 'Неверный email или пароль' : null);

    return {
      ok: false,
      error: serverMessage || 'Не удалось войти. Проверьте соединение с сервером.',
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
