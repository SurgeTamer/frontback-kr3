# Notes App (PWA + WebSocket + Push + Reminders)

Приложение “Заметки” — единый проект, проходящий требования практик №13–№17:

- Service Worker: офлайн-режим, Cache Storage для статики и Network First для `/content/*`
- Web App Manifest: поддержка установки на устройство
- App Shell: быстрый каркас интерфейса + подгрузка страниц
- WebSocket (Socket.IO): синхронизация задач между вкладками
- Push API: системные уведомления + управление подпиской
- Напоминания: scheduled push через `setTimeout` + действие “Отложить на 5 минут”

## Структура

- `index.html`, `app.js`, `sw.js`, `manifest.json`, `server.js`
- `content/home.html`, `content/about.html`
- `icons/*` (необходимы иконки для manifest и уведомлений)

## 1) Установка зависимостей

В папке `notes-app`:

```bash
npm install
```

## 2) VAPID-ключи

Сгенерируйте ключи:

```bash
npx web-push generate-vapid-keys
```

И вставьте значения:

- в `server.js` в `vapidKeys.publicKey` и `vapidKeys.privateKey`
- в `app.js` в `applicationServerKey` (строка вместо `ВАШ_ПУБЛИЧНЫЙ_VAPID_КЛЮЧ`)

## 3) HTTPS (требование практики №15)

Для mkcert:

```bash
mkcert -install
mkcert localhost 127.0.0.1 ::1
```

Файлы `localhost.pem` и `localhost-key.pem` должны лежать в этой же папке (`notes-app/`),
тогда `server.js` поднимет HTTPS на `https://localhost:3001`.

Если сертификатов нет — сервер упадёт на HTTP (на `localhost` Service Worker/Push всё равно обычно работают как secure context),
но для проверки “по HTTPS” лучше добавить сертификаты.

## 4) Запуск

```bash
node server.js
```

Откройте:

- `https://localhost:3001` (или `http://localhost:3001`, если сертификатов нет)

Далее в интерфейсе:

- нажмите “Включить уведомления” и разрешите уведомления в браузере
- откройте вторую вкладку с тем же адресом
- добавляйте заметки: во второй вкладке появится WebSocket-сообщение, а также придёт push
- добавляйте напоминания: после указанного времени придёт notification с кнопкой “Отложить на 5 минут”

## 5) Проверка офлайна (Service Worker)

1. Откройте приложение в DevTools.
2. Вкладка `Application` → `Service Workers` убедитесь, что SW активирован.
3. Вкладка `Application` → `Cache Storage` проверьте два кэша:
   - `notes-cache-v2` (статические ресурсы)
   - `dynamic-content-v1` (страницы `/content/*`)
4. Отключите сеть и перезагрузите — каркас и страницы должны отработать из кэша.

## Что нужно добавить с вашей стороны для “готовой” сдачи

1. Папку `icons/` и файлы по путям, которые используются в коде:
   - `icons/favicon.ico`
   - `icons/favicon-16x16.png`, `icons/favicon-32x32.png`, `icons/favicon-48x48.png`
   - `icons/favicon-128x128.png`, `icons/favicon-256x256.png`, `icons/favicon-512x512.png`
2. Ваши реальные VAPID-ключи (см. раздел “2) VAPID-ключи”).
3. Сертификаты `localhost.pem` и `localhost-key.pem` (для проверки требования “по HTTPS”).

"# frontback-kr3" 
