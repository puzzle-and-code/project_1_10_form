## О проекте
__Name:__ FormBuilder \
__Id:__ project_1_10_form \
__Описание проекта:__ данный проект представляет собой конструктор форм с аналитикой, для опроса пользователей

1. пользователь проходит регистрацию
2. пользователь может либо создать форму, либо заполнить ее
3. если пользователь был создателем, то по окончании опроса, может получить аналитику по ответам пользователей

### Запуск backend в режиме разработки:
1. поднимаем docker: `docker compose up -d`
2. проверяем успешность подключения: `docker ps`
3. переключаем нужную директорию проекта: `cd backend`
4. применяем миграции: `dotnet ef database update`
5. запускаем проект: `dotnet run`

### Запуск frontend в режиме разработки:
1. переходим в нужную директорию: `cd frontend/react-app`
2. устанавливаем зависимости проекта: `npm install`
3. запускаем проект: `npm run dev`

### Запуск в режиме demo:

Одной командой:

Backend: ```docker compose -f backend/docker-compose.yml up --build``` \
Frontend: ```docker compose -f backend/docker-compose.yml up --build``` 

После запуска поднимается db + api + swagger || node.js server

API(Swagger): [http://localhost:8080/swagger/index.html](http://localhost:8080/swagger/index.html)

WEB: [http://localhost:5173/](http://localhost:5173/)



### Минимальные версии для запуска:
.NET SDK - 8.0.0 \
Node.js - 24.0.0 \
Docker - 4.0.0 