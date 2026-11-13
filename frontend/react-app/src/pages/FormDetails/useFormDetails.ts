import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { type FormDto, getFormById, patchForm } from '../../api/forms';

export interface FormValidationErrors {
  title?: string;
  description?: string;
}

export function useFormDetails() {
  const { id } = useParams<{ id: string }>();

  const [form, setForm] = useState<FormDto | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
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

  const handleBlur = (field: 'title' | 'description') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setTouched({ title: true, description: true });

    // Проверка критериев 4 и 5: пустое название или превышение лимитов блокирует запрос
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

      // Критерий 6: новые данные видны сразу, без перезагрузки
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
    notFound,
    error,
    saveError,
    saveSuccess,
    setSaveSuccess,
    handleBlur,
    handleSave,
    handleReset,
    reload,
  };
}
