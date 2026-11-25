import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  Alert, Button, Chip, EmptyState, Input, Label, Separator,
  Spinner, Surface, TextField, ToggleButton, ToggleButtonGroup,
} from '@heroui/react';
import { getForms, getFormsError, isDemoFormsSession, type FormSummary } from '../../api/forms';
import { DEMO_FORMS_KEY } from '../../api/demoForms';
import { useAuth } from '../../context';
import { mergeCreatedForms } from '../../api/formsData';
import CreateForm from '../CreateForm';

const filters = [
  { value: 'all', label: 'Все' },
  { value: 'published', label: 'Опубликованы' },
  { value: 'draft', label: 'Черновики' },
  { value: 'closed', label: 'Закрыты' },
];
const statuses: Record<string, { label: string; color: 'success' | 'warning' | 'default' }> = {
  published: { label: 'Опубликована', color: 'success' },
  draft: { label: 'Черновик', color: 'warning' },
  closed: { label: 'Закрыта', color: 'default' },
  deleted: { label: 'Удалена', color: 'default' },
};
const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium', timeStyle: 'short',
});
const normalize = (value: string) => value.trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');

function StatusChip({ status }: { status: string }) {
  const display = Object.prototype.hasOwnProperty.call(statuses, status)
    ? statuses[status]
    : { label: 'Неизвестный статус', color: 'default' as const };
  return <Chip color={display.color} variant="soft" size="sm"><Chip.Label>{display.label}</Chip.Label></Chip>;
}

function FormIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="3" width="14" height="18" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 8h6M9 12h6M9 16h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function FormsPage() {
  const { user } = useAuth();
  // Смена аккаунта сбрасывает список, включая только что созданные формы.
  return <FormsContent key={JSON.stringify([user?.id, user?.email])} />;
}

function FormsContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isCreating = searchParams.get('create') === '1';
  const [attempt, setAttempt] = useState(0);
  const requestKey = String(attempt);
  const [result, setResult] = useState<{
    key: string; forms: FormSummary[]; error: string | null;
  } | null>(null);
  const currentResult = result?.key === requestKey ? result : null;
  const isLoading = currentResult === null;
  const [createdForms, setCreatedForms] = useState<FormSummary[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const forms = mergeCreatedForms(currentResult?.forms ?? [], createdForms);
  const error = currentResult?.error ?? null;
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    const controller = new AbortController();

    async function loadForms() {
      try {
        const data = await getForms(controller.signal);
        if (!controller.signal.aborted) setResult({ key: requestKey, forms: data, error: null });
      } catch (cause) {
        if (!controller.signal.aborted) setResult({ key: requestKey, forms: [], error: getFormsError(cause) });
      }
    }

    void loadForms();
    return () => controller.abort();
  }, [requestKey]);

  function reloadForms() {
    setAttempt((value) => value + 1);
  }

  useEffect(() => {
    if (!isDemoFormsSession()) return;
    const refresh = (event: StorageEvent) => {
      if (event.key === DEMO_FORMS_KEY) setAttempt(value => value + 1);
    };
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);

  function openCreation() {
    setNotice(null);
    setSearchParams((params) => { params.set('create', '1'); return params; });
  }

  function closeCreation() {
    setSearchParams((params) => { params.delete('create'); return params; }, { replace: true });
  }

  function handleCreated(form: FormSummary) {
    setCreatedForms((previous) => [form, ...previous.filter((item) => item.id !== form.id)]);
    setQuery('');
    setStatus('all');
    setNotice(`Форма «${form.title}» создана как черновик.`);
    closeCreation();
  }

  const normalizedQuery = normalize(query);
  const visibleForms = forms
    .filter((form) => (status === 'all' || form.status === status) && normalize(form.title).includes(normalizedQuery))
    .sort((a, b) => {
      if (!a.updatedAt) return b.updatedAt ? 1 : 0;
      if (!b.updatedAt) return -1;
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    });
  function resetFilters() {
    setQuery('');
    setStatus('all');
  }

  return (
    <section className="flex flex-col gap-6 py-3" aria-labelledby="forms-title">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 id="forms-title" className="text-3xl font-semibold tracking-tight">Мои формы</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" isDisabled={isLoading} onPress={reloadForms}>
            Обновить
          </Button>
          <Button onPress={openCreation}>
            <span aria-hidden="true" className="text-xl leading-none">+</span>Создать форму
          </Button>
        </div>
      </div>
      <Separator />

      {notice && <Alert status="success" role="status">
        <Alert.Indicator />
        <Alert.Content><Alert.Description>{notice}</Alert.Description></Alert.Content>
      </Alert>}

      {isLoading && forms.length === 0 ? (
        <div role="status" className="flex min-h-72 flex-col items-center justify-center gap-3">
          <Spinner aria-hidden="true" />
          <p>Загружаем ваши формы…</p>
        </div>
      ) : error && forms.length === 0 ? (
        <EmptyState className="min-h-72 gap-4 rounded-2xl border border-border p-8 text-center">
          <div role="alert">
            <h2 className="mb-2 text-xl font-semibold">Не удалось загрузить формы</h2>
            <p className="text-muted">{error}</p>
          </div>
          <Button onPress={reloadForms}>Повторить</Button>
        </EmptyState>
      ) : (
        <>
          {error && <Alert status="warning" role="alert">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Не удалось загрузить полный список</Alert.Title>
              <Alert.Description>{error} Сейчас показаны формы, созданные в этой сессии.</Alert.Description>
            </Alert.Content>
          </Alert>}
          {isLoading && <p role="status" className="text-sm text-muted">Обновляем список…</p>}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <TextField value={query} onChange={setQuery} className="w-full sm:max-w-xs">
              <Label>Поиск по названию</Label>
              <Input type="search" placeholder="Например, опрос команды" className="w-full" />
            </TextField>
            <ToggleButtonGroup
              aria-label="Статус формы" selectionMode="single" disallowEmptySelection
              selectedKeys={[status]} size="sm" isDetached className="flex-wrap"
              onSelectionChange={(keys) => {
                const selected = filters.find((filter) => keys.has(filter.value));
                if (selected) setStatus(selected.value);
              }}
            >
              {filters.map((filter) => <ToggleButton key={filter.value} id={filter.value}>{filter.label}</ToggleButton>)}
            </ToggleButtonGroup>
          </div>
          <p role="status" className="text-sm text-muted">Показано: {visibleForms.length} из {forms.length}</p>

          {visibleForms.length > 0 ? (
            <ul aria-label="Список форм" className="list-none divide-y divide-border rounded-2xl border border-border bg-surface p-0">
              {visibleForms.map((form) => (
                <li key={form.id}>
                  <Link
                    to={`/forms/${encodeURIComponent(form.id)}`}
                    className="grid items-center gap-x-5 gap-y-3 rounded-xl px-5 py-4 transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent sm:grid-cols-[minmax(0,1fr)_8rem_5rem_11rem]"
                  >
                    <h2 className="min-w-0 break-words font-semibold">{form.title}</h2>
                    <div className="justify-self-start"><StatusChip status={form.status} /></div>
                    <dl>
                      <dt className="text-xs text-muted">Ответов</dt>
                      <dd className="text-sm font-medium tabular-nums">{form.responsesCount ?? '—'}</dd>
                    </dl>
                    <dl>
                      <dt className="text-xs text-muted">Изменена</dt>
                      <dd className="text-sm">
                        {form.updatedAt ? <time dateTime={form.updatedAt}>{dateFormatter.format(new Date(form.updatedAt))}</time> : '—'}
                      </dd>
                    </dl>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState className="min-h-72 gap-4 rounded-2xl border border-dashed border-border p-8 text-center">
              <Surface variant="secondary" className="flex size-14 items-center justify-center rounded-2xl text-accent"><FormIcon /></Surface>
              <h2 className="text-xl font-semibold">{forms.length === 0 ? 'У вас пока нет форм' : 'Формы не найдены'}</h2>
              <p className="text-muted">{forms.length === 0 ? 'Создайте свою первую форму.' : 'Измените название или выберите другой статус.'}</p>
              {forms.length === 0 ? <Button onPress={openCreation}>Создать форму</Button> : <Button variant="secondary" onPress={resetFilters}>Сбросить фильтры</Button>}
            </EmptyState>
          )}
        </>
      )}

      {isCreating && <CreateForm onClose={closeCreation} onCreated={handleCreated} />}
    </section>
  );
}
