import Fastify from "fastify";
import publicAppsController from "./routes/apps";
import { connectProducer, disconnectProducer } from "./lib/kafka";
require("dotenv").config();

const fastify = Fastify({ logger: true });

fastify.register(publicAppsController, { prefix: "/api" });

async function start() {
  const port = parseInt(process.env.PORT || "3000", 10);
  try {
    await connectProducer(); // Connect Kafka producer
    await fastify.listen({ port });
    console.log(`Server running on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  await disconnectProducer(); // Cleanup Kafka producer
  await fastify.close();
  process.exit(0);
});

start();