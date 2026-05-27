const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const vapidKeys = {
  publicKey: 'BDg2P-0XSuK2usqCC9sgFVRx-nB9FmHX0UI-9g3vy0w2thraqaZ-WbmonQej3mZTL0ZJwUPdG-ql3XkbEnPPeUw',
  privateKey: 'b_AksSxJgrlVubvMQYmr4fm5ifbEeDDlLQ-QLXP9kLA',
};

webpush.setVapidDetails(
  'mailto:fleigenung@protonmail.com', // укажите свой email
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, './'))); // если server.js в корне

// Хранилище подписок
let subscriptions = [];

// Хранилище активных напоминаний: ключ - id заметки, значение - объект с таймером и данными
const reminders = new Map();

const PORT = 3001;
const keyPath = path.join(__dirname, 'localhost-key.pem');
const certPath = path.join(__dirname, 'localhost.pem');

let server;
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  server = https.createServer(
    {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    },
    app
  );
} else {
  server = http.createServer(app);
}

const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  console.log('Клиент подключён:', socket.id);

  // Обработка события 'newTask' от клиента
  socket.on('newTask', (task) => {
    // Рассылаем событие всем подключённым клиентам, включая отправителя
    io.emit('taskAdded', task);

    // Формируем payload для push-уведомления
    const payload = JSON.stringify({
      title: 'Новая задача',
      body: task.text,
    });

    // Отправляем уведомление всем подписанным клиентам
    if (subscriptions.length === 0) {
      console.warn('Push: нет подписчиков. Нажмите «Включить уведомления» в браузере.');
      return;
    }
    subscriptions.forEach((sub) => {
      webpush
        .sendNotification(sub, payload)
        .then(() => console.log('Push отправлен:', sub.endpoint))
        .catch((err) => console.error('Push error:', err.statusCode, err.body || err.message));
    });
  });

  socket.on('newReminder', (reminder) => {
    const { id, text, reminderTime } = reminder;
    const delay = reminderTime - Date.now();
    if (delay <= 0) return;

    // Сохраняем таймер
    const timeoutId = setTimeout(() => {
      // Отправляем push-уведомление всем подписанным клиентам
      const payload = JSON.stringify({
        title: '!!! Напоминание',
        body: text,
        reminderId: id,
      });

      subscriptions.forEach((sub) => {
        webpush.sendNotification(sub, payload).catch((err) => console.error('Push error:', err));
      });

      // Удаляем напоминание из хранилища после отправки
      reminders.delete(id);
    }, delay);

    reminders.set(id, { timeoutId, text, reminderTime });
  });

  socket.on('disconnect', () => {
    console.log('Клиент отключён:', socket.id);
  });
});

// Эндпоинты для управления push-подписками
app.post('/subscribe', (req, res) => {
  if (!req.body || !req.body.endpoint) {
    return res.status(400).json({ message: 'Некорректная подписка' });
  }
  subscriptions = subscriptions.filter((sub) => sub.endpoint !== req.body.endpoint);
  subscriptions.push(req.body);
  console.log('Подписка сохранена. Всего подписчиков:', subscriptions.length);
  res.status(201).json({ message: 'Подписка сохранена' });
});

app.post('/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  subscriptions = subscriptions.filter((sub) => sub.endpoint !== endpoint);
  res.status(200).json({ message: 'Подписка удалена' });
});

app.post('/snooze', (req, res) => {
  const reminderId = parseInt(req.query.reminderId, 10);
  if (!reminderId || !reminders.has(reminderId)) {
    return res.status(404).json({ error: 'Reminder not found' });
  }

  const reminder = reminders.get(reminderId);
  // Отменяем предыдущий таймер
  clearTimeout(reminder.timeoutId);

  // Устанавливаем новый через 5 минут (300 000 мс)
  const newDelay = 5 * 60 * 1000;
  const newTimeoutId = setTimeout(() => {
    const payload = JSON.stringify({
      title: 'Напоминание отложено',
      body: reminder.text,
      reminderId: reminderId,
    });

    subscriptions.forEach((sub) => {
      webpush.sendNotification(sub, payload).catch((err) => console.error('Push error:', err));
    });

    reminders.delete(reminderId);
  }, newDelay);

  // Обновляем хранилище
  reminders.set(reminderId, {
    timeoutId: newTimeoutId,
    text: reminder.text,
    reminderTime: Date.now() + newDelay,
  });

  res.status(200).json({ message: 'Reminder snoozed for 5 minutes' });
});

server.listen(PORT, () => {
  const proto = fs.existsSync(certPath) && fs.existsSync(keyPath) ? 'https' : 'http';
  console.log(`Сервер запущен на ${proto}://localhost:${PORT}`);
});
