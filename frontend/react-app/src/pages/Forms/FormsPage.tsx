import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  Alert, Button, Card, Chip, EmptyState, Input, Label, Modal, Separator,
  Spinner, Surface, TextField, ToggleButton, ToggleButtonGroup,
} from '@heroui/react';
import { getForms, getFormsError, usesLocalForms, type FormSummary } from '../../api/forms';
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
};
const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric', month: 'short', year: 'numeric',
});
const normalize = (value: string) => value.trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');

function StatusChip({ status }: { status: string }) {
  const display = statuses[status] ?? { label: status, color: 'default' as const };
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
  return <FormsContent key={JSON.stringify([user?.id, user?.email])} ownerId={user?.id} />;
}

function FormsContent({ ownerId }: { ownerId: string | number | undefined }) {
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
  const [selectedForm, setSelectedForm] = useState<FormSummary | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadForms() {
      try {
        const data = await getForms(controller.signal, ownerId);
        if (!controller.signal.aborted) setResult({ key: requestKey, forms: data, error: null });
      } catch (cause) {
        if (!controller.signal.aborted) setResult({ key: requestKey, forms: [], error: getFormsError(cause) });
      }
    }

    void loadForms();
    return () => controller.abort();
  }, [requestKey, ownerId]);

  function reloadForms() {
    setSelectedForm(null);
    setAttempt((value) => value + 1);
  }

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
    setNotice(usesLocalForms
      ? `Черновик «${form.title}» сохранён в этом браузере.`
      : `Форма «${form.title}» создана как черновик.`);
    closeCreation();
  }

  const visibleForms = forms.filter((form) => (
    (status === 'all' || form.status === status) && normalize(form.title).includes(normalize(query))
  ));
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

      {usesLocalForms && <Surface variant="secondary" className="rounded-xl px-4 py-3">
        <h2 className="text-sm font-medium">Черновики в этом браузере</h2>
        <p className="mt-1 text-sm text-muted">Сохраняются для вашего аккаунта на этом устройстве. На сервер пока не отправляются.</p>
      </Surface>}

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
            <ul aria-label="Список форм" className="grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {visibleForms.map((form) => (
                <li key={form.id} className="min-w-0">
                  <Card className="h-full" role="article" aria-labelledby={`form-${form.id}`}>
                    <Card.Header className="gap-3">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <Surface variant="secondary" className="flex size-11 shrink-0 items-center justify-center rounded-xl text-accent"><FormIcon /></Surface>
                        <StatusChip status={form.status} />
                      </div>
                      <Card.Title id={`form-${form.id}`} aria-level={2} className="break-words">{form.title}</Card.Title>
                      {form.description && <Card.Description className="break-words">{form.description}</Card.Description>}
                    </Card.Header>
                    <Card.Content className="flex flex-1 items-end py-3">
                      <dl>
                        <dt className="text-sm text-muted">Ответов</dt>
                        <dd className="text-xl font-semibold" aria-label={form.responsesCount === null ? 'Нет данных' : undefined}>{form.responsesCount ?? '—'}</dd>
                      </dl>
                    </Card.Content>
                    <Separator />
                    <Card.Footer className="flex-wrap justify-between gap-3 pt-3">
                      <p className="text-xs text-muted">Обновлена<br />{form.updatedAt ? <time dateTime={form.updatedAt}>{dateFormatter.format(new Date(form.updatedAt))}</time> : '—'}</p>
                      <Button size="sm" variant="secondary" aria-label={`Подробнее: ${form.title}`} onPress={() => setSelectedForm(form)}>Подробнее</Button>
                    </Card.Footer>
                  </Card>
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

      <Modal.Backdrop isOpen={selectedForm !== null} onOpenChange={(isOpen) => { if (!isOpen) setSelectedForm(null); }}>
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog>
            <Modal.CloseTrigger aria-label="Закрыть окно" />
            <Modal.Header><Modal.Heading>{selectedForm?.title}</Modal.Heading></Modal.Header>
            <Modal.Body>
              {selectedForm && <div className="flex flex-col gap-4">
                {selectedForm.description && <p className="break-words text-muted">{selectedForm.description}</p>}
                <dl className="grid grid-cols-2 items-center gap-3 text-sm">
                  {usesLocalForms && <><dt className="text-muted">Хранение</dt><dd>В этом браузере</dd></>}
                  <dt className="text-muted">Статус</dt><dd><StatusChip status={selectedForm.status} /></dd>
                  <dt className="text-muted">Ответов</dt><dd>{selectedForm.responsesCount ?? 'Нет данных'}</dd>
                  <dt className="text-muted">Обновлена</dt><dd>{selectedForm.updatedAt ? dateFormatter.format(new Date(selectedForm.updatedAt)) : 'Нет данных'}</dd>
                </dl>
              </div>}
            </Modal.Body>
            <Modal.Footer><Button variant="secondary" onPress={() => setSelectedForm(null)}>Закрыть</Button></Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
      {isCreating && <CreateForm ownerId={ownerId} onClose={closeCreation} onCreated={handleCreated} />}
    </section>
  );
}
