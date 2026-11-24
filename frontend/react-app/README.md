# React + Vite

## Список и редактор форм

Запуск: `npm ci`, затем `npm run dev`. Главная страница перенаправляет на
`/forms`. Карточка «Подробнее» открывает `/forms/:id` с названием, описанием,
вопросами и публикацией. «К списку» возвращает к актуальным карточкам.
`/createform` и `/editform` открывают окно создания новой формы.

Перетаскивание за значок ⠿ и кнопки «Выше / Ниже» в редакторе сохраняют порядок
вопросов. Esc отменяет перетаскивание, Alt + ↑ / ↓ на значке перемещают вопрос
с клавиатуры. Если запрос завершится ошибкой, восстанавливается прежний порядок.
Страница участника
поддерживает текст, число, один и несколько вариантов, обязательные поля,
подтверждение отправки после ответа сервера и повтор после ошибки.

Приложение обращается к API через `/api` и Vite-прокси на
`http://localhost:8080` (переопределяется `API_PROXY_TARGET`).
Ошибки запросов показываются на странице.

Проверки: `npm test`, `npm run build`, `npx tsc --noEmit`, `npm run lint`.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
