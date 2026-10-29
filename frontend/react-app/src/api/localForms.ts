import { parseForms, type CreateFormPayload, type FormSummary } from './formsData.ts';

type FormsStorage = Pick<Storage, 'getItem' | 'setItem'>;

export class LocalFormsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LocalFormsError';
  }
}

export function localFormsKey(ownerId: unknown): string {
  if ((typeof ownerId !== 'string' || !ownerId.trim())
    && (typeof ownerId !== 'number' || !Number.isSafeInteger(ownerId) || ownerId <= 0)) {
    throw new LocalFormsError('Не удалось определить аккаунт. Войдите снова, чтобы открыть свои черновики.');
  }
  return `form-builder:local-forms:v1:${encodeURIComponent(String(ownerId))}`;
}

export function browserFormsStorage(): FormsStorage {
  try {
    return window.localStorage;
  } catch {
    throw new LocalFormsError('Браузер запретил доступ к хранилищу. Разрешите сохранение данных для этого сайта.');
  }
}

export function readLocalForms(storage: FormsStorage, ownerId: unknown): FormSummary[] {
  const key = localFormsKey(ownerId);
  let saved: string | null;
  try {
    saved = storage.getItem(key);
  } catch {
    throw new LocalFormsError('Не удалось открыть хранилище браузера. Проверьте настройки сохранения данных сайта.');
  }
  if (saved === null) return [];

  try {
    const data: unknown = JSON.parse(saved);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid storage');
    const record = data as Record<string, unknown>;
    if (record.version !== 1) throw new Error('Unsupported storage version');
    const forms = parseForms(record.forms);
    if (forms.some((form) => !form.id.startsWith('local-') || form.status !== 'draft')) {
      throw new Error('Invalid local draft');
    }
    return forms;
  } catch {
    // Не затираем повреждённые данные пустым списком при следующем создании.
    throw new LocalFormsError('Не удалось прочитать сохранённые черновики. Данные в браузере не изменены.');
  }
}

export function createLocalForm(storage: FormsStorage, ownerId: unknown, payload: CreateFormPayload): FormSummary {
  const title = payload.title.trim();
  const description = payload.description.trim();
  if (!title || title.length > 200 || description.length > 2000) {
    throw new LocalFormsError('Укажите название до 200 символов и описание до 2000 символов.');
  }
  const forms = readLocalForms(storage, ownerId);
  const form: FormSummary = {
    id: `local-${crypto.randomUUID()}`,
    title,
    description,
    status: 'draft',
    responsesCount: 0,
    updatedAt: new Date().toISOString(),
  };
  try {
    storage.setItem(localFormsKey(ownerId), JSON.stringify({ version: 1, forms: [form, ...forms] }));
  } catch {
    throw new LocalFormsError('Браузер не смог сохранить черновик: хранилище заполнено или недоступно. Введённый текст остался в окне.');
  }
  return form;
}
