const express = require("express");
var amqp = require('amqplib/callback_api');

const app = express();
const port = 3000;
app.use(express.urlencoded({extended: false}))

app.get("/", (req, res) => {
    res.sendFile(__dirname + '/index.html')
});


app.post("/process", async (req, res) => {
  let requestData = req.body.text;
  // Отправляем сообщение в RabbitMQ
  amqp.connect('amqp://localhost', (error, connection) => {
    connection.createChannel((error, channel) => {

      // Указываем имя очереди для заданий
      const queueName = 'task_queue';
      channel.assertQueue(queueName, { durable: true });
      // Преобразуем HTTP запрос в задание и отправляем в очередь RabbitMQ
      const task = JSON.stringify(requestData);
      channel.sendToQueue(queueName, Buffer.from(task), { persistent: true });
      console.log('Задание успешно отправлено в очередь:', task);
      // Закрываем соединение с RabbitMQ после отправки задания

      setTimeout(() => {
        connection.close();
      }, 500);
    });
  });
  res.send(`<p>Запрос успешно принят на микросервисе m1 ${requestData}</p>`);
});



// Устанавливаем соединение с RabbitMQ
amqp.connect('amqp://localhost', (error, connection) => {
  connection.createChannel((error, channel) => {
    // Указываем имя очереди для заданий
    const queueName = 'result_queue';

    // Объявляем очередь с опцией durable: true, чтобы задания не терялись при перезапуске RabbitMQ
    channel.assertQueue(queueName, { durable: true });

    // Указываем, что микросервис готов получать одно задание из очереди за раз
    channel.prefetch(1);

    // Обрабатываем задания из очереди
    channel.consume(queueName, (message) => {
      if (message) {
        task = JSON.parse(message.content.toString());
        console.log('Задание успешно принято с очереди:', task)
        // Подтверждаем выполнение задания RabbitMQ
        channel.ack(message);
      }
    });
  });
});






app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});
