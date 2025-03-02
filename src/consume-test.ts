import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "test-consumer",
  brokers: ["localhost:9092"],
});

const consumer = kafka.consumer({ groupId: "test-group" });

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: "identify", fromBeginning: true });
  await consumer.subscribe({ topic: "track", fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log({
        topic,
        partition,
        value: message.value?.toString(),
      });
    },
  });
}

run().catch(console.error);