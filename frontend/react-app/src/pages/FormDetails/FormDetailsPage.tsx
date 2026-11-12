import { Link, useNavigate, useParams } from 'react-router';
import {
  Alert,
  Badge,
  Button,
  Card,
  Chip,
  FieldError,
  Input,
  Label,
  Skeleton,
  Spinner,
  TextArea,
  TextField,
} from '@heroui/react';
import { FormQuestions } from './FormQuestions';
import { useFormDetails } from './useFormDetails';

export default function FormDetailsPage() {
  const { id } = useParams();
  return <FormDetails key={id} />;
}

function FormDetails() {
  const navigate = useNavigate();
  const {
    id,
    form,
    title,
    description,
    setTitle,
    setDescription,
    errors,
    touched,
    isValid,
    isDirty,
    isLoading,
    isSaving,
    isPublishing,
    notFound,
    error,
    saveError,
    saveSuccess,
    publishError,
    publishSuccess,
    copied,
    statusLabel,
    isDraft,
    isPublished,
    isCompleted,
    questionsCount,
    appendQuestion,
    hideForm,
    hasQuestions,
    canPublish,
    cannotPublishReason,
    publicPath,
    publicUrl,
    setSaveSuccess,
    setPublishSuccess,
    handleBlur,
    handleSave,
    handlePublish,
    handleCopyLink,
    handleReset,
    reload,
  } = useFormDetails();

  // -------------------------------------------------------------------------
  // Состояние 1: Загрузка (Loading)
  // -------------------------------------------------------------------------
  if (isLoading) {
    return (
      <section className="mx-auto w-full max-w-3xl py-8">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-4 w-24 rounded-lg" />
          <span className="text-default-400">/</span>
          <Skeleton className="h-4 w-32 rounded-lg" />
        </div>

        <div className="flex flex-col gap-6">
          <Card className="p-6 md:p-8 flex flex-col gap-6 shadow-sm border border-default-200">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </Card>
          <Card className="p-6 md:p-8 flex flex-col gap-6 shadow-sm border border-default-200">
            <Skeleton className="h-8 w-64 rounded-lg" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </Card>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------------------
  // Состояние 2: 404 — Форма не найдена
  // -------------------------------------------------------------------------
  if (notFound) {
    return (
      <section className="mx-auto w-full max-w-xl py-16 px-4">
        <Card className="p-8 text-center flex flex-col items-center gap-4 shadow-md border border-default-200">
          <div className="w-16 h-16 rounded-2xl bg-danger/10 text-danger flex items-center justify-center text-2xl font-bold">
            404
          </div>
          <Card.Header className="flex flex-col gap-1 p-0">
            <Card.Title className="text-2xl font-semibold text-default-900">
              Форма не найдена
            </Card.Title>
            <Card.Description className="text-default-500 max-w-sm">
              Формы с идентификатором <span className="font-mono text-default-700 font-medium">«{id}»</span> не существует, либо у вас нет прав на её просмотр.
            </Card.Description>
          </Card.Header>
          <Card.Footer className="flex flex-wrap justify-center gap-3 pt-4 p-0">
            <Button
              variant="secondary"
              onPress={() => navigate('/')}
            >
              На главную
            </Button>
            <Button
              variant="primary"
              onPress={() => navigate('/editform')}
            >
              Создать форму
            </Button>
          </Card.Footer>
        </Card>
      </section>
    );
  }

  // -------------------------------------------------------------------------
  // Состояние 3: Ошибка сети / сервера при первичной загрузке
  // -------------------------------------------------------------------------
  if (error || !form) {
    return (
      <section className="mx-auto w-full max-w-xl py-12 px-4">
        <Card className="p-6 flex flex-col gap-5 border border-danger/20 bg-danger/5 shadow-sm">
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Ошибка загрузки формы</Alert.Title>
              <Alert.Description>
                {error || 'Не удалось получить данные с сервера. Проверьте подключение к интернету.'}
              </Alert.Description>
            </Alert.Content>
          </Alert>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onPress={() => navigate('/')}
            >
              Назад
            </Button>
            <Button
              variant="primary"
              onPress={reload}
            >
              Попробовать снова
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  // -------------------------------------------------------------------------
  // Состояние 4: Основной экран формы
  // -------------------------------------------------------------------------
  const formattedUpdated = form.updatedAt
    ? new Date(form.updatedAt).toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <section className="mx-auto w-full max-w-3xl py-6 px-4 flex flex-col gap-6">
      {/* Навигационные хлебные крошки */}
      <nav className="flex items-center gap-2 text-sm text-default-500">
        <Link to="/" className="hover:text-primary transition-colors">
          Главная
        </Link>
        <span>/</span>
        <Link to="/editform" className="hover:text-primary transition-colors">
          Формы
        </Link>
        <span>/</span>
        <span className="text-default-800 font-medium truncate max-w-[200px]">
          {form.title || 'Редактирование'}
        </span>
      </nav>

      {/* =================================================================== */}
      {/* БЛОК «ПУБЛИКАЦИЯ»                                                  */}
      {/* =================================================================== */}
      <Card className="p-6 md:p-7 shadow-sm border border-default-200 bg-white">
        <Card.Header className="flex flex-col gap-2 p-0 pb-5 border-b border-default-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🚀</span>
              <h2 className="text-xl font-bold text-default-900 tracking-tight">
                Публикация
              </h2>
            </div>

            {/* Критерий 1: Человекочитаемая подпись статуса */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-default-500">Статус:</span>
              <Chip
                size="md"
                variant="secondary"
                className={`font-semibold px-3 py-1 ${
                  isPublished
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : isCompleted
                      ? 'bg-default-200 text-default-700'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {statusLabel}
              </Chip>
            </div>
          </div>
        </Card.Header>

        <Card.Content className="p-0 pt-5 flex flex-col gap-4">
          {/* Уведомление об успешной публикации */}
          {publishSuccess && (
            <Alert status="success">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Форма успешно опубликована!</Alert.Title>
                <Alert.Description>
                  Статус обновлён на «Опубликована». Публичная ссылка готова для отправки респондентам.
                </Alert.Description>
              </Alert.Content>
              <Button
                size="sm"
                variant="secondary"
                onPress={() => setPublishSuccess(false)}
              >
                ОК
              </Button>
            </Alert>
          )}

          {/* Критерий 7: Ошибка запроса показана в блоке, статус остаётся прежним */}
          {publishError && (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Не удалось опубликовать форму</Alert.Title>
                <Alert.Description>{publishError}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          {/* Вариант 1: Форма в статусе «Черновик» */}
          {isDraft && (
            <div className="flex flex-col gap-4 bg-default-50 p-4 rounded-xl border border-default-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-default-800">
                    Опубликовать форму
                  </span>
                  <span className="text-xs text-default-500">
                    Вопросов в форме: <span className="font-semibold text-default-700">{questionsCount}</span>
                  </span>
                </div>

                {/* Критерий 2 и 3: кнопка активна если есть вопросы, неактивна если 0 вопросов */}
                <Button
                  id="publish-form-button"
                  type="button"
                  variant="primary"
                  isDisabled={!canPublish || isPublishing}
                  onPress={handlePublish}
                  className="min-w-[150px]"
                >
                  {isPublishing ? (
                    <span className="flex items-center gap-2">
                      <Spinner size="sm" />
                      Публикация...
                    </span>
                  ) : (
                    'Опубликовать'
                  )}
                </Button>
              </div>

              {/* Критерий 3: если неудалённых вопросов нет — виден текст, почему опубликовать нельзя */}
              {cannotPublishReason && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-lg flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{cannotPublishReason}</span>
                </div>
              )}

              {hasQuestions && !cannotPublishReason && (
                <p className="text-xs text-default-400">
                  После публикации форма перейдёт в статус «Опубликована» и получит постоянную ссылку для сбора ответов.
                </p>
              )}
            </div>
          )}

          {/* Вариант 2: Форма в статусе «Опубликована» (Критерий 4, 5, 6) */}
          {isPublished && (
            <div className="flex flex-col gap-3 bg-emerald-50/70 p-4 rounded-xl border border-emerald-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-emerald-900 flex items-center gap-1.5">
                  <span>✓</span> Форма активна и доступна для прохождения
                </span>
                <span className="text-xs text-emerald-700">
                  {publicPath}
                </span>
              </div>

              {/* Критерий 5: появляется ссылка /f/{id} и копирование в буфер */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 bg-white border border-emerald-300 rounded-lg px-3 py-2 text-xs font-mono text-default-800 truncate select-all">
                  {publicUrl}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    id="copy-link-button"
                    type="button"
                    variant="secondary"
                    size="sm"
                    onPress={handleCopyLink}
                    className="min-w-[110px]"
                  >
                    {copied ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        ✓ Скопировано!
                      </span>
                    ) : (
                      'Копировать'
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onPress={() => window.open(publicPath, '_blank')}
                  >
                    Открыть ↗
                  </Button>
                </div>
              </div>
              <p className="text-xs text-emerald-800">
                Повторно опубликовать нельзя: у опубликованной формы кнопки «Опубликовать» нет.
              </p>
            </div>
          )}

          {/* Вариант 3: Форма в статусе «Завершена» (Критерий 6) */}
          {isCompleted && (
            <div className="bg-default-100 p-4 rounded-xl border border-default-200 text-xs text-default-600 flex items-center gap-2">
              <span>🔒</span>
              <span>Сбор ответов по этой форме завершён. Кнопка «Опубликовать» скрыта.</span>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* =================================================================== */}
      {/* БЛОК «НАСТРОЙКИ ФОРМЫ» (Название и описание)                        */}
      {/* =================================================================== */}
      <Card className="p-6 md:p-8 shadow-sm border border-default-200 bg-white">
        <Card.Header className="flex flex-col gap-2 p-0 pb-6 border-b border-default-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-default-900 tracking-tight">
              Настройки полей формы
            </h1>

            {isDirty ? (
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs px-2.5 py-1 rounded-full">
                Есть несохранённые правки
              </Badge>
            ) : (
              <span className="text-xs text-default-400">
                Все изменения сохранены
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-default-500">
            <span>ID: <code className="font-mono text-default-600">{form.id}</code></span>
            {formattedUpdated && <span>Обновлено: {formattedUpdated}</span>}
            <span className="text-primary-600 font-medium">
              Оба поля можно изменять в любом статусе формы
            </span>
          </div>
        </Card.Header>

        {/* Уведомление об успешном сохранении полей */}
        {saveSuccess && (
          <div className="mt-5">
            <Alert status="success">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Изменения успешно сохранены</Alert.Title>
                <Alert.Description>
                  Новые название и описание вступили в силу без перезагрузки страницы.
                </Alert.Description>
              </Alert.Content>
              <Button
                size="sm"
                variant="secondary"
                onPress={() => setSaveSuccess(false)}
              >
                Закрыть
              </Button>
            </Alert>
          </div>
        )}

        {/* Ошибка при сохранении полей (PATCH) */}
        {saveError && (
          <div className="mt-5">
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Не удалось сохранить изменения</Alert.Title>
                <Alert.Description>{saveError}</Alert.Description>
              </Alert.Content>
            </Alert>
          </div>
        )}

        <form onSubmit={handleSave} noValidate className="flex flex-col gap-6 pt-6">
          {/* Поле: Название формы */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="form-title" className="text-sm font-semibold text-default-800">
                Название формы <span className="text-danger">*</span>
              </Label>
              <span
                className={`text-xs font-mono ${
                  title.length > 200
                    ? 'text-danger font-bold'
                    : title.length >= 180
                      ? 'text-warning'
                      : 'text-default-400'
                }`}
              >
                {title.length} / 200
              </span>
            </div>

            <TextField
              value={title}
              onChange={setTitle}
              onBlur={() => handleBlur('title')}
              isRequired
              isInvalid={Boolean((touched.title || !title.trim()) && errors.title)}
              isDisabled={isSaving}
              className="w-full"
            >
              <Input
                id="form-title"
                name="title"
                type="text"
                placeholder="Например: демотест1"
                autoComplete="off"
                className="w-full font-medium"
              />
              <FieldError className="text-danger text-xs mt-1">
                {errors.title}
              </FieldError>
            </TextField>
            <p className="text-xs text-default-400">
              Обязательное поле. Длина от 1 до 200 символов.
            </p>
          </div>

          {/* Поле: Описание формы */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="form-description" className="text-sm font-semibold text-default-800">
                Описание формы
              </Label>
              <span
                className={`text-xs font-mono ${
                  description.length > 2500
                    ? 'text-danger font-bold'
                    : description.length >= 2400
                      ? 'text-warning'
                      : 'text-default-400'
                }`}
              >
                {description.length} / 2500
              </span>
            </div>

            <TextArea
              id="form-description"
              name="description"
              placeholder="Добавьте пояснения или инструкции (необязательно, можно очистить)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => handleBlur('description')}
              rows={4}
              disabled={isSaving}
              className={`w-full rounded-xl p-3 border text-sm transition-colors outline-none resize-y ${
                errors.description
                  ? 'border-danger focus:ring-2 focus:ring-danger/20'
                  : 'border-default-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
              }`}
            />

            {errors.description && (
              <p className="text-danger text-xs mt-1">
                {errors.description}
              </p>
            )}

            <p className="text-xs text-default-400">
              Необязательное поле. До 2500 символов. Описание можно очистить в любой момент.
            </p>
          </div>

          {/* Панель действий */}
          <Card.Footer className="flex flex-wrap items-center justify-between gap-4 pt-6 p-0 border-t border-default-100">
            <Button
              type="button"
              variant="secondary"
              onPress={() => navigate('/')}
              isDisabled={isSaving}
            >
              К списку
            </Button>

            <div className="flex items-center gap-3">
              {isDirty && (
                <Button
                  type="button"
                  variant="secondary"
                  onPress={handleReset}
                  isDisabled={isSaving}
                >
                  Сбросить
                </Button>
              )}

              <Button
                id="save-form-button"
                type="submit"
                variant="primary"
                isDisabled={isSaving || !isValid || !title.trim()}
                className="min-w-[150px]"
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" />
                    Сохранение...
                  </span>
                ) : (
                  'Сохранить'
                )}
              </Button>
            </div>
          </Card.Footer>
        </form>
      </Card>
      <FormQuestions
        formId={form.id}
        questions={form.questions ?? []}
        isCompleted={isCompleted}
        onCreated={appendQuestion}
        onNotFound={hideForm}
      />
    </section>
  );
}
