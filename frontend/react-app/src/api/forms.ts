import { httpClient } from './httpClient';

export interface FormDto {
  id: string;
  title: string;
  description: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateFormPayload {
  title?: string;
  description?: string | null;
}

// Простые демо-заглушки для локального тестирования в dev-режиме без бэкенда
const DEV_MOCK_FORMS: Record<string, FormDto> = {
  '1': {
    id: '1',
    title: 'демотест1',
    description: '123123',
    status: 'draft',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 600000).toISOString(),
  },
  'demo': {
    id: 'demo',
    title: 'демотест1',
    description: '123123',
    status: 'draft',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 600000).toISOString(),
  },
  '2': {
    id: '2',
    title: 'демотест2',
    description: '456456',
    status: 'active',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 1200000).toISOString(),
  },
  'demo-active': {
    id: 'demo-active',
    title: 'демотест2',
    description: '456456',
    status: 'active',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 1200000).toISOString(),
  },
};

/**
 * Получить форму по ID: GET /api/forms/{id}
 */
export async function getFormById(id: string): Promise<FormDto> {
  try {
    const response = await httpClient.get<FormDto>(`/forms/${id}`);
    return response.data;
  } catch (error: any) {
    // 404 от реального бэкенда
    if (error?.response?.status === 404) {
      const notFoundErr = new Error('Форма не найдена');
      (notFoundErr as any).status = 404;
      throw notFoundErr;
    }

    // Если бэкенд офлайн (сетевая ошибка или 502/504 gateway proxy в vite)
    const isNetworkError =
      !error?.response ||
      error.code === 'ERR_NETWORK' ||
      error?.response?.status === 502 ||
      error?.response?.status === 504;

    if (isNetworkError) {
      // Если ID есть в демо-хранилище, отдаем его для локальной разработки
      if (DEV_MOCK_FORMS[id]) {
        return { ...DEV_MOCK_FORMS[id] };
      }
      // Если это не демо-ID и ID похож на несуществующий тестовый (например "not-found")
      if (id === 'not-found' || id === '404') {
        const notFoundErr = new Error('Форма не найдена');
        (notFoundErr as any).status = 404;
        throw notFoundErr;
      }
    }

    // В остальных случаях пробрасываем ошибку сети
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error.message ||
      'Ошибка загрузки формы';
    const netErr = new Error(message);
    (netErr as any).status = error?.response?.status;
    throw netErr;
  }
}

/**
 * Частичное обновление формы: PATCH /api/forms/{id}
 */
export async function patchForm(id: string, payload: UpdateFormPayload): Promise<FormDto> {
  try {
    const response = await httpClient.patch<FormDto>(`/forms/${id}`, payload);
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      const notFoundErr = new Error('Форма не найдена');
      (notFoundErr as any).status = 404;
      throw notFoundErr;
    }

    const isNetworkError =
      !error?.response ||
      error.code === 'ERR_NETWORK' ||
      error?.response?.status === 502 ||
      error?.response?.status === 504;

    if (isNetworkError && DEV_MOCK_FORMS[id]) {
      const existing = DEV_MOCK_FORMS[id];
      const updated: FormDto = {
        ...existing,
        title: payload.title !== undefined ? payload.title : existing.title,
        description: payload.description !== undefined ? payload.description : existing.description,
        updatedAt: new Date().toISOString(),
      };
      DEV_MOCK_FORMS[id] = updated;
      return { ...updated };
    }

    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error.message ||
      'Ошибка сохранения формы';
    const err = new Error(message);
    (err as any).status = error?.response?.status;
    throw err;
  }
}
