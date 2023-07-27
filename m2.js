const amqp = require('amqplib/callback_api');

// Устанавливаем соединение с RabbitMQ
amqp.connect('amqp://localhost', (error, connection) => {
  connection.createChannel((error, channel) => {
    // Указываем имя очереди для заданий
    const queueName = 'task_queue';

    // Объявляем очередь с опцией durable: true, чтобы задания не терялись при перезапуске RabbitMQ
    channel.assertQueue(queueName, { durable: true });

    console.log('Микросервис m2 готов к обработке заданий');

    // Указываем, что микросервис готов получать одно задание из очереди за раз
    channel.prefetch(1);

    // Обрабатываем задания из очереди
    channel.consume(queueName, (message) => {
      if (message) {
        const task = JSON.parse(message.content.toString());
        let processedTask = task.toUpperCase() + ' обработано сообщение';
        
        console.log(`До ${task} --- После ${processedTask}`)
        // Подтверждаем выполнение задания RabbitMQ
        channel.ack(message);

        // Отправляем результат обработки задания обратно в RabbitMQ
        const resultQueueName = 'result_queue';
        channel.assertQueue(resultQueueName, { durable: true });
        channel.sendToQueue(resultQueueName, Buffer.from(JSON.stringify(processedTask)), { persistent: true });
      }
    });
  });
});
