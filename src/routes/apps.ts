import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { IdentifyData, IdentifyDataType, TrackData, TrackDataType, BaseMessageResponse } from "../lib/types";
import { validateWriteKey } from "../lib/pg";
import { sendToKafka } from "../lib/kafka";
import { insertEventsDirect } from "../lib/clickhouse";
import { randomUUID } from "crypto";
require("dotenv").config();

// Utility to create timestamp
const getNow = () => new Date().toISOString().slice(0, 19).replace("T", " ");

// Generic handler for auth and message processing
async function handleRequest<T>(
  request: FastifyRequest<{ Body: T }>,
  reply: FastifyReply,
  schema: any,
  topic: string,
  createMessageRaw: (body: T, now: string) => string
) {
  // Validate body
  let body: T;
  try {
    body = schema.parse(request.body);
  } catch (e) {
    return reply.status(400).send({ message: "Invalid input" });
  }

  // Validate auth
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    return reply.status(401).send({ message: "Authorization header missing" });
  }

  const workspaceId = await validateWriteKey(authHeader);
  if (!workspaceId) {
    return reply.status(401).send({ message: "Invalid write key" });
  }

  // Create message
  const now = getNow();
  const message = {
    workspace_id: workspaceId,
    message_raw: createMessageRaw(body, now),
    processing_time: now,
    message_id: randomUUID(),
    event_time: now,
  };

  // Process event (direct insert or Kafka)
  try {
    const useDirectInsert = process.env.USE_DIRECT_INSERT === "true";
    if (useDirectInsert) {
      await insertEventsDirect([message], true); // Async insert for direct mode
    } else {
      await sendToKafka(topic, message); // Kafka with consumer handling insertion
    }
    return reply.status(204).send();
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ message: "Failed to process event" });
  }
}

export default async function publicAppsController(fastify: FastifyInstance) {
  fastify.post<{ Body: IdentifyDataType }>("/identify", async (request, reply) => {
    return handleRequest(
      request,
      reply,
      IdentifyData,
      "identify",
      (body, now) =>
        JSON.stringify({
          user_id: body.userId,
          type: "identify",
          traits: body.traits || {},
          timestamp: now,
        })
    );
  });

  fastify.post<{ Body: TrackDataType }>("/track", async (request, reply) => {
    return handleRequest(
      request,
      reply,
      TrackData,
      "track",
      (body, now) =>
        JSON.stringify({
          user_id: body.userId,
          type: "track",
          event: body.event,
          properties: body.properties || {},
          timestamp: now,
        })
    );
  });
}