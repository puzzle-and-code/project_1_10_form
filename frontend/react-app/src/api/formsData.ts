export interface FormSummary {
  id: string;
  title: string;
  description: string;
  status: string;
  responsesCount: number | null;
  updatedAt: string | null;
}

export interface CreateFormPayload {
  title: string;
  description: string;
}

export class FormOwnerError extends Error {
  constructor() {
    super('Не удалось определить владельца формы. Создание недоступно для этого аккаунта. Обратитесь к администратору.');
    this.name = 'FormOwnerError';
  }
}

export function buildCreateDraftRequest(payload: CreateFormPayload, userId: unknown) {
  // ownerId в Swagger — int32. UUID нельзя преобразовывать через parseInt:
  // это могло бы сохранить форму под чужим идентификатором.
  const ownerId = typeof userId === 'string' && /^\d+$/.test(userId) ? Number(userId) : userId;
  if (typeof ownerId !== 'number' || !Number.isInteger(ownerId) || ownerId <= 0 || ownerId > 2147483647) {
    throw new FormOwnerError();
  }
  return {
    url: '/CreationForms/draft',
    params: { ownerId },
    body: { title: payload.title.trim(), description: payload.description.trim() },
  };
}

export class CreateFormResponseError extends Error {
  constructor() {
    super('Сервер не подтвердил создание формы. Проверьте список форм перед повторной отправкой.');
    this.name = 'CreateFormResponseError';
  }
}

// ASP.NET сериализует ответ CreateDraft как { message, formId }.
export function parseCreatedForm(data: unknown, payload: CreateFormPayload): FormSummary {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new CreateFormResponseError();
  const { formId } = data as Record<string, unknown>;
  if (typeof formId !== 'number' || !Number.isInteger(formId) || formId <= 0 || formId > 2147483647) {
    throw new CreateFormResponseError();
  }
  return {
    id: String(formId),
    title: payload.title.trim(),
    description: payload.description.trim(),
    status: 'draft',
    // Эндпоинт возвращает только ID: остальные метаданные не выдумываем.
    responsesCount: null,
    updatedAt: null,
  };
}

export function mergeCreatedForms(serverForms: FormSummary[], createdForms: FormSummary[]): FormSummary[] {
  const serverById = new Map(serverForms.map((form) => [form.id, form]));
  const createdIds = new Set(createdForms.map((form) => form.id));
  return [
    ...createdForms.map((form) => serverById.get(form.id) ?? form),
    ...serverForms.filter((form) => !createdIds.has(form.id)),
  ];
}

export class FormsResponseError extends Error {
  constructor() {
    super('Не удалось прочитать список форм. Формат ответа сервера не поддерживается.');
    this.name = 'FormsResponseError';
  }
}

// Контракт GET /api/forms: массив объектов. Проверяем ответ до отрисовки,
// чтобы неверная дата или HTML вместо JSON не приводили к падению страницы.
export function parseForms(data: unknown): FormSummary[] {
  if (!Array.isArray(data)) throw new FormsResponseError();

  const ids = new Set<string>();
  return data.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new FormsResponseError();
    const form = item as Record<string, unknown>;
    const validId = (typeof form.id === 'string' && form.id.trim() !== '')
      || (typeof form.id === 'number' && Number.isSafeInteger(form.id) && form.id >= 0);

    if (
      !validId
      || typeof form.title !== 'string'
      || typeof form.status !== 'string' || !form.status.trim()
      || typeof form.updatedAt !== 'string' || !Number.isFinite(Date.parse(form.updatedAt))
      || (form.description != null && typeof form.description !== 'string')
      || (form.responsesCount != null && (
        typeof form.responsesCount !== 'number'
        || !Number.isSafeInteger(form.responsesCount) || form.responsesCount < 0
      ))
    ) throw new FormsResponseError();

    const id = String(form.id);
    if (ids.has(id)) throw new FormsResponseError();
    ids.add(id);

    return {
      id,
      title: form.title.trim() || 'Без названия',
      description: (form.description as string | null | undefined) ?? '',
      status: form.status.trim().toLowerCase(),
      responsesCount: (form.responsesCount as number | null | undefined) ?? null,
      updatedAt: form.updatedAt,
    };
  });
}
