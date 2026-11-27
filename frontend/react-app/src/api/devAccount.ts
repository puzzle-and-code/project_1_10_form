export const DEV_ACCESS_TOKEN = 'mock-dev-jwt-access-token';

export function getDevLogin(payload: { email: string; password: string }, enabled: boolean) {
  if (!enabled || payload.email !== 'admin@example.com' || payload.password !== 'password123') return null;
  return {
    accessToken: DEV_ACCESS_TOKEN,
    user: { id: 'demo-admin', email: payload.email, name: 'Admin' },
  };
}

export class DevSessionError extends Error {
  constructor() {
    super('Для работы с формами на сервере войдите в настоящий аккаунт.');
    this.name = 'DevSessionError';
  }
}
