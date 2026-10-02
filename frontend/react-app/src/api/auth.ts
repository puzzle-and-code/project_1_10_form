// Заглушка

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResult {
  ok: boolean;
  /** Текст ошибки, если ok === false */
  error?: string;
  /** Данные при успехе */
  data?: { token: string };
}

const MOCK_DELAY_MS = 1200;

const MOCK_USER = {
  email: 'admin@example.com',
  password: 'password123',
};

/**
 * Типа POST /api/auth/login
 */
export async function loginRequest(payload: LoginPayload): Promise<LoginResult> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

  if (
    payload.email === MOCK_USER.email &&
    payload.password === MOCK_USER.password
  ) {
    return { ok: true, data: { token: 'mock-token-abc123' } };
  }

  return { ok: false, error: 'Неверный email или пароль' };
}
