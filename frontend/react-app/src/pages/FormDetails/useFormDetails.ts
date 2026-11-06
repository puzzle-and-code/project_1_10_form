import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { type FormDto, getFormById, patchForm, publishForm } from '../../api/forms';

export interface FormValidationErrors {
  title?: string;
  description?: string;
}

export type ReadableStatus = 'Черновик' | 'Опубликована' | 'Завершена';

export function getStatusLabel(status?: string): ReadableStatus {
  if (!status) return 'Черновик';
  const lower = status.toLowerCase();
  if (lower === 'published' || lower === 'active') return 'Опубликована';
  if (lower === 'completed' || lower === 'closed' || lower === 'archived') return 'Завершена';
  return 'Черновик';
}

export function useFormDetails() {
  const { id } = useParams<{ id: string }>();

  const [form, setForm] = useState<FormDto | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const [touched, setTouched] = useState({
    title: false,
    description: false,
  });

  // Загрузка формы
  useEffect(() => {
    let active = true;

    async function fetchForm() {
      if (!id) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setNotFound(false);
      setSaveSuccess(false);
      setSaveError(null);
      setPublishError(null);
      setPublishSuccess(false);

      try {
        const data = await getFormById(id);
        if (!active) return;
        setForm(data);
        setTitle(data.title ?? '');
        setDescription(data.description ?? '');
      } catch (err: any) {
        if (!active) return;
        if (err?.status === 404 || err?.message === 'Форма не найдена') {
          setNotFound(true);
          setForm(null);
        } else {
          setError(err?.message || 'Не удалось загрузить данные формы');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void fetchForm();

    return () => {
      active = false;
    };
  }, [id, reloadTrigger]);

  // Валидация полей
  // Лимиты: название 1–200 символов, описание до 2500 символов
  const errors = useMemo<FormValidationErrors>(() => {
    const errs: FormValidationErrors = {};

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      errs.title = 'Название обязательно (от 1 до 200 символов)';
    } else if (title.length > 200) {
      errs.title = `Название не должно превышать 200 символов (сейчас ${title.length})`;
    }

    if (description.length > 2500) {
      errs.description = `Описание не должно превышать 2500 символов (сейчас ${description.length})`;
    }

    return errs;
  }, [title, description]);

  const isValid = Object.keys(errors).length === 0;

  // Изменены ли поля по сравнению с текущей сохранённой версией
  const isDirty = useMemo(() => {
    if (!form) return false;
    const currentTitle = title;
    const initialTitle = form.title ?? '';
    const currentDesc = description;
    const initialDesc = form.description ?? '';
    return currentTitle !== initialTitle || currentDesc !== initialDesc;
  }, [form, title, description]);

  // Человекочитаемый статус
  const statusLabel = useMemo<ReadableStatus>(() => {
    return getStatusLabel(form?.status);
  }, [form?.status]);

  const isDraft = statusLabel === 'Черновик';
  const isPublished = statusLabel === 'Опубликована';
  const isCompleted = statusLabel === 'Завершена';

  // Количество неудалённых вопросов
  const questionsCount = form?.questionsCount ?? 0;
  const hasQuestions = questionsCount > 0;

  // Возможность публикации: только черновик с хотя бы одним вопросом
  const canPublish = isDraft && hasQuestions;

  // Текст причины, почему нельзя опубликовать
  const cannotPublishReason = useMemo<string | null>(() => {
    if (!isDraft) return null;
    if (!hasQuestions) {
      return 'Нельзя опубликовать форму: в ней нет ни одного вопроса. Добавьте хотя бы один вопрос в конструкторе.';
    }
    return null;
  }, [isDraft, hasQuestions]);

  // Публичная ссылка
  const publicPath = id ? `/f/${id}` : '';
  const publicUrl = typeof window !== 'undefined' && id
    ? `${window.location.origin}/f/${id}`
    : publicPath;

  const handleBlur = (field: 'title' | 'description') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Сохранение названия и описания
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setTouched({ title: true, description: true });

    if (!isValid || !title.trim() || !id) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const updated = await patchForm(id, {
        title: title.trim(),
        description: description,
      });

      setForm(updated);
      setTitle(updated.title ?? '');
      setDescription(updated.description ?? '');
      setSaveSuccess(true);
    } catch (err: any) {
      if (err?.status === 404) {
        setNotFound(true);
      } else {
        setSaveError(err?.message || 'Не удалось сохранить изменения');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Публикация формы: POST /api/forms/{id}/publish
  const handlePublish = async () => {
    if (!id || !canPublish) return;

    setIsPublishing(true);
    setPublishError(null);
    setPublishSuccess(false);

    try {
      const updated = await publishForm(id);
      // Успех меняет подпись на «Опубликована» без перезагрузки всей страницы
      setForm(updated);
      setPublishSuccess(true);
    } catch (err: any) {
      // Ошибка запроса показана в блоке, статус остаётся прежним
      setPublishError(err?.message || 'Не удалось опубликовать форму. Попробуйте снова.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Копирование публичной ссылки в буфер обмена
  const handleCopyLink = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicUrl);
      } else {
        // Fallback для старых окружений
        const textarea = document.createElement('textarea');
        textarea.value = publicUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Игнорируем ошибку клипборда
    }
  };

  const handleReset = () => {
    if (form) {
      setTitle(form.title ?? '');
      setDescription(form.description ?? '');
      setTouched({ title: false, description: false });
      setSaveError(null);
      setSaveSuccess(false);
    }
  };

  const reload = useCallback(() => {
    setReloadTrigger((prev) => prev + 1);
  }, []);

  return {
    id,
    form,
    title,
    description,
    setTitle,
    setDescription,
    errors,
    touched,
    isValid,
    isDirty,
    isLoading,
    isSaving,
    isPublishing,
    notFound,
    error,
    saveError,
    saveSuccess,
    publishError,
    publishSuccess,
    copied,
    statusLabel,
    isDraft,
    isPublished,
    isCompleted,
    questionsCount,
    hasQuestions,
    canPublish,
    cannotPublishReason,
    publicPath,
    publicUrl,
    setSaveSuccess,
    setPublishSuccess,
    setPublishError,
    handleBlur,
    handleSave,
    handlePublish,
    handleCopyLink,
    handleReset,
    reload,
  };
}
