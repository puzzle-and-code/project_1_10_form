import { isAxiosError } from 'axios';
import { httpClient } from './httpClient';
import { buildCreateDraftRequest, CreateFormResponseError, FormOwnerError, FormsResponseError, parseCreatedForm, parseForms } from './formsData';
import type { CreateFormPayload } from './formsData';
import { browserFormsStorage, createLocalForm, LocalFormsError, readLocalForms } from './localForms';

export type { FormSummary } from './formsData';

// Локальный режим включён явно для работы фронта до согласования API.
// Ошибка API никогда не переключает источник данных автоматически.
export const usesLocalForms = (import.meta.env.VITE_FORMS_MODE ?? 'local') === 'local';

export async function getForms(signal: AbortSignal, userId: unknown) {
  if (usesLocalForms) return readLocalForms(browserFormsStorage(), userId);
  const response = await httpClient.get<unknown>('/forms', { signal, timeout: 15000 });
  return parseForms(response.data);
}

export async function createForm(payload: CreateFormPayload, userId: unknown) {
  if (usesLocalForms) return createLocalForm(browserFormsStorage(), userId, payload);
  const request = buildCreateDraftRequest(payload, userId);
  const response = await httpClient.post<unknown>(request.url, request.body, {
    params: request.params, timeout: 15000,
  });
  return parseCreatedForm(response.data, request.body);
}

export function getCreateFormError(error: unknown): string {
  if (error instanceof CreateFormResponseError || error instanceof FormOwnerError || error instanceof LocalFormsError) return error.message;
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 400 || status === 422) return 'Сервер не принял данные. Проверьте название и описание.';
    if (status === 401) return 'Войдите в аккаунт, чтобы создать форму.';
    if (status === 403) return 'У вас нет прав на создание формы.';
    if (status === 404 || status === 405) return 'Создание форм пока недоступно. Попробуйте позже.';
    if (status === 409) return 'Не удалось сохранить форму из-за конфликта данных. Проверьте список своих форм.';
    if (status === 429) return 'Слишком много запросов. Подождите немного и повторите попытку.';
    if (status && status >= 500) return 'Ошибка сервера. Проверьте список форм перед повторной отправкой.';
    if (!error.response) return 'Не удалось получить ответ сервера. Проверьте соединение и список форм перед повторной отправкой.';
  }
  return 'Не удалось создать форму. Проверьте список форм перед повторной отправкой.';
}

export function getFormsError(error: unknown): string {
  if (error instanceof FormsResponseError || error instanceof LocalFormsError) return error.message;
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) return 'Войдите в аккаунт, чтобы посмотреть свои формы.';
    if (status === 403) return 'У вас нет доступа к этому списку форм.';
    if (status === 404) return 'Сервис списка форм пока недоступен. Попробуйте позже.';
    if (status && status >= 500) return 'Сервер временно недоступен. Попробуйте ещё раз.';
    if (!error.response) return 'Не удалось связаться с сервером. Проверьте соединение и повторите попытку.';
  }
  return 'Не удалось загрузить формы. Попробуйте ещё раз.';
}
