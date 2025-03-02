import { Kafka, Producer } from "kafkajs";
require("dotenv").config();

const kafka = new Kafka({
  clientId: "marketing-automation",
  brokers: process.env.KAFKA_BROKERS?.split(",") || ["localhost:9092"],
});

const producer: Producer = kafka.producer();

export async function connectProducer() {
  await producer.connect();
}

export async function sendToKafka(topic: string, message: any) {
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(message) }],
  });
}

export async function disconnectProducer() {
  await producer.disconnect();
}