export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export function loginBody(payload: LoginPayload) {
  return { email: payload.email.trim(), password: payload.password };
}

export function registrationBody(payload: RegisterPayload) {
  return {
    email: payload.email.trim(),
    password: payload.password,
    display_name: payload.name.trim(),
  };
}
