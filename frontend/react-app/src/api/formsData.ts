export type FormStatus = 'draft' | 'published' | 'completed' | string;
export type QuestionType = 'short_text' | 'number' | 'single_choice' | 'multiple_choice';
export interface CreateQuestionPayload { text: string; type: QuestionType; isRequired: boolean; options: string[] }
export interface QuestionDto extends Omit<CreateQuestionPayload, 'type' | 'options'> {
  id: string; type: string; sortOrder: number;
  options: { id: string; text: string; sortOrder: number }[];
}
export interface FormDto {
  id: string; title: string; description: string | null; status: FormStatus;
  responsesCount?: number | null; questionsCount?: number; questions?: QuestionDto[];
  publishedAt?: string; createdAt?: string; updatedAt?: string | null;
}
export type FormSummary = FormDto;
export interface CreateFormPayload { title: string; description: string }
export interface UpdateFormPayload { title?: string; description?: string | null }
export class FormsError extends Error {
  status?: number;
  constructor(message: string, status?: number) { super(message); this.name = 'FormsError'; this.status = status; }
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new FormsError('Не удалось прочитать данные формы.');
  return value as Record<string, unknown>;
}
function string(value: unknown): string {
  if (typeof value !== 'string') throw new FormsError('Не удалось прочитать данные формы.');
  return value;
}
function identifier(value: unknown): string {
  const id = string(value);
  if (!id.trim()) throw new FormsError('В ответе отсутствует ID формы или вопроса.');
  return id;
}
function optionalDate(value: unknown): string | undefined {
  if (value == null) return undefined;
  const date = string(value);
  if (!Number.isFinite(Date.parse(date))) throw new FormsError('В ответе указана некорректная дата.');
  return date;
}
export function parseQuestion(value: unknown): QuestionDto {
  const item = record(value);
  if (!Array.isArray(item.options) || typeof item.isRequired !== 'boolean' || !Number.isInteger(item.sortOrder)) throw new FormsError('Не удалось прочитать вопрос.');
  return {
    id: identifier(item.id), text: string(item.text), type: string(item.type),
    isRequired: item.isRequired, sortOrder: item.sortOrder as number,
    options: item.options.map(value => {
      const option = record(value);
      if (!Number.isInteger(option.sortOrder)) throw new FormsError('Не удалось прочитать вариант ответа.');
      return { id: identifier(option.id), text: string(option.text), sortOrder: option.sortOrder as number };
    }).sort((a, b) => a.sortOrder - b.sortOrder),
  };
}
export function parseForm(value: unknown): FormDto {
  const item = record(value);
  const status = string(item.status).trim().toLowerCase();
  if (!status) throw new FormsError('В ответе отсутствует статус формы.');
  for (const field of ['questionsCount', 'responsesCount']) {
    if (item[field] != null && (!Number.isSafeInteger(item[field]) || (item[field] as number) < 0)) throw new FormsError('В ответе указан некорректный счётчик.');
  }
  if (item.questions !== undefined && !Array.isArray(item.questions)) throw new FormsError('Не удалось прочитать вопросы формы.');
  const questions = (item.questions as unknown[] | undefined)?.map(parseQuestion).sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    id: identifier(item.id), title: string(item.title).trim() || 'Без названия',
    description: item.description == null ? null : string(item.description),
    status: status === 'completed' || status === 'archived' ? 'closed' : status === 'active' ? 'published' : status,
    responsesCount: (item.responsesCount as number | undefined) ?? null,
    questionsCount: questions?.length ?? item.questionsCount as number | undefined,
    questions, createdAt: optionalDate(item.createdAt), updatedAt: optionalDate(item.updatedAt) ?? null,
    publishedAt: optionalDate(item.publishedAt),
  };
}
export function parseForms(value: unknown): FormDto[] {
  if (!Array.isArray(value)) throw new FormsError('Не удалось прочитать список форм.');
  const forms = value.map(parseForm);
  if (new Set(forms.map(form => form.id)).size !== forms.length) throw new FormsError('В списке повторяются ID форм.');
  return forms;
}
export function parseCreatedForm(value: unknown, payload: CreateFormPayload): FormDto {
  const id = identifier(record(value).formId);
  return { id, title: payload.title.trim(), description: payload.description.trim(), status: 'draft', responsesCount: null, updatedAt: null };
}
export function mergeCreatedForms(serverForms: FormDto[], createdForms: FormDto[]): FormDto[] {
  const serverById = new Map(serverForms.map(form => [form.id, form]));
  const createdIds = new Set(createdForms.map(form => form.id));
  return [...createdForms.map(form => serverById.get(form.id) ?? form), ...serverForms.filter(form => !createdIds.has(form.id))];
}
