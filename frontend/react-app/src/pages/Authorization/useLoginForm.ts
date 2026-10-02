import { useState } from 'react';
import { loginRequest } from '../../api/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  email?: string;
  password?: string;
}

interface Touched {
  email: boolean;
  password: boolean;
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!email) {
    errors.email = 'Email обязателен';
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Введите корректный email';
  }

  if (!password) {
    errors.password = 'Пароль обязателен';
  } else if (password.length < 6) {
    errors.password = 'Пароль не менее 6 символов';
  }

  return errors;
}

export function useLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // touched — показываем ошибку только после первого касания поля
  const [touched, setTouched] = useState<Touched>({ email: false, password: false });

  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const fieldErrors = validate(email, password);
  const isFormValid = Object.keys(fieldErrors).length === 0;

  function handleBlur(field: keyof Touched) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Показываем все ошибки при попытке сабмита
    setTouched({ email: true, password: true });
    if (!isFormValid) return;

    setIsLoading(true);
    setServerError(null);

    try {
      const result = await loginRequest({ email, password });

      if (result.ok) {
        setIsSuccess(true);
        // TODO: сохранить токен / редиректнуть — будет при интеграции с API
      } else {
        setServerError(result.error ?? 'Произошла ошибка');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return {
    email,
    password,
    touched,
    fieldErrors,
    isFormValid,
    isLoading,
    serverError,
    isSuccess,
    setEmail,
    setPassword,
    handleBlur,
    handleSubmit,
  };
}
