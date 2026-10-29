# React + Vite

## Страница «Мои формы» и подключение к API

Запускать команды из `frontend/react-app`:

```powershell
npm ci
npm run dev
```

В `.env.development` указаны `VITE_API_URL=/api` и
`API_PROXY_TARGET=http://localhost:8080` — адрес существующего бэкенда в Docker.
Если адрес бэкенда другой, переопределите `API_PROXY_TARGET` в `.env.development.local`
и перезапустите Vite. Этот прокси действует при `npm run dev`; настройки
production-развёртывания задаются отдельно.

Страница `/forms` доступна после входа. Сейчас включён `VITE_FORMS_MODE=local`:
создание и список работают на фронте, черновики сохраняются в `localStorage`
отдельно для каждого `user.id`, включая UUID. После создания форма появляется
в списке сразу. После перезагрузки и повторного входа в тот же аккаунт она
загружается из хранилища браузера. Тестового массива и количества вопросов нет.
Поиск и фильтры применяются к сохранённым формам.

В модальном окне и над списком явно указано локальное хранение. Эти черновики
не отправляются на сервер и не доступны на другом устройстве или в другом
браузере/адресе сайта. Очистка данных сайта удаляет их. При запрете записи,
переполнении или повреждении хранилища показывается ошибка; существующие данные
не перезаписываются пустым списком. Авторизация по-прежнему использует бэкенд.

Режим по умолчанию для сборки также `local`. После согласования бэкенда можно
задать `VITE_FORMS_MODE=api` в переменных Vite и перезапустить dev-сервер или
пересобрать приложение. Это явный выбор источника данных, а не автоматический
переход на локальные данные при ошибке API. Автоматического переноса локальных
черновиков на сервер пока нет.

В режиме `api` страница запрашивает `GET /api/forms` через общий Axios-клиент,
который добавляет `Authorization: Bearer <accessToken>`.

В текущей версии бэкенда `GET /api/forms` ещё нет (в Swagger есть только
`POST /api/CreationForms/draft`). Код бэкенда в рамках этой страницы не менялся.
Для списка нужен реализованный бэкендом контракт: массив форм текущего
пользователя, например:

```json
[
  {
    "id": 1,
    "title": "Обратная связь",
    "description": "Ваше мнение",
    "status": "draft",
    "responsesCount": 0,
    "updatedAt": "2026-10-29T09:00:00Z"
  }
]
```

Это ожидаемый контракт фронта, а не подтверждённый ответ существующего сервера.
`description` и `responsesCount` могут отсутствовать; неизвестное число ответов
показывается как «—», а не как ноль. `id` может быть строкой или числом.
Статусы `draft`, `published`, `closed` принимаются без учёта регистра.
Пустой список — `[]`. Если сервер вернёт другой формат, адаптер находится
в `src/api/formsData.ts`, путь запроса — в `src/api/forms.ts`.

Регистрация отправляет `POST /api/auth/register` с `email`, `password`,
`display_name`. Поле «Имя» сохраняется как имя профиля (`display_name`).
Окно успеха появляется только после
успешного ответа сервера. Фиктивный вход `admin@example.com / password123` удалён.

Вход работает по email и паролю в соответствии с текущим `LoginDto`.
Формат запросов находится в `src/api/authContract.ts`. Refresh на бэкенде пока
не реализован, поэтому после перезагрузки страницы понадобится новый вход.

Проверки (Node.js 24): `npm test`, `npm run build`, `npx tsc --noEmit`, `npm run lint`.

## Создание формы

«Создать форму» открывает модальное окно HeroUI поверх `/forms`.
Компонент находится в `src/pages/CreateForm/CreateForm.tsx`. Адреса `/createform` и
`/editform` перенаправляют на `/forms?create=1`, открывая это же окно.
Название обязательно: подсказка «Укажите название» видна сразу, пустая строка
или пробелы не отправляются. Описание необязательно. Ограничения интерфейса:
200 символов для названия и 2000 для описания. При ошибке текст остаётся в окне;
во время отправки кнопки, Escape и закрытие по фону заблокированы.

В текущем режиме `local` окно закрывается только после успешной записи в
хранилище браузера. Карточка со статусом «Черновик» появляется первой в списке,
поиск и фильтры сбрасываются. Заголовок, описание, ID и дата сохраняются между
открытиями страницы. Реализация хранилища — `src/api/localForms.ts`.

В режиме `api` запрос соответствует предоставленному Swagger:
`POST /api/CreationForms/draft?ownerId=<числовой ID текущего пользователя>`,
JSON `{ "title": "Обратная связь", "description": "Ваше мнение" }`.
Общий Axios-клиент добавляет Bearer-токен. Ответ контроллера —
`{ "message": "Черновик успешно создан", "formId": 12 }`.
Только после подтверждённого `formId` окно закрывается, фильтры сбрасываются,
а форма добавляется первой в список со статусом «Черновик» без перезагрузки.
Дата и число ответов, отсутствующие в ответе создания, отображаются как «—».
Поздний GET или ошибка загрузки списка не скрывают подтверждённую новую форму;
последующая загрузка с тем же ID обновляет её без дублей. Этот список хранится
в памяти страницы и сбрасывается при её закрытии или смене аккаунта.

**Остаётся несовместимость бэкенда:** `ownerId` в Swagger имеет тип int32,
но `user.id` авторизации — UUID. Отдельного числового ID в ответе входа нет.
Перед запросом фронт проверяет ID; UUID, отсутствующие и некорректные значения
не преобразуются в произвольное число. В этом случае показывается ошибка,
запрос создания не отправляется. Бэкенд-разработчику нужно согласовать
идентификатор владельца с авторизацией (желательно определять владельца по токену).
Также пока отсутствует `GET /api/forms` для загрузки полного списка.
Код бэкенда не изменялся. Эти ограничения режима API не мешают текущему
локальному созданию и просмотру черновиков.

## Структура страниц

Каждая страница находится в отдельной папке внутри `src/pages`:

```text
pages/
├── Authorization/
│   ├── AuthorizationPage.tsx
│   ├── useLoginForm.ts
│   └── index.ts
├── CreateForm/
│   ├── CreateForm.tsx
│   └── index.ts
├── Forms/
│   ├── FormsPage.tsx
│   └── index.ts
├── Home/
│   ├── HomePage.tsx
│   └── index.ts
└── Sign/
    ├── SignPage.tsx
    └── index.ts
```

`index.ts` экспортирует компонент страницы, поэтому в `App.tsx` используются
импорты папок: например, `import HomePage from './pages/Home'`.
`CreateForm` — модальное окно, которое используется внутри страницы `Forms`.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
