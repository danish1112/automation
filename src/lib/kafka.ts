import { Kafka, Producer, Consumer } from "kafkajs";
import { insertEventsDirect } from "./clickhouse";

require("dotenv").config();

const kafka = new Kafka({
  clientId: "marketing-automation",
  brokers: process.env.KAFKA_BROKERS?.split(",") || ["localhost:9092"],
  logLevel: 4, // DEBUG level
  retry: { initialRetryTime: 100, retries: 15, maxRetryTime: 60000 },
  connectionTimeout: 15000,
  requestTimeout: 30000,
});

const producer: Producer = kafka.producer();
const consumer: Consumer = kafka.consumer({ groupId: "clickhouse-consumer-group" });

export async function connectProducer() {
  try {
    await producer.connect();
    console.log("Kafka producer connected");
    const admin = kafka.admin();
    await admin.connect();
    await admin.createTopics({
      waitForLeaders: true,
      topics: [
        { topic: "identify", numPartitions: 1, replicationFactor: 1 },
        { topic: "track", numPartitions: 1, replicationFactor: 1 },
      ],
    });
    const metadata = await admin.fetchTopicMetadata({ topics: ["identify", "track"] });
    console.log("Kafka topics metadata:", metadata);
    await admin.disconnect();
  } catch (err) {
    console.error("Failed to connect Kafka producer:", err);
    throw err;
  }
}

export async function sendToKafka(topic: string, message: any) {
  try {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
    console.log(`Message sent to topic ${topic}:`, message);
  } catch (err) {
    console.error(`Failed to send message to topic ${topic}:`, err);
    throw err;
  }
}

export async function disconnectProducer() {
  try {
    await producer.disconnect();
    console.log("Kafka producer disconnected");
  } catch (err) {
    console.error("Failed to disconnect Kafka producer:", err);
  }
}

export async function startKafkaConsumer() {
  try {
    await consumer.connect();
    await consumer.subscribe({ topics: ["identify", "track"], fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value!.toString());
          console.log(`Consumed event from ${topic}:`, event);
          await insertEventsDirect([event], false); // Synchronous for reliability
          console.log(`Inserted event into ClickHouse from ${topic}`);
        } catch (error) {
          console.error(`Error processing message from ${topic}:`, error);
        }
      },
    });
    console.log("Kafka consumer started");
  } catch (err) {
    console.error("Failed to start Kafka consumer:", err);
    throw err;
  }
}

// Start consumer in background
startKafkaConsumer().catch(console.error);

export { producer, consumer };