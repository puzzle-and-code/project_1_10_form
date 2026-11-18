import { useEffect, useRef, useState } from 'react';
import { Button } from '@heroui/react';
import { Reorder, useDragControls, useReducedMotion } from 'framer-motion';
import { getFormsError, reorderQuestions, type QuestionDto, type QuestionType } from '../../api/forms';

const typeLabels: Record<QuestionType, string> = {
  short_text: 'Короткий текст', number: 'Число',
  single_choice: 'Один вариант', multiple_choice: 'Несколько вариантов',
};

interface Props {
  formId: string;
  questions: QuestionDto[];
  isCompleted: boolean;
  isAdding: boolean;
  onReordered: (questions: QuestionDto[]) => void;
  onBusyChange: (busy: boolean) => void;
}

export function QuestionOrderList({ formId, questions, isCompleted, isAdding, onReordered, onBusyChange }: Props) {
  const [preview, setPreview] = useState<string[] | null>(null);
  const previewRef = useRef<string[] | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const activeDrag = useRef<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const ids = preview ?? questions.map(question => question.id);
  const byId = new Map(questions.map(question => [question.id, question]));
  const visibleQuestions = ids.map(id => byId.get(id)).filter((question): question is QuestionDto => Boolean(question));

  function clearPreview() {
    previewRef.current = null;
    setPreview(null);
  }

  async function saveOrder(nextIds: string[], movedId: string) {
    if (saving.current || isCompleted || isAdding) return;
    if (nextIds.every((id, index) => id === questions[index]?.id)) {
      clearPreview();
      onBusyChange(false);
      return;
    }
    saving.current = true;
    setIsSaving(true);
    onBusyChange(true);
    setError(null);
    setNotice('');
    try {
      const updated = await reorderQuestions(formId, nextIds);
      onReordered(updated);
      const moved = byId.get(movedId);
      setNotice(`Порядок сохранён. Вопрос «${moved?.text ?? ''}» теперь на позиции ${nextIds.indexOf(movedId) + 1}.`);
    } catch (cause) {
      setError(getFormsError(cause));
    } finally {
      clearPreview();
      saving.current = false;
      setIsSaving(false);
      onBusyChange(false);
    }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (activeDrag.current || saving.current || isAdding || target < 0 || target >= questions.length) return;
    const nextIds = questions.map(question => question.id);
    [nextIds[index], nextIds[target]] = [nextIds[target], nextIds[index]];
    void saveOrder(nextIds, questions[index].id);
  }

  function startDrag(id: string) {
    activeDrag.current = id;
    setDraggedId(id);
    setError(null);
    setNotice('');
    previewRef.current = questions.map(question => question.id);
    onBusyChange(true);
  }

  function cancelDrag() {
    if (!activeDrag.current) return;
    activeDrag.current = null;
    setDraggedId(null);
    clearPreview();
    setNotice('Перетаскивание отменено.');
    onBusyChange(false);
  }

  function finishDrag(event: MouseEvent | TouchEvent | PointerEvent) {
    if (!activeDrag.current) return;
    if (event.type === 'pointercancel') { cancelDrag(); return; }
    const id = activeDrag.current;
    const nextIds = previewRef.current ?? questions.map(question => question.id);
    activeDrag.current = null;
    setDraggedId(null);
    void saveOrder(nextIds, id);
  }

  return (
    <>
      {!isCompleted && questions.length > 1 && (
        <p id="question-order-help" className="text-sm text-muted">Перетащите вопрос за значок ⠿ или используйте «Выше / Ниже». Esc отменяет перетаскивание.</p>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error} Восстановлен прежний порядок.</p>}
      <p role="status" className="text-sm text-muted">{isSaving ? 'Сохраняем порядок…' : draggedId ? 'Переместите вопрос и отпустите, чтобы сохранить порядок.' : notice}</p>
      <Reorder.Group as="ol" axis="y" values={ids} aria-label="Вопросы формы" className="flex list-none flex-col gap-3 p-0"
        onReorder={nextIds => {
          if (!activeDrag.current || saving.current) return;
          previewRef.current = nextIds;
          setPreview(nextIds);
        }}>
        {visibleQuestions.map((question, index) => (
          <QuestionItem key={question.id} question={question} index={index} total={questions.length}
            canDrag={!isCompleted && !isAdding && !isSaving && questions.length > 1 && (!draggedId || draggedId === question.id)}
            isDragging={draggedId === question.id} controlsDisabled={isSaving || isAdding || Boolean(draggedId)}
            isCompleted={isCompleted} onMove={direction => move(index, direction)}
            onDragStart={() => startDrag(question.id)} onDragEnd={finishDrag} onCancel={cancelDrag} />
        ))}
      </Reorder.Group>
    </>
  );
}

function QuestionItem({ question, index, total, canDrag, isDragging, controlsDisabled, isCompleted, onMove, onDragStart, onDragEnd, onCancel }: {
  question: QuestionDto; index: number; total: number; canDrag: boolean; isDragging: boolean;
  controlsDisabled: boolean; isCompleted: boolean; onMove: (direction: -1 | 1) => void;
  onDragStart: () => void; onDragEnd: (event: MouseEvent | TouchEvent | PointerEvent) => void; onCancel: () => void;
}) {
  const dragControls = useDragControls();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isDragging) return;
    function cancel(event: KeyboardEvent | Event) {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
      event.preventDefault();
      onCancel();
      dragControls.stop();
    }
    window.addEventListener('keydown', cancel);
    window.addEventListener('blur', cancel);
    return () => { window.removeEventListener('keydown', cancel); window.removeEventListener('blur', cancel); };
  }, [isDragging, onCancel, dragControls]);

  return (
    <Reorder.Item value={question.id} drag={canDrag ? 'y' : false} dragControls={dragControls} dragListener={false}
      onDragStart={onDragStart} onDragEnd={onDragEnd} transition={{ duration: reducedMotion ? 0 : 0.18 }}
      className={`relative rounded-xl border bg-white p-4 ${isDragging ? 'border-accent shadow-lg ring-2 ring-accent/20' : 'border-default-200'}`}>
      <div className="flex items-start gap-3">
        {!isCompleted && (
          <button type="button" disabled={!canDrag} aria-label={`Перетащить вопрос: ${question.text}`}
            aria-describedby={total > 1 ? 'question-order-help' : undefined}
            title="Перетащите для изменения порядка. С клавиатуры: Alt + ↑ / ↓."
            className="flex size-10 shrink-0 touch-none select-none items-center justify-center rounded-lg text-xl text-muted outline-none hover:bg-default-100 focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-default disabled:opacity-40 cursor-grab active:cursor-grabbing"
            onPointerDown={event => {
              if (!canDrag || event.button !== 0) return;
              event.currentTarget.focus();
              dragControls.start(event);
            }}
            onKeyDown={event => {
              if (!event.altKey || controlsDisabled || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
              event.preventDefault();
              onMove(event.key === 'ArrowUp' ? -1 : 1);
            }}><span aria-hidden="true">⠿</span></button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="min-w-0 flex-1 break-words font-semibold">{index + 1}. {question.text}</h3>
            {!isCompleted && (
              <div className="flex gap-2" aria-label={`Порядок вопроса ${index + 1}`}>
                <Button size="sm" variant="secondary" aria-label={`Выше: ${question.text}`}
                  isDisabled={index === 0 || controlsDisabled} onPress={() => onMove(-1)}>↑ Выше</Button>
                <Button size="sm" variant="secondary" aria-label={`Ниже: ${question.text}`}
                  isDisabled={index === total - 1 || controlsDisabled} onPress={() => onMove(1)}>↓ Ниже</Button>
              </div>
            )}
          </div>
          <p className="mt-1 text-sm text-default-600">
            {Object.prototype.hasOwnProperty.call(typeLabels, question.type) ? typeLabels[question.type as QuestionType] : question.type}
            {' · '}{question.isRequired ? 'Обязательный' : 'Необязательный'}
          </p>
          {question.options.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {question.options.map(option => <li key={option.id} className="break-words">{option.text}</li>)}
          </ul>}
        </div>
      </div>
    </Reorder.Item>
  );
}
