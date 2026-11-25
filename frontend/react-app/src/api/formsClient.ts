import { isAxiosError, type AxiosInstance } from 'axios';
import { createDemoFormsStore } from './demoForms.ts';
import { FormsError, parseCreatedForm, parseForm, parseForms, parseQuestion, type CreateFormPayload, type CreateQuestionPayload, type FormDto, type UpdateFormPayload } from './formsData.ts';
type DemoStore = ReturnType<typeof createDemoFormsStore>;
export function getFormsError(error: unknown): string {
  if (error instanceof FormsError) return error.message;
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) return 'Войдите в аккаунт, чтобы открыть свои формы.';
    if (status === 403) return 'У вас нет доступа к этой форме.';
    if (status === 404 || status === 405) return 'Форма или нужная операция пока недоступна на сервере.';
    if (status && status >= 500) return 'Ошибка сервера. Попробуйте позже.';
    const message = error.response?.data?.message ?? error.response?.data?.error;
    if (typeof message === 'string') return message;
    if (!error.response) return 'Не удалось связаться с сервером. Проверьте подключение.';
  }
  return 'Не удалось выполнить действие с формой. Попробуйте снова.';
}
// Демо выбирается явно по тестовой сессии, ошибки реального API не подменяются успехом.
export function createFormsClient(http: AxiosInstance, demo: () => DemoStore | null) {
  let savedChanges = new Map<string, Pick<FormDto, 'title' | 'updatedAt'>>();

  async function request<T>(action: () => Promise<T>): Promise<T> {
    try { return await action(); }
    catch (error) {
      if (error instanceof FormsError) throw error;
      throw new FormsError(getFormsError(error), isAxiosError(error) ? error.response?.status : undefined);
    }
  }
  return {
    clearFormListChanges: () => { savedChanges = new Map(); },
    getForms: (signal?: AbortSignal) => request(async () => {
      const store = demo();
      if (store) return store.list();
      const changes = savedChanges;
      const { data } = await http.get<unknown>('/forms', { signal, timeout: 15000 });
      return parseForms(data).map(form => {
        const saved = changes.get(form.id);
        if (!saved?.updatedAt || (form.updatedAt && Date.parse(form.updatedAt) >= Date.parse(saved.updatedAt))) {
          return form;
        }
        // PATCH может вернуть дату раньше, чем она появится в списке.
        return { ...form, ...saved };
      });
    }),
    createForm: (payload: CreateFormPayload) => request(async () => {
      const body = { title: payload.title.trim(), description: payload.description.trim() };
      if (!body.title || body.title.length > 200 || body.description.length > 2000) throw new FormsError('Проверьте название и описание формы.');
      const store = demo();
      if (store) return store.create(body);
      const { data } = await http.post<unknown>('/forms/draft', body, { timeout: 15000 });
      return parseCreatedForm(data, body);
    }),
    getFormById: (id: string) => request(async () => {
      const store = demo();
      if (store) return store.get(id);
      const { data } = await http.get<unknown>(`/forms/${encodeURIComponent(id)}`, { timeout: 15000 });
      return parseForm(data);
    }),
    patchForm: (id: string, payload: UpdateFormPayload) => request(async () => {
      const store = demo();
      if (store) return store.patch(id, payload);
      const changes = savedChanges;
      const { data } = await http.patch<unknown>(`/forms/${encodeURIComponent(id)}`, payload, { timeout: 15000 });
      const updated = parseForm(data);
      const previousDate = changes.get(updated.id)?.updatedAt;
      if (updated.updatedAt && (!previousDate || Date.parse(updated.updatedAt) >= Date.parse(previousDate))) {
        changes.set(updated.id, { title: updated.title, updatedAt: updated.updatedAt });
      }
      return updated;
    }),
    createQuestion: (id: string, payload: CreateQuestionPayload) => request(async () => {
      const store = demo();
      if (store) return store.addQuestion(id, payload);
      const { data } = await http.post<unknown>(`/forms/${encodeURIComponent(id)}/questions`, payload, { timeout: 15000 });
      return parseQuestion(data);
    }),
    reorderQuestions: (id: string, questionIds: string[]) => request(async () => {
      const store = demo();
      if (store) return store.reorderQuestions(id, questionIds);
      const { data } = await http.patch<{ questions: unknown[] }>(`/forms/${encodeURIComponent(id)}/questions/order`, { questionIds }, { timeout: 15000 });
      if (!Array.isArray(data?.questions)) throw new FormsError('Сервер не подтвердил порядок вопросов.');
      const questions = data.questions.map(parseQuestion).sort((a, b) => a.sortOrder - b.sortOrder);
      if (questions.length !== questionIds.length || questions.some((question, index) => question.id !== questionIds[index])) {
        throw new FormsError('Сервер вернул другой порядок вопросов. Обновите страницу.');
      }
      return questions;
    }),
    publishForm: (id: string) => request(async () => {
      const store = demo();
      if (store) return store.publish(id);
      const { data } = await http.post<unknown>(`/forms/${encodeURIComponent(id)}/publish`, {}, { timeout: 15000 });
      return parseForm(data);
    }),
  };
}
