/**
 * In-memory хранилище Access Token.
 * Токен хранится ТОЛЬКО в оперативной памяти JS (не попадает в localStorage и sessionStorage).
 */
let accessToken: string | null = null;

type TokenChangeListener = (token: string | null) => void;
const listeners = new Set<TokenChangeListener>();

export const tokenStore = {
  get: (): string | null => accessToken,
  set: (token: string | null): void => {
    accessToken = token;
    listeners.forEach((listener) => listener(token));
  },
  clear: (): void => {
    accessToken = null;
    listeners.forEach((listener) => listener(null));
  },
  subscribe: (listener: TokenChangeListener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

// Функции для обратной совместимости со старыми импортами
export function getToken(): string | null {
  return tokenStore.get();
}

export function saveToken(token: string): void {
  tokenStore.set(token);
}

export function clearToken(): void {
  tokenStore.clear();
}