import { httpClient } from './httpClient';
import { demoSession } from './demoSession';
import { createDemoFormsStore } from './demoForms';
import { createFormsClient } from './formsClient';
import { FormsError } from './formsData';

export type { FormDto, FormSummary, FormStatus, CreateFormPayload, UpdateFormPayload, QuestionDto, QuestionType, CreateQuestionPayload } from './formsData';
export { getFormsError, getFormsError as getCreateFormError } from './formsClient';

export const isDemoFormsSession = demoSession.isActive;

const client = createFormsClient(httpClient, () => {
  if (!isDemoFormsSession()) return null;
  try { return createDemoFormsStore(window.localStorage); }
  catch { throw new FormsError('Браузер запретил хранение форм.'); }
});

export const { getForms, createForm, getFormById, patchForm, createQuestion, publishForm, reorderQuestions } = client;
