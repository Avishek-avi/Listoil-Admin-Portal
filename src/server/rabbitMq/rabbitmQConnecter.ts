// rabbitmqConnector.ts
import { BaseMQConnector } from './baseConnecter';
import * as amqp from 'amqplib';

export class RabbitMQConnector extends BaseMQConnector {
    private conn?: amqp.ChannelModel;
    private channel?: amqp.Channel;
    private readonly EXCHANGE_NAME = "main_event_bus";

    private async ensure() {
        if (this.channel && this.conn) return;
        const url = `amqp://${process.env.BROKER_USERNAME}:${process.env.BROKER_PASSWORD}@${process.env.BROKER_IP}` || "amqp://localhost";
        this.conn = await amqp.connect(url);
        this.channel = await this.conn.createChannel();

        // This turns RabbitMQ into an Event Bus (broadcast mode)
        await this.channel.assertExchange(this.EXCHANGE_NAME, 'topic', { durable: true });
    }

    async publish(topic: string, data: any) {
        await this.ensure();
        const payload = Buffer.from(JSON.stringify({
            event: topic,
            data,
            timestamp: new Date().toISOString()
        }));

        // Broadcast to the exchange using the topic as the routing key
        this.channel!.publish(this.EXCHANGE_NAME, topic, payload, { persistent: true });
        console.log(`[EventBus] Published: ${topic}`);
    }

    async subscribe(topic: string, handler: (payload: any) => Promise<void>) {
        await this.ensure();

        /** * Since all your comms are in ONE Node container, we name the queue 
         * based on the handler's task. This prevents "round-robin" stealing.
         * Example: 'email_service_USER_CREATED'
         */
        const consumerName = process.env.CONSUMER_NAME || 'backend_node';
        const queueName = `${consumerName}_${topic.replace(/\*/g, 'all')}`;

        const q = await this.channel!.assertQueue(queueName, { durable: true });

        // Bind the queue to the pattern (e.g., "user.*" or "TICKET_CREATE")
        await this.channel!.bindQueue(q.queue, this.EXCHANGE_NAME, topic);

        this.channel!.consume(q.queue, async (msg) => {
            if (!msg) return;
            try {
                const content = JSON.parse(msg.content.toString());
                // We pass only the .data property to the handler to keep it clean
                await handler(content.data);
                this.channel!.ack(msg);
            } catch (err) {
                console.error(`[EventBus] Error processing ${topic}:`, err);
                this.channel!.nack(msg, false, true); // Requeue for retry
            }
        });
    }

    async close() {
        await this.channel?.close();
        await this.conn?.close();
    }
}