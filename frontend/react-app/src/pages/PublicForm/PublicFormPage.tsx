import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { Alert, Button, Card, Checkbox, CheckboxGroup, Description, FieldError, Input, Label, Radio, RadioGroup, Spinner, TextArea, TextField } from '@heroui/react';
import { publicFormsClient } from '../../api/publicForms';
import { getPublicFormsError } from '../../api/publicFormsClient';
import type { FormDto, QuestionDto } from '../../api/formsData';
import { validateAnswers, type AnswerDrafts, type ResponseReceipt } from '../../api/formResponses';

export default function PublicFormPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const demo = params.get('demo') === '1';
  return <ParticipantForm key={`${id}:${demo}`} id={id} demo={demo} />;
}

function ParticipantForm({ id, demo }: { id: string; demo: boolean }) {
  const client = useMemo(() => publicFormsClient(demo), [demo]);
  const [form, setForm] = useState<FormDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [drafts, setDrafts] = useState<AnswerDrafts>({});
  const [attempted, setAttempted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ResponseReceipt | null>(null);
  const submissionId = useRef('');
  const submitting = useRef(false);
  const formElement = useRef<HTMLFormElement>(null);
  const questions = form?.questions ?? [];
  const validation = validateAnswers(questions, drafts);

  useEffect(() => {
    const controller = new AbortController();
    client.getForm(id, controller.signal).then(data => {
      if (!controller.signal.aborted) setForm(data);
    }).catch(error => {
      if (!controller.signal.aborted) setLoadError(getPublicFormsError(error));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [client, id, attempt]);

  function changeAnswer(questionId: string, value: string | string[]) {
    setDrafts(previous => ({ ...previous, [questionId]: value }));
    submissionId.current = '';
    setSendError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || receipt) return;
    setAttempted(true);
    if (!validation.valid) {
      requestAnimationFrame(() => formElement.current?.querySelector<HTMLElement>('[data-answer-invalid="true"] input, [data-answer-invalid="true"] textarea')?.focus());
      return;
    }
    submitting.current = true;
    setSending(true);
    setSendError(null);
    submissionId.current ||= crypto.randomUUID();
    try {
      const saved = await client.submitResponse(id, { submissionId: submissionId.current, answers: validation.answers });
      setReceipt(saved);
    } catch (error) {
      setSendError(getPublicFormsError(error));
    } finally {
      submitting.current = false;
      setSending(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
      <p className="mb-6 text-sm font-semibold tracking-wide text-muted">Конструктор форм · Заполнение формы</p>

      {loading ? <div role="status" className="flex items-center gap-3 py-12"><Spinner />Загружаем форму…</div> :
        loadError || !form ? (
          <Card className="gap-5 p-6">
            <h1 className="text-2xl font-semibold">Не удалось открыть форму</h1>
            <p role="alert">{loadError ?? 'Форма недоступна.'}</p>
            <Button className="self-start" onPress={() => { setLoading(true); setLoadError(null); setAttempt(value => value + 1); }}>Попробовать снова</Button>
          </Card>
        ) : receipt ? (
          <Card className="gap-5 p-8 text-center" role="status">
            <div aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">✓</div>
            <h1 className="text-2xl font-bold">Спасибо за ответы!</h1>
            <p>Ваш ответ на форму «{form.title}» сохранён.</p>
            <p className="text-sm text-muted">Можно закрыть эту вкладку.</p>
          </Card>
        ) : (
          <form ref={formElement} onSubmit={submit} noValidate className="flex flex-col gap-5">
            <Card className="gap-3 border-t-4 border-accent p-6 sm:p-8">
              <h1 className="break-words text-3xl font-bold">{form.title}</h1>
              {form.description && <p className="whitespace-pre-wrap break-words text-muted">{form.description}</p>}
              <p className="text-sm text-muted">Вопросы со звёздочкой * обязательны.</p>
            </Card>
            {questions.map((question, index) => (
              <Card key={question.id} data-answer-invalid={attempted && Boolean(validation.errors[question.id])} className="p-6 sm:p-8">
                <AnswerField question={question} index={index} value={drafts[question.id]} disabled={sending}
                  error={attempted ? validation.errors[question.id] : undefined} onChange={value => changeAnswer(question.id, value)} />
              </Card>
            ))}
            {attempted && !validation.valid && <p role="alert" className="text-sm text-danger">Проверьте выделенные вопросы.</p>}
            {sendError && <Alert status="danger"><Alert.Indicator /><Alert.Content><Alert.Title>Ответ пока не сохранён</Alert.Title><Alert.Description>{sendError}</Alert.Description></Alert.Content></Alert>}
            <div className="flex flex-wrap items-center gap-4">
              <Button type="submit" isDisabled={sending} className="min-w-40">{sending ? <><Spinner size="sm" />Отправляем…</> : 'Отправить ответы'}</Button>
            </div>
          </form>
        )}
    </main>
  );
}

function AnswerField({ question, index, value, error, disabled, onChange }: {
  question: QuestionDto; index: number; value: string | string[] | undefined; error?: string;
  disabled: boolean; onChange: (value: string | string[]) => void;
}) {
  const label = `${index + 1}. ${question.text}`;
  const common = { isRequired: question.isRequired, isDisabled: disabled, isInvalid: Boolean(error), validationBehavior: 'aria' as const };
  if (question.type === 'single_choice') return (
    <RadioGroup {...common} value={typeof value === 'string' ? value : ''} onChange={onChange}>
      <Label className="mb-2 text-base font-semibold">{label}</Label>
      <Description>Выберите один вариант.</Description>
      {question.options.map(option => <Radio key={option.id} value={option.id}><Radio.Content><Radio.Control><Radio.Indicator /></Radio.Control><Label className="after:hidden">{option.text}</Label></Radio.Content></Radio>)}
      {!question.isRequired && value && <Button size="sm" variant="ghost" className="self-start" onPress={() => onChange('')}>Снять выбор</Button>}
      <FieldError>{error}</FieldError>
    </RadioGroup>
  );
  if (question.type === 'multiple_choice') return (
    <CheckboxGroup {...common} value={Array.isArray(value) ? value : []} onChange={onChange}>
      <Label className="mb-2 text-base font-semibold">{label}</Label>
      <Description>Можно выбрать несколько вариантов.</Description>
      {question.options.map(option => <Checkbox key={option.id} value={option.id}><Checkbox.Content><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Label>{option.text}</Label></Checkbox.Content></Checkbox>)}
      <FieldError>{error}</FieldError>
    </CheckboxGroup>
  );
  if (question.type === 'short_text' || question.type === 'number') return (
    <TextField {...common} value={typeof value === 'string' ? value : ''} onChange={onChange} className="w-full">
      <Label className="mb-2 text-base font-semibold">{label}</Label>
      {question.type === 'number' ? <Input inputMode="decimal" placeholder="Введите число" className="w-full" /> : <TextArea placeholder="Ваш ответ" rows={3} className="w-full" />}
      <FieldError>{error}</FieldError>
    </TextField>
  );
  return <div><h2 className="font-semibold">{label}</h2><p role="alert" className="mt-2 text-danger">Этот тип вопроса пока не поддерживается. Обратитесь к автору формы.</p></div>;
}
