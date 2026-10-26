import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import {
  Button,
  FieldError,
  Input,
  Label,
  Modal,
  TextField,
} from '@heroui/react'

export default function SignPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [submitted, setSubmitted] = useState(false)
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)

  // Проверяем текущие значения полей.
  const errors = {
    email: !email.trim()
      ? 'Введите email'
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ? 'Введите корректный email'
        : '',

    password: !password
      ? 'Введите пароль'
      : password.length < 8
        ? 'Пароль должен содержать минимум 8 символов'
        : '',

    confirmPassword: !confirmPassword
      ? 'Повторите пароль'
      : confirmPassword !== password
        ? 'Пароли не совпадают'
        : '',
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSubmitted(true)

    // Если хотя бы одно поле содержит ошибку останавливаемся.
    const hasErrors = Object.values(errors).some(Boolean)

    if (hasErrors) return

    // Демо: при подключении API открывать окно только после успешного ответа.
    setIsSuccessOpen(true)
  }

  return (
    <section className="mx-auto w-full max-w-sm py-8">
      <h1 className="mb-2 text-2xl font-semibold">
        Регистрация
      </h1>

      <p className="mb-6 text-sm">
        Введите email и придумайте пароль.
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4"
      >
        <TextField
          value={email}
          onChange={setEmail}
          isRequired
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

        <Button type="submit" className="w-full">
          Зарегистрироваться
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
