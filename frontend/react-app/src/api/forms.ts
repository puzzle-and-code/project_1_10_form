import { httpClient } from './httpClient';

export type FormStatus = 'draft' | 'published' | 'completed' | string;

export interface FormDto {
  id: string;
  title: string;
  description: string | null;
  status: FormStatus;
  questionsCount?: number;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateFormPayload {
  title?: string;
  description?: string | null;
}

// Простые демо-заглушки для локального тестирования в dev-режиме без бэкенда
const DEV_MOCK_FORMS: Record<string, FormDto> = {
  // Форма 1: черновик с вопросами (кнопка «Опубликовать» активна)
  '1': {
    id: '1',
    title: 'демотест1',
    description: '123123',
    status: 'draft',
    questionsCount: 3,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 600000).toISOString(),
  },
  'demo': {
    id: 'demo',
    title: 'демотест1',
    description: '123123',
    status: 'draft',
    questionsCount: 3,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 600000).toISOString(),
  },
  // Форма 2: уже опубликованная форма (видна ссылка /f/2, кнопки «Опубликовать» нет)
  '2': {
    id: '2',
    title: 'демотест2',
    description: '456456',
    status: 'published',
    questionsCount: 5,
    publishedAt: new Date(Date.now() - 1800000).toISOString(),
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 1200000).toISOString(),
  },
  'demo-active': {
    id: 'demo-active',
    title: 'демотест2',
    description: '456456',
    status: 'published',
    questionsCount: 5,
    publishedAt: new Date(Date.now() - 1800000).toISOString(),
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 1200000).toISOString(),
  },
  // Форма 3: черновик БЕЗ вопросов (кнопка «Опубликовать» неактивна и есть пояснение)
  '3': {
    id: '3',
    title: 'демо-пустая',
    description: 'Черновик без вопросов',
    status: 'draft',
    questionsCount: 0,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date(Date.now() - 300000).toISOString(),
  },
  'demo-empty': {
    id: 'demo-empty',
    title: 'демо-пустая',
    description: 'Черновик без вопросов',
    status: 'draft',
    questionsCount: 0,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date(Date.now() - 300000).toISOString(),
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
      if (DEV_MOCK_FORMS[id]) {
        return { ...DEV_MOCK_FORMS[id] };
      }
      if (id === 'not-found' || id === '404') {
        const notFoundErr = new Error('Форма не найдена');
        (notFoundErr as any).status = 404;
        throw notFoundErr;
      }
    }

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

/**
 * Публикация формы: POST /api/forms/{id}/publish
 * Переводит форму из draft в published
 */
export async function publishForm(id: string): Promise<FormDto> {
  try {
    const response = await httpClient.post<FormDto>(`/forms/${id}/publish`, {});
    return response.data;
  } catch (error: any) {
    if (error?.response?.data?.message || error?.response?.data?.error) {
      const msg = error.response.data.message || error.response.data.error;
      const err = new Error(msg);
      (err as any).status = error.response.status;
      throw err;
    }

    const isNetworkError =
      !error?.response ||
      error.code === 'ERR_NETWORK' ||
      error?.response?.status === 404 ||
      error?.response?.status === 502 ||
      error?.response?.status === 504;

    if (isNetworkError && DEV_MOCK_FORMS[id]) {
      const existing = DEV_MOCK_FORMS[id];

      // Проверка на количество вопросов в моке
      if ((existing.questionsCount ?? 0) === 0) {
        throw new Error('Нельзя опубликовать форму без вопросов.');
      }

      const published: FormDto = {
        ...existing,
        status: 'published',
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      DEV_MOCK_FORMS[id] = published;
      return { ...published };
    }

    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error.message ||
      'Не удалось опубликовать форму';
    const err = new Error(message);
    (err as any).status = error?.response?.status;
    throw err;
  }
}
