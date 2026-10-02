import {
  TextField,
  Label,
  Input,
  FieldError,
  Button,
  CardRoot,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Spinner,
} from '@heroui/react';
import { PasswordInput } from '../../components/PasswordInput';
import { useLoginForm } from './useLoginForm';

export default function AuthorizationPage() {
  const {
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
  } = useLoginForm();

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-default-50">
        <CardRoot className="w-full max-w-sm shadow-md">
          <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success text-xl">
              ✓
            </div>
            <CardTitle className="text-lg">Вы вошли</CardTitle>
            <CardDescription>
              Интеграция с роутингом появится при подключении API
            </CardDescription>
          </CardContent>
        </CardRoot>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-default-50 px-4">
      <CardRoot className="w-full max-w-sm shadow-md">
        <CardHeader className="px-6 pt-7 pb-2 flex flex-col gap-1">
          <CardTitle className="text-xl font-semibold">Вход</CardTitle>
          <CardDescription>Введите email и пароль для входа</CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-7 flex flex-col gap-5">
          {serverError && (
            <div
              role="alert"
              className="rounded-lg bg-danger/10 border border-danger/20 px-4 py-3 text-danger text-sm"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {/* Email */}
            <TextField
              value={email}
              onChange={setEmail}
              onBlur={() => handleBlur('email')}
              isInvalid={touched.email && !!fieldErrors.email}
              isDisabled={isLoading}
              className="flex flex-col gap-1"
            >
              <Label className="text-sm font-medium">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className="input"
              />
              <FieldError className="text-danger text-xs">
                {touched.email ? fieldErrors.email : null}
              </FieldError>
            </TextField>

            {/* Пароль */}
            <PasswordInput
              label="Пароль"
              value={password}
              onChange={setPassword}
              onBlur={() => handleBlur('password')}
              isInvalid={touched.password && !!fieldErrors.password}
              errorMessage={touched.password ? fieldErrors.password : undefined}
              isDisabled={isLoading}
            />

            <Button
              id="login-submit"
              type="submit"
              isDisabled={isLoading || !isFormValid}
              className="w-full mt-1 button button--primary"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" />
                  Вход...
                </span>
              ) : (
                'Войти'
              )}
            </Button>
          </form>
        </CardContent>
      </CardRoot>
    </div>
  );
}
