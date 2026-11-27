import { FormsError, parseForm, type FormDto, type QuestionDto } from './formsData.ts';

export type AnswerValue = string | number | string[];
export type AnswerDrafts = Record<string, string | string[]>;
export interface FormAnswer { questionId: string; value: AnswerValue }
export interface SubmitResponsePayload { submissionId: string; answers: FormAnswer[] }
export interface ResponseReceipt { responseId: string; submittedAt: string }

export function validateAnswers(questions: QuestionDto[], drafts: AnswerDrafts) {
  const errors: Record<string, string> = {};
  const answers: FormAnswer[] = [];
  for (const question of questions) {
    const raw = drafts[question.id];
    const text = typeof raw === 'string' ? raw.trim() : '';
    const choices = Array.isArray(raw) ? [...new Set(raw)] : [];
    const optionIds = new Set(question.options.map(option => option.id));
    const empty = question.type === 'multiple_choice' ? choices.length === 0 : !text;
    if (!['short_text', 'number', 'single_choice', 'multiple_choice'].includes(question.type)) {
      errors[question.id] = 'Этот тип вопроса пока не поддерживается.';
    } else if (empty) {
      if (question.isRequired) errors[question.id] = 'Ответьте на обязательный вопрос.';
    } else if (question.type === 'number') {
      const numeric = text.replace(',', '.');
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(numeric) || !Number.isFinite(Number(numeric))) {
        errors[question.id] = 'Введите число, например 10 или 4,5.';
      } else answers.push({ questionId: question.id, value: Number(numeric) });
    } else if (question.type === 'single_choice') {
      if (!optionIds.has(text)) errors[question.id] = 'Выберите вариант из списка.';
      else answers.push({ questionId: question.id, value: text });
    } else if (question.type === 'multiple_choice') {
      if (choices.some(id => !optionIds.has(id))) errors[question.id] = 'Выберите варианты из списка.';
      else answers.push({ questionId: question.id, value: choices });
    } else answers.push({ questionId: question.id, value: text });
  }
  return { answers, errors, valid: Object.keys(errors).length === 0 };
}

export function assertAcceptingResponses(form: FormDto) {
  if (form.status === 'closed' || form.status === 'completed') throw new FormsError('Сбор ответов по этой форме завершён.', 410);
  if (form.status !== 'published') throw new FormsError('Эта форма ещё не опубликована.', 403);
  if (!form.questions?.length) throw new FormsError('В форме пока нет вопросов. Обратитесь к её автору.');
}

export function parsePublicForm(value: unknown): FormDto {
  const form = parseForm(value);
  assertAcceptingResponses(form);
  return form;
}

export function parseResponseReceipt(value: unknown): ResponseReceipt {
  const data = value as Partial<ResponseReceipt> | null;
  if (!data || typeof data.responseId !== 'string' || !data.responseId.trim() ||
      typeof data.submittedAt !== 'string' || !Number.isFinite(Date.parse(data.submittedAt))) {
    throw new FormsError('Сервер не подтвердил сохранение ответа. Попробуйте отправить ещё раз.');
  }
  return { responseId: data.responseId, submittedAt: data.submittedAt };
}
