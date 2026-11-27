import { tokenStore } from './tokenStore.ts';

const SESSION_KEY = 'form-builder:demo-session';
const DEMO_TOKEN = 'mock-dev-jwt-access-token';

export const demoSession = {
  isActive: () => import.meta.env?.DEV && tokenStore.get() === DEMO_TOKEN,
  remember(active: boolean) {
    if (!import.meta.env?.DEV) return;
    try {
      if (active) window.sessionStorage.setItem(SESSION_KEY, '1');
      else window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // При отключённом хранилище демо работает до перезагрузки.
    }
  },
  restore() {
    if (!import.meta.env?.DEV) return false;
    try {
      return window.sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      return false;
    }
  },
  signIn() {
    tokenStore.set(DEMO_TOKEN);
    return {
      accessToken: DEMO_TOKEN,
      user: { id: 'demo-admin', email: 'admin@example.com', name: 'Admin' },
    };
  },
};
