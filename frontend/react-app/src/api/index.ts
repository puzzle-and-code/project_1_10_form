import { clearToken, getToken } from './tokenstore'

const API_URL = (import.meta.env.VITE_API_URL ?? '')
  .trim()
  .replace(/\/+$/, '')

export type ApiResult<T> =
  | { ok: true; data: T | null }
  | { ok: false; error: string; status: number | null }

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> {
  if (!API_URL) {
    return {
      ok: false,
      error: 'API пока не подключён: укажи VITE_API_URL.',
      status: null,
    }
  }

  let response: Response

  try {
    const headers = new Headers(options.headers)
    headers.set('Accept', 'application/json')

    if (typeof options.body === 'string') {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
      }
    }

    const token = getToken()

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    response = await fetch(
      `${API_URL}/${path.replace(/^\/+/, '')}`,
      { ...options, headers },
    )
  } catch {
    return {
      ok: false,
      error: 'Не удалось выполнить запрос. Проверь соединение и адрес API.',
      status: null,
    }
  }

  if (response.status === 401) {
    clearToken()

    if (window.location.pathname !== '/login') {
      window.location.assign('/login')
    }

    return {
      ok: false,
      error: 'Необходимо войти в аккаунт.',
      status: 401,
    }
  }

  if (!response.ok) {
    const error =
      response.status === 403
        ? 'Нет доступа к этому действию.'
        : response.status >= 500
          ? 'Ошибка сервера. Попробуй позже.'
          : `Запрос не выполнен: ${response.status}.`

    return { ok: false, error, status: response.status }
  }

  if (response.status === 204) {
    return { ok: true, data: null }
  }

  try {
    const data: T = await response.json()
    return { ok: true, data }
  } catch {
    return {
      ok: false,
      error: 'Сервер вернул некорректный JSON.',
      status: response.status,
    }
  }
}