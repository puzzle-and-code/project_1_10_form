import { useRef, useState, type FormEvent } from 'react';
import { Button, Card, FieldError, Input, Label, TextField } from '@heroui/react';
import { isAxiosError } from 'axios';
import { createQuestion, type QuestionDto, type QuestionType } from '../../api/forms';

const typeLabels: Record<QuestionType, string> = {
  short_text: 'Короткий текст',
  number: 'Число',
  single_choice: 'Один вариант',
  multiple_choice: 'Несколько вариантов',
};

interface Props {
  formId: string;
  questions: QuestionDto[];
  isCompleted: boolean;
  onCreated: (question: QuestionDto) => void;
  onNotFound: () => void;
}

export function FormQuestions({ formId, questions, isCompleted, onCreated, onNotFound }: Props) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <Card className="flex flex-col gap-5 border border-default-200 bg-white p-6 shadow-sm md:p-8">
      <Card.Header className="flex flex-wrap items-center justify-between gap-3 p-0">
        <h2 className="text-xl font-bold text-default-900">Вопросы</h2>
        {!isCompleted && !isAdding && (
          <Button type="button" onPress={() => setIsAdding(true)}>Добавить вопрос</Button>
        )}
      </Card.Header>

      {questions.length === 0 ? (
        <p className="text-sm text-default-500">В форме пока нет вопросов.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {questions.map((question, index) => (
            <li key={question.id} className="rounded-xl border border-default-200 p-4">
              <h3 className="break-words font-semibold">{index + 1}. {question.text}</h3>
              <p className="mt-1 text-sm text-default-600">
                {Object.prototype.hasOwnProperty.call(typeLabels, question.type) ? typeLabels[question.type as QuestionType] : question.type}
                {' · '}
                {question.isRequired ? 'Обязательный' : 'Необязательный'}
              </p>
              {(question.options?.length ?? 0) > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {question.options.map((option) => <li key={option.id} className="break-words">{option.text}</li>)}
                </ul>
              )}
              <p className="mt-2 text-xs text-default-500">
                Чтобы изменить тип, удалите вопрос и создайте его заново.
              </p>
            </li>
          ))}
        </ol>
      )}

      {isAdding && !isCompleted && (
        <NewQuestionForm
          formId={formId}
          onCancel={() => setIsAdding(false)}
          onNotFound={onNotFound}
          onCreated={(question) => {
            onCreated(question);
            setIsAdding(false);
          }}
        />
      )}
    </Card>
  );
}

function NewQuestionForm({
  formId,
  onCreated,
  onNotFound,
  onCancel,
}: Pick<Props, 'formId' | 'onCreated' | 'onNotFound'> & { onCancel: () => void }) {
  const [text, setText] = useState('');
  const [type, setType] = useState<QuestionType>('short_text');
  const [isRequired, setIsRequired] = useState(true);
  const [options, setOptions] = useState(['', '']);
  const [attempted, setAttempted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  const hasOptions = type === 'single_choice' || type === 'multiple_choice';
  const trimmedOptions = options.map((option) => option.trim());
  const textError = attempted && !text.trim();
  const optionsError = attempted && hasOptions && trimmedOptions.filter(Boolean).length < 2;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    const filledOptions = trimmedOptions.filter(Boolean);
    if (submitting.current || !text.trim() || (hasOptions && filledOptions.length < 2)) return;

    submitting.current = true;
    setIsSaving(true);
    setError(null);
    try {
      const question = await createQuestion(formId, {
        text: text.trim(),
        type,
        isRequired,
        options: hasOptions ? filledOptions : [],
      });
      onCreated(question);
    } catch (err) {
      if (isAxiosError(err) && [403, 404].includes(err.response?.status ?? 0)) {
        onNotFound();
      } else {
        const message = isAxiosError(err) ? err.response?.data?.message : undefined;
        setError(message || 'Не удалось добавить вопрос. Попробуйте снова.');
      }
    } finally {
      submitting.current = false;
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-default-200 p-4">
      <fieldset disabled={isSaving} className="flex flex-col gap-4">
        <legend className="px-1 font-semibold">Новый вопрос</legend>

        <TextField value={text} onChange={setText} isRequired isInvalid={textError} isDisabled={isSaving}>
          <Label>Текст вопроса</Label>
          <Input autoFocus />
          <FieldError>Введите текст вопроса.</FieldError>
        </TextField>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Тип вопроса
          <select
            className="w-full rounded-lg border border-default-200 bg-white px-3 py-2"
            value={type}
            onChange={(event) => setType(event.target.value as QuestionType)}
          >
            {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isRequired} onChange={(event) => setIsRequired(event.target.checked)} />
          Обязательный вопрос
        </label>

        {hasOptions && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Варианты ответа</legend>
            {options.map((option, index) => (
              <TextField
                key={index}
                value={option}
                onChange={(value) => setOptions((previous) => previous.map((item, i) => i === index ? value : item))}
                isInvalid={optionsError && !option.trim()}
                isDisabled={isSaving}
              >
                <Label>Вариант {index + 1}</Label>
                <Input aria-describedby={optionsError ? 'question-options-error' : undefined} />
              </TextField>
            ))}
            {optionsError && (
              <p id="question-options-error" role="alert" className="text-xs text-danger">
                Заполните минимум два варианта ответа.
              </p>
            )}
            <Button type="button" variant="secondary" className="self-start" onPress={() => setOptions([...options, ''])}>
              Добавить вариант
            </Button>
          </fieldset>
        )}

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onPress={onCancel}>Отмена</Button>
          <Button type="submit" isDisabled={isSaving}>{isSaving ? 'Сохранение…' : 'Сохранить вопрос'}</Button>
        </div>
      </fieldset>
    </form>
  );
}
