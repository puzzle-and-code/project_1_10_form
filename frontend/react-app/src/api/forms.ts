import { httpClient } from './httpClient';
import { createFormsClient } from './formsClient';

export type { FormDto, FormSummary, FormStatus, CreateFormPayload, UpdateFormPayload, QuestionDto, QuestionType, CreateQuestionPayload } from './formsData';
export { getFormsError, getFormsError as getCreateFormError } from './formsClient';

const client = createFormsClient(httpClient);

export const { getForms, createForm, getFormById, patchForm, createQuestion, publishForm, reorderQuestions } = client;
