import { isAxiosError, type AxiosInstance } from 'axios';
import { FormsError } from './formsData.ts';
import { parsePublicForm, parseResponseReceipt, type SubmitResponsePayload } from './formResponses.ts';

export function getPublicFormsError(error: unknown): string {
  if (error instanceof FormsError) return error.message;
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 404) return 'Форма не найдена или ещё не опубликована.';
    if (status === 410) return 'Сбор ответов по этой форме завершён.';
    if (status === 401 || status === 403) return 'Форма недоступна для заполнения по этой ссылке.';
    if (status === 409) return 'Форма изменилась. Обновите страницу перед отправкой.';
    if (status === 400 || status === 422) return 'Сервер отклонил ответы. Проверьте обязательные вопросы; возможно, автор изменил форму.';
    if (status === 429) return 'Слишком много запросов. Попробуйте немного позже.';
    if (!error.response) return 'Не удалось связаться с сервером. Ответы остались в полях — попробуйте отправить снова.';
    if (status && status >= 500) return 'Сервер не смог обработать запрос. Попробуйте позже.';
  }
  return 'Не удалось выполнить запрос. Попробуйте ещё раз.';
}

export function createPublicFormsClient(http: AxiosInstance) {
  async function request<T>(action: () => Promise<T>): Promise<T> {
    try { return await action(); }
    catch (error) {
      throw new FormsError(getPublicFormsError(error), error instanceof FormsError ? error.status : isAxiosError(error) ? error.response?.status : undefined);
    }
  }
  return {
    getForm: (id: string, signal?: AbortSignal) => request(async () => {
      const { data } = await http.get<unknown>(`/public/forms/${encodeURIComponent(id)}`, { signal, timeout: 15000 });
      return parsePublicForm(data);
    }),
    submitResponse: (id: string, payload: SubmitResponsePayload) => request(async () => {
      const { data } = await http.post<unknown>(`/public/forms/${encodeURIComponent(id)}/responses`, payload, { timeout: 15000 });
      return parseResponseReceipt(data);
    }),
  };
}
