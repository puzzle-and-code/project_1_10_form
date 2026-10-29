export function validateName(value: string): string {
  const name = value.trim();
  if (!name) return 'Введите имя';
  return name.length <= 100 ? '' : 'Имя должно быть не длиннее 100 символов';
}

export function validateEmail(value: string): string {
  const email = value.trim();
  if (!email) return 'Введите email';
  return email.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? '' : 'Введите корректный email';
}

