import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Alert, Button, FieldError, Input, Label, Modal, Spinner, TextArea, TextField,
} from '@heroui/react';
import { createForm, getCreateFormError, usesLocalForms, type FormSummary } from '../../api/forms';

const TITLE_LIMIT = 200;
const DESCRIPTION_LIMIT = 2000;

interface CreateFormProps {
  ownerId: string | number | undefined;
  onClose: () => void;
  onCreated: (form: FormSummary) => void;
}

export default function CreateForm({ ownerId, onClose, onCreated }: CreateFormProps) {
  const submitting = useRef(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleError = !title.trim() ? 'Укажите название'
    : title.length > TITLE_LIMIT ? `Не больше ${TITLE_LIMIT} символов.` : '';
  const descriptionError = description.length > DESCRIPTION_LIMIT
    ? `Не больше ${DESCRIPTION_LIMIT} символов.` : '';

  function close() {
    if (!submitting.current) onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || titleError || descriptionError) return;

    submitting.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      const form = await createForm({ title, description }, ownerId);
      onCreated(form);
    } catch (cause) {
      setError(getCreateFormError(cause));
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <Modal.Backdrop
      isOpen isDismissable={!isSubmitting} isKeyboardDismissDisabled={isSubmitting}
      onOpenChange={(isOpen) => { if (!isOpen) close(); }}
    >
      <Modal.Container size="sm" placement="center" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger aria-label="Закрыть создание формы" isDisabled={isSubmitting} />
          <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting} className="flex min-h-0 flex-col">
            <Modal.Header>
              <Modal.Heading>Новая форма</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-5">
              {usesLocalForms && <p className="text-sm text-muted">Черновик сохранится в этом браузере. На сервер он пока не отправляется.</p>}
              <TextField
                value={title} onChange={(value) => { setTitle(value); setError(null); }}
                isRequired isDisabled={isSubmitting} validationBehavior="aria"
                isInvalid={Boolean(titleError)}
              >
                <Label>Название</Label>
                <Input autoFocus name="title" placeholder="Например, обратная связь по курсу" maxLength={TITLE_LIMIT} fullWidth />
                <FieldError>{titleError}</FieldError>
              </TextField>

              <TextField
                value={description} onChange={(value) => { setDescription(value); setError(null); }}
                isDisabled={isSubmitting} isInvalid={Boolean(descriptionError)} validationBehavior="aria"
              >
                <Label>Описание (необязательно)</Label>
                <TextArea name="description" placeholder="Зачем эта форма, кому её отправлять" rows={4} maxLength={DESCRIPTION_LIMIT} fullWidth className="resize-y" />
                <FieldError>{descriptionError}</FieldError>
              </TextField>

              {error && (
                <Alert status="danger" role="alert">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>Не удалось создать форму</Alert.Title>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}
            </Modal.Body>
            <Modal.Footer className="gap-2">
              <Button type="button" variant="secondary" isDisabled={isSubmitting} onPress={close}>Отмена</Button>
              <Button type="submit" isDisabled={isSubmitting || Boolean(titleError) || Boolean(descriptionError)}>
                {isSubmitting ? <><Spinner size="sm" aria-hidden="true" /> Создаём…</> : 'Создать'}
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
