import { FormsError, parseForms, type FormDto, type CreateFormPayload, type CreateQuestionPayload, type QuestionDto, type UpdateFormPayload } from './formsData.ts';
import { assertAcceptingResponses, parseStoredResponses, validateAnswers, type StoredResponse, type SubmitResponsePayload } from './formResponses.ts';
export const DEMO_FORMS_KEY = 'form-builder:demo-forms:v1';
type StorageAdapter = Pick<Storage, 'getItem' | 'setItem'>;
interface DemoData { version: 1; forms: FormDto[]; responses: StoredResponse[] }
const aliases: Record<string, string> = { demo: '1', 'demo-active': '2', 'demo-empty': '3' };
function seedForms(): FormDto[] {
  const now = new Date().toISOString();
  const question = (id: string, text: string): QuestionDto => ({ id, text, type: 'short_text', isRequired: true, sortOrder: 0, options: [] });
  return [
    { id: '1', title: 'Обратная связь по курсу', description: 'Поделитесь впечатлениями о занятиях.', status: 'draft', questions: [question('demo-question-1', 'Что вам понравилось?')], responsesCount: 0, createdAt: now, updatedAt: now },
    { id: '2', title: 'Опрос команды', description: 'Поделитесь мнением о работе команды.', status: 'published', questions: [question('demo-question-2', 'Что можно улучшить?')], responsesCount: 0, publishedAt: now, createdAt: now, updatedAt: now },
    { id: '3', title: 'Новая анкета', description: 'Черновик без вопросов.', status: 'draft', questions: [], responsesCount: 0, createdAt: now, updatedAt: now },
  ];
}
// Один источник данных для списка, редактора, вопросов и тестовой публикации.
export function createDemoFormsStore(storage: StorageAdapter) {
  function read(): DemoData {
    let saved: string | null;
    try { saved = storage.getItem(DEMO_FORMS_KEY); }
    catch { throw new FormsError('Браузер запретил чтение сохранённых форм.'); }
    if (saved === null) { const data: DemoData = { version: 1, forms: seedForms(), responses: [] }; write(data); return data; }
    try {
      const data = JSON.parse(saved);
      if (data?.version !== 1) throw new Error('Unsupported storage version');
      const forms = parseForms(data.forms, true);
      // Обновляем только прежнюю стандартную подпись, не затрагивая текст пользователя.
      const teamForm = forms.find(form => form.id === '2' && form.description === 'Тестовая опубликованная форма.');
      if (teamForm) teamForm.description = 'Поделитесь мнением о работе команды.';
      return { version: 1, forms, responses: parseStoredResponses(data.responses) };
    } catch { throw new FormsError('Не удалось прочитать формы. Сохранённые данные не изменены.'); }
  }
  function write(data: DemoData) {
    try { storage.setItem(DEMO_FORMS_KEY, JSON.stringify(data)); }
    catch { throw new FormsError('Не удалось сохранить форму. Проверьте свободное место и настройки браузера.'); }
  }
  function visibleForm(form: FormDto) {
    const questions = form.questions?.filter(question => !question.deletedAt);
    return { ...form, questions, questionsCount: questions?.length ?? form.questionsCount };
  }

  function get(id: string) {
    const form = read().forms.find(item => item.id === (aliases[id] ?? id));
    if (!form) throw new FormsError('Форма не найдена', 404);
    return visibleForm(form);
  }
  function update(id: string, change: (form: FormDto) => FormDto) {
    const data = read();
    const forms = data.forms;
    const index = forms.findIndex(form => form.id === (aliases[id] ?? id));
    if (index === -1) throw new FormsError('Форма не найдена', 404);
    const updated = change(forms[index]);
    forms[index] = { ...updated, updatedAt: new Date().toISOString() };
    write(data);
    return visibleForm(forms[index]);
  }
  return {
    list: () => read().forms.map(visibleForm), get,
    getPublic(id: string) {
      const form = get(id);
      assertAcceptingResponses(form);
      return form;
    },
    submitResponse(id: string, payload: SubmitResponsePayload) {
      const data = read();
      const form = data.forms.find(item => item.id === (aliases[id] ?? id));
      if (!form) throw new FormsError('Форма не найдена.', 404);
      if (!payload.submissionId.trim()) throw new FormsError('Не указан идентификатор отправки.');
      const previous = data.responses.find(item => item.formId === form.id && item.submissionId === payload.submissionId);
      if (previous) {
        if (JSON.stringify(previous.answers) !== JSON.stringify(payload.answers)) throw new FormsError('Этот идентификатор отправки уже использован для другого ответа.', 409);
        return { responseId: previous.responseId, submittedAt: previous.submittedAt };
      }
      const currentForm = visibleForm(form);
      assertAcceptingResponses(currentForm);
      const questions = currentForm.questions ?? [];
      const questionIds = new Set(questions.map(question => question.id));
      if (new Set(payload.answers.map(answer => answer.questionId)).size !== payload.answers.length || payload.answers.some(answer => !questionIds.has(answer.questionId))) {
        throw new FormsError('В ответе повторяются вопросы или есть неизвестный вопрос.', 422);
      }
      const drafts = Object.fromEntries(payload.answers.map(answer => [answer.questionId, typeof answer.value === 'number' ? String(answer.value) : answer.value]));
      const result = validateAnswers(questions, drafts);
      if (!result.valid) throw new FormsError('Проверьте ответы. Если автор изменил вопросы, обновите страницу.', 422);
      const receipt = { responseId: crypto.randomUUID(), submittedAt: new Date().toISOString() };
      data.responses.push({ ...receipt, submissionId: payload.submissionId, formId: form.id, answers: result.answers });
      form.responsesCount = (form.responsesCount ?? 0) + 1;
      // Ответ и счётчик записываются вместе; при ошибке нет ложного успеха.
      write(data);
      return receipt;
    },
    deleteQuestion(id: string, questionId: string) {
      update(id, form => {
        if (form.status === 'closed') throw new FormsError('Сбор ответов завершён.', 400);
        const questions = form.questions ?? [];
        if (!questions.some(question => question.id === questionId && !question.deletedAt)) {
          throw new FormsError('Вопрос не найден.', 404);
        }
        const deletedAt = new Date().toISOString();
        return {
          ...form,
          questions: questions.map(question => question.id === questionId ? { ...question, deletedAt } : question),
        };
      });
    },
    reorderQuestions(id: string, questionIds: string[]) {
      return update(id, form => {
        if (form.status === 'closed') throw new FormsError('Сбор ответов завершён.');
        const questions = form.questions ?? [];
        const byId = new Map(questions.filter(question => !question.deletedAt).map(question => [question.id, question]));
        if (questionIds.length !== byId.size || new Set(questionIds).size !== byId.size || questionIds.some(id => !byId.has(id))) {
          throw new FormsError('Список вопросов изменился. Обновите страницу и попробуйте снова.', 409);
        }
        return {
          ...form,
          questions: [
            ...questions.filter(question => question.deletedAt),
            ...questionIds.map((id, sortOrder) => ({ ...byId.get(id)!, sortOrder })),
          ],
        };
      }).questions ?? [];
    },
    create(payload: CreateFormPayload) {
      const title = payload.title.trim();
      if (!title || title.length > 200 || payload.description.length > 2000) throw new FormsError('Проверьте название и описание формы.');
      const now = new Date().toISOString();
      const form: FormDto = { id: `demo-${crypto.randomUUID()}`, title, description: payload.description.trim(), status: 'draft', questions: [], responsesCount: 0, createdAt: now, updatedAt: now };
      const data = read();
      data.forms.unshift(form);
      write(data);
      return form;
    },
    patch(id: string, payload: UpdateFormPayload) {
      return update(id, form => {
        const title = (payload.title ?? form.title).trim();
        const description = payload.description === undefined ? form.description : payload.description;
        if (!title || title.length > 200 || (description?.length ?? 0) > 2500) throw new FormsError('Проверьте название и описание формы.');
        return { ...form, title, description };
      });
    },
    addQuestion(id: string, payload: CreateQuestionPayload): QuestionDto {
      let created!: QuestionDto;
      update(id, form => {
        if (form.status === 'closed') throw new FormsError('Сбор ответов завершён.');
        const options = payload.options.map(text => text.trim()).filter(Boolean);
        const needsOptions = ['single_choice', 'multiple_choice'].includes(payload.type);
        if (!payload.text.trim() || (needsOptions && options.length < 2)) throw new FormsError('Заполните текст вопроса и варианты ответа.');
        const questions = form.questions ?? [];
        created = { id: `demo-question-${crypto.randomUUID()}`, text: payload.text.trim(), type: payload.type, isRequired: payload.isRequired, sortOrder: questions.reduce((last, question) => Math.max(last, question.sortOrder), -1) + 1,
          options: needsOptions ? options.map((text, sortOrder) => ({ id: crypto.randomUUID(), text, sortOrder })) : [] };
        return { ...form, questions: [...questions, created], questionsCount: questions.length + 1 };
      });
      return created;
    },
    publish(id: string) {
      return update(id, form => {
        if (form.status !== 'draft') throw new FormsError('Опубликовать можно только черновик.');
        if (!form.questions?.some(question => !question.deletedAt)) throw new FormsError('Добавьте хотя бы один вопрос перед публикацией.');
        return { ...form, status: 'published', publishedAt: new Date().toISOString() };
      });
    },
  };
}
