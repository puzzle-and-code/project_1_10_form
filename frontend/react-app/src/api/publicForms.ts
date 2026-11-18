import axios from 'axios';
import { API_BASE_URL } from './httpClient';
import { createDemoFormsStore } from './demoForms';
import { createPublicFormsClient } from './publicFormsClient';
import { FormsError } from './formsData';

// Участник не обязан входить: нет JWT, refresh и переходов на /login.
const publicHttp = axios.create({ baseURL: API_BASE_URL, withCredentials: false, headers: { Accept: 'application/json' } });
export function publicFormsClient(demoRequested: boolean) {
  return createPublicFormsClient(publicHttp, () => {
    if (!demoRequested) return null;
    if (!import.meta.env.DEV) throw new FormsError('Эта ссылка недоступна. Запросите актуальную ссылку у автора формы.');
    try { return createDemoFormsStore(window.localStorage); }
    catch { throw new FormsError('Браузер запретил доступ к сохранённой форме.'); }
  });
}
