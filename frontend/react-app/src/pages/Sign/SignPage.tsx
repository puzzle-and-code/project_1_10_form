import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { registerRequest } from '../../api/auth'
import { validateEmail, validateName } from '../../utils/authValidation'
import {
  Button,
  FieldError,
  Input,
  Label,
  Modal,
  TextField,
} from '@heroui/react'

export default function SignPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [submitted, setSubmitted] = useState(false)
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Проверяем текущие значения полей.
  const errors = {
    name: validateName(name),
    email: validateEmail(email),

    password: !password
      ? 'Введите пароль'
      : password.length < 8
        ? 'Пароль должен содержать минимум 8 символов'
        : new TextEncoder().encode(password).length > 72
          ? 'Пароль слишком длинный. Используйте более короткий пароль.'
        : '',

    confirmPassword: !confirmPassword
      ? 'Повторите пароль'
      : confirmPassword !== password
        ? 'Пароли не совпадают'
        : '',
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSubmitted(true)

    // Если хотя бы одно поле содержит ошибку останавливаемся.
    const hasErrors = Object.values(errors).some(Boolean)

    if (hasErrors || isLoading) return
    setServerError(null)
    setIsLoading(true)
    try {
      const result = await registerRequest({ name, email, password })
      if (result.ok) {
        setPassword('')
        setConfirmPassword('')
        setSubmitted(false)
        setIsSuccessOpen(true)
      } else {
        setServerError(result.error ?? 'Не удалось зарегистрироваться.')
      }
    } catch {
      setServerError('Не удалось зарегистрироваться. Попробуйте ещё раз.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-sm py-8">
      <h1 className="mb-2 text-2xl font-semibold">
        Регистрация
      </h1>

      <p className="mb-6 text-sm">
        Укажите имя, email и создайте пароль.
      </p>

      {serverError && <p role="alert" className="mb-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">{serverError}</p>}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4"
      >
        <TextField
          value={name}
          onChange={setName}
          isRequired
          isDisabled={isLoading}
          validationBehavior="aria"
          isInvalid={submitted && Boolean(errors.name)}
        >
          <Label>Имя</Label>
          <Input name="display_name" type="text" autoComplete="name" placeholder="Например, Александр" maxLength={100} />
          <FieldError>{errors.name}</FieldError>
        </TextField>
        <TextField
          value={email}
          onChange={setEmail}
          isRequired
          isDisabled={isLoading}
          validationBehavior="aria"
          isInvalid={submitted && Boolean(errors.email)}
        >
          <Label>Email</Label>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <FieldError>{errors.email}</FieldError>
        </TextField>

        <TextField
          value={password}
          onChange={setPassword}
          isRequired
          isDisabled={isLoading}
          validationBehavior="aria"
          isInvalid={submitted && Boolean(errors.password)}
        >
          <Label>Пароль</Label>
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Минимум 8 символов"
          />
          <FieldError>{errors.password}</FieldError>
        </TextField>

        <TextField
          value={confirmPassword}
          onChange={setConfirmPassword}
          isRequired
          isDisabled={isLoading}
          validationBehavior="aria"
          isInvalid={submitted && Boolean(errors.confirmPassword)}
        >
          <Label>Повторите пароль</Label>
          <Input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Введите пароль ещё раз"
          />
          <FieldError>{errors.confirmPassword}</FieldError>
        </TextField>

        <Button type="submit" className="w-full" isDisabled={isLoading}>
          {isLoading ? 'Регистрируем…' : 'Зарегистрироваться'}
        </Button>
      </form>

      <p className="mt-5 text-sm">
        Уже есть аккаунт?{' '}
        <Link to="/login" className="underline">
          Войти
        </Link>
      </p>

      <Modal.Backdrop
        isOpen={isSuccessOpen}
        onOpenChange={setIsSuccessOpen}
      >
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog>
            <Modal.CloseTrigger aria-label="Закрыть окно" />
            <Modal.Header>
              <Modal.Heading>Вы зарегистрировались</Modal.Heading>
            </Modal.Header>
            <Modal.Body>Аккаунт создан. Теперь можно войти по email и паролю.</Modal.Body>
            <Modal.Footer>
              <Button
                type="button"
                autoFocus
                onPress={() => setIsSuccessOpen(false)}
              >
                ОК
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </section>
  )
}
