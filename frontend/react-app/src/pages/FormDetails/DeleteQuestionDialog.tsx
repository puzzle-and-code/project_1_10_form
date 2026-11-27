import { useId, useRef, useState } from 'react';
import { Alert, Button, Modal } from '@heroui/react';
import { deleteQuestion, getFormsError, type QuestionDto } from '../../api/forms';
import { FormsError } from '../../api/formsData';

interface DeleteQuestionDialogProps {
  formId: string;
  question: QuestionDto;
  onCancel: () => void;
  onDeleted: () => void;
}

export default function DeleteQuestionDialog({ formId, question, onCancel, onDeleted }: DeleteQuestionDialogProps) {
  const descriptionId = useId();
  const submitting = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cancel() {
    if (!submitting.current) onCancel();
  }

  async function confirm() {
    if (submitting.current) return;
    submitting.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      await deleteQuestion(formId, question.id);
      onDeleted();
    } catch (cause) {
      setError(cause instanceof FormsError && cause.status === 404
        ? 'Форма или вопрос не найдены. Обновите страницу.'
        : getFormsError(cause));
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <Modal.Backdrop
      isOpen
      isDismissable={!isSubmitting}
      isKeyboardDismissDisabled={isSubmitting}
      onOpenChange={(isOpen) => { if (!isOpen) cancel(); }}
    >
      <Modal.Container size="sm" placement="center">
        <Modal.Dialog role="alertdialog" aria-describedby={descriptionId} aria-busy={isSubmitting}>
          <Modal.Header>
            <Modal.Heading>Удалить вопрос?</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="gap-4">
            <p id={descriptionId} className="break-words">
              Вопрос «{question.text}» исчезнет из формы. Уже собранные ответы на него сохранятся.
            </p>
            {error && (
              <Alert status="danger" role="alert">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Не удалось удалить вопрос</Alert.Title>
                  <Alert.Description>{error}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button autoFocus variant="secondary" isDisabled={isSubmitting} onPress={cancel}>Отмена</Button>
            <Button variant="danger" isDisabled={isSubmitting} onPress={confirm}>
              {isSubmitting ? 'Удаляем…' : 'Удалить'}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
