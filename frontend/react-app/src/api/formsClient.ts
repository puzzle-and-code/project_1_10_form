import { isAxiosError, type AxiosInstance } from 'axios';
import { DevSessionError } from './devAccount.ts';
import { FormsError, parseCreatedForm, parseForm, parseForms, parseQuestion, type CreateFormPayload, type CreateQuestionPayload, type UpdateFormPayload } from './formsData.ts';
export function getFormsError(error: unknown): string {
  if (error instanceof FormsError || error instanceof DevSessionError) return error.message;
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) return 'Войдите в аккаунт, чтобы открыть свои формы.';
    if (status === 403) return 'У вас нет доступа к этой форме.';
    if (status === 404 || status === 405) return 'Форма или нужная операция пока недоступна на сервере.';
    if (status && status >= 500) return 'Ошибка сервера. Попробуйте позже.';
    const message = error.response?.data?.message ?? error.response?.data?.error;
    if (typeof message === 'string') return message;
    const errors = error.response?.data?.errors;
    if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
      const messages = Object.values(errors).flat().filter((value): value is string => typeof value === 'string');
      if (messages.length) return messages.join(' ');
    }
    if (!error.response) return 'Не удалось связаться с сервером. Проверьте подключение.';
  }
  return 'Не удалось выполнить действие с формой. Попробуйте снова.';
}
export function createFormsClient(http: AxiosInstance) {
  async function request<T>(action: () => Promise<T>): Promise<T> {
    try { return await action(); }
    catch (error) {
      if (error instanceof FormsError) throw error;
      throw new FormsError(getFormsError(error), isAxiosError(error) ? error.response?.status : undefined);
    }
  }
  return {
    getForms: (signal?: AbortSignal) => request(async () => {
      const { data } = await http.get<unknown>('/forms', { signal, timeout: 15000 });
      return parseForms(data);
    }),
    createForm: (payload: CreateFormPayload) => request(async () => {
      const body = { title: payload.title.trim(), description: payload.description.trim() };
      if (!body.title || body.title.length > 200 || body.description.length > 2000) throw new FormsError('Проверьте название и описание формы.');
      const { data } = await http.post<unknown>('/forms/draft', body, { timeout: 15000 });
      return parseCreatedForm(data, body);
    }),
    getFormById: (id: string) => request(async () => {
      const { data } = await http.get<unknown>(`/forms/${encodeURIComponent(id)}`, { timeout: 15000 });
      return parseForm(data);
    }),
    patchForm: (id: string, payload: UpdateFormPayload) => request(async () => {
      const { data } = await http.patch<unknown>(`/forms/${encodeURIComponent(id)}`, payload, { timeout: 15000 });
      return parseForm(data);
    }),
    createQuestion: (id: string, payload: CreateQuestionPayload) => request(async () => {
      const body = {
        ...payload,
        type: payload.type === 'multiple_choice' ? 'multi_choice' : payload.type,
        options: payload.options.map(text => ({ text: text.trim() })),
      };
      const { data } = await http.post<unknown>(`/forms/${encodeURIComponent(id)}/questions`, body, { timeout: 15000 });
      return parseQuestion(data);
    }),
    reorderQuestions: (id: string, questionIds: string[]) => request(async () => {
      if (!questionIds.length || questionIds.some(questionId => !questionId.trim()) || new Set(questionIds).size !== questionIds.length) {
        throw new FormsError('Не удалось определить порядок вопросов. Обновите страницу.');
      }
      const { data } = await http.put<{ questions: unknown[] }>(`/forms/${encodeURIComponent(id)}/questions/reorder`, { questionIds }, { timeout: 15000 });
      if (!Array.isArray(data?.questions)) throw new FormsError('Сервер не подтвердил порядок вопросов.');
      const questions = data.questions.map(parseQuestion).sort((a, b) => a.sortOrder - b.sortOrder);
      if (questions.length !== questionIds.length || questions.some((question, index) => question.id !== questionIds[index] || question.sortOrder !== index + 1)) {
        throw new FormsError('Сервер вернул другой порядок вопросов. Обновите страницу.');
      }
      return questions;
    }),
    publishForm: (id: string) => request(async () => {
      const { data } = await http.post<unknown>(`/forms/${encodeURIComponent(id)}/publish`, {}, { timeout: 15000 });
      return parseForm(data);
    }),
  };
}
