import { useState } from 'react';
import { TextField, Label, Input, FieldError } from '@heroui/react';
import { EyeIcon, EyeSlashIcon } from './icons';

interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  isInvalid?: boolean;
  errorMessage?: string;
  isDisabled?: boolean;
}

export function PasswordInput({
  label,
  value,
  onChange,
  onBlur,
  isInvalid,
  errorMessage,
  isDisabled,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <TextField
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      isInvalid={isInvalid}
      isDisabled={isDisabled}
      className="flex flex-col gap-1"
    >
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <Input
          type={show ? 'text' : 'password'}
          placeholder="••••••••"
          autoComplete="current-password"
          className="input w-full pr-10"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-default-400 hover:text-default-600 transition-colors bg-transparent border-none cursor-pointer flex items-center p-0"
          tabIndex={-1}
          aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}
        >
          {show ? <EyeSlashIcon size={18} /> : <EyeIcon size={18} />}
        </button>
      </div>
      {errorMessage && (
        <FieldError className="text-danger text-xs">{errorMessage}</FieldError>
      )}
    </TextField>
  );
}
