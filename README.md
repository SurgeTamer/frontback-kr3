# КР3 — Заметки (PWA)

Веб-приложение для заметок и напоминаний: офлайн-режим через Service Worker, установка на устройство (Web App Manifest), архитектура App Shell, синхронизация в реальном времени (Socket.IO) и push-уведомления с отложенными напоминаниями.

Контрольная работа №3 по дисциплине «Фронтенд и бэкенд разработка» (практические занятия 13–18).

## Возможности

- Просмотр и добавление заметок с сохранением в `localStorage`
- Офлайн-работа: кэширование статики и страниц через Service Worker
- Установка приложения на устройство (PWA, `manifest.json`)
- App Shell: быстрый каркас интерфейса и подгрузка страниц `Главная` / `О приложении`
- Синхронизация между вкладками через WebSocket (Socket.IO)
- Push-уведомления: подписка/отписка, системные уведомления в браузере
- Напоминания по дате и времени с кнопкой «Отложить на 5 минут» (snooze)

## Стек

| Часть | Технологии |
|-------|------------|
| Frontend | HTML, CSS (Chota), JavaScript, Service Worker, Web App Manifest, Push API |
| Backend | Node.js, Express, Socket.IO, web-push |
| Хранение данных | `localStorage` (заметки), память сервера (push-подписки, таймеры напоминаний) |

## Структура репозитория

```
KR3/
└── notes-app/                 # PWA «Заметки»
    ├── index.html             # App Shell (шапка, навигация, контейнер)
    ├── app.js                 # Навигация, заметки, Socket.IO, push
    ├── sw.js                  # Service Worker (кэш, push, snooze)
    ├── manifest.json          # Web App Manifest
    ├── server.js              # Express + Socket.IO + web-push
    ├── package.json
    ├── content/
    │   ├── home.html          # Формы заметок и список
    │   └── about.html         # Страница «О приложении»
    ├── icons/                 # Иконки PWA и уведомлений (PNG/ICO)
    ├── localhost.pem          # Сертификат HTTPS (mkcert)
    ├── localhost-key.pem      # Ключ HTTPS (mkcert)
    └── README.md
```

## Модель заметки

Данные хранятся в `localStorage` под ключом `notes` (массив объектов).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | number | Уникальный идентификатор (`Date.now()`) |
| `text` | string | Текст заметки |
| `reminder` | number \| null | Timestamp напоминания (мс) или `null` для обычной заметки |

Пример записи в `localStorage`:

```json
[
  {
    "id": 1716720000000,
    "text": "Купить молоко",
    "reminder": null
  },
  {
    "id": 1716720001000,
    "text": "Созвон",
    "reminder": 1716723600000
  }
]
```

## Кэши Service Worker

| Имя кэша | Содержимое | Стратегия |
|----------|------------|-----------|
| `notes-cache-v3` | `index.html`, `app.js`, `manifest.json`, иконки | Cache First |
| `dynamic-content-v1` | `/content/home.html`, `/content/about.html` | Network First, офлайн-фолбек на `home.html` |

## Требования

- [Node.js](https://nodejs.org/)
- npm
- Современный браузер (Chrome, Edge, Firefox)
- Для HTTPS локально: [mkcert](https://github.com/FiloSottile/mkcert) (практика №15)

## Установка и запуск

### 1. Зависимости

```bash
cd notes-app
npm install
```

### 2. VAPID-ключи (для push)

```bash
npx web-push generate-vapid-keys
```

### 3. Запуск

```bash
mkcert -install
mkcert localhost 127.0.0.1 ::1
```

### 4. Запуск сервера (порт 3001)

```bash
npm start
```

или:

```bash
node server.js
```

- HTTP: [http://localhost:3001](http://localhost:3001)
- HTTPS (при наличии сертификатов): [https://localhost:3001](https://localhost:3001)

> Открывайте приложение **только через сервер**, не через `file://` — иначе не зарегистрируется Service Worker.

## Push и уведомления
### Подписка

1. Откройте приложение в браузере.
2. Нажмите **«Включить уведомления»** и разрешите уведомления.
3. В консоли сервера: `Подписка сохранена. Всего подписчиков: 1`.

Подписка отправляется на `POST /subscribe`. После перезапуска `node server.js` подписка в памяти сервера сбрасывается — обновите страницу (клиент повторно отправит подписку при наличии активной подписки в браузере).

## Таблица реализации

| Практика | Что требовалось | Как реализовано |
|----------|-----------------|-----------------|
| 13 | Service Worker, офлайн, заметки в `localStorage` | `sw.js` кэширует статику; `app.js` сохраняет заметки в `localStorage`; при офлайне страница и интерфейс работают из кэша и локального хранилища. |
| 14 | Web App Manifest, иконки, установка PWA | `manifest.json` с полями `name`, `short_name`, `start_url`, `display`, цветами и `icons`; подключение в `index.html`; иконки в кэше SW. |
| 15 | HTTPS, App Shell | Каркас в `index.html`, контент в `content/*.html`, загрузка через `fetch` в `app.js`; в SW — Cache First для статики, Network First для `/content/*`; HTTPS через mkcert (`localhost.pem` / `localhost-key.pem`). |
| 16 | WebSocket + Push | `server.js`: Express, Socket.IO, `web-push`, VAPID, `/subscribe` и `/unsubscribe`; клиент: `socket.emit('newTask')`, `socket.on('taskAdded')`, кнопки подписки на push, обработчик `push` в `sw.js`. |
| 17 | Напоминания, snooze | Форма `datetime-local` в `content/home.html`; заметка с полем `reminder`; `socket.emit('newReminder')`; на сервере `setTimeout` и `reminders` Map; в SW — `notificationclick` и `POST /snooze`. |
