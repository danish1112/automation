import Fastify from "fastify";
import publicAppsController from "./routes/apps";
require("dotenv").config();

const fastify = Fastify({
  logger: true,
});

fastify.register(publicAppsController, { prefix: "/api" });

async function start() {
  const port = parseInt(process.env.PORT || "3000", 10);
  try {
    await fastify.listen({ port });
    console.log(`Server running on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();