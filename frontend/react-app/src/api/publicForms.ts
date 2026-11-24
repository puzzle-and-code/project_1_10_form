import axios from 'axios';
import { API_BASE_URL } from './httpClient';
import { createPublicFormsClient } from './publicFormsClient';

// Участник не обязан входить: нет JWT, refresh и переходов на /login.
const publicHttp = axios.create({ baseURL: API_BASE_URL, withCredentials: false, headers: { Accept: 'application/json' } });
export const publicFormsClient = createPublicFormsClient(publicHttp);
