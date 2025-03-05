import { FastifyInstance } from "fastify";
import { IdentifyData, IdentifyDataType, TrackData, TrackDataType, BaseMessageResponse } from "../lib/types";
import { validateWriteKey } from "../lib/pg";
import { sendToKafka } from "../lib/kafka";
import { insertEventsDirect } from "../lib/clickhouse";
import { randomUUID } from "crypto";
require("dotenv").config();

export default async function publicAppsController(fastify: FastifyInstance) {
  fastify.post<{ Body: IdentifyDataType }>("/identify", async (request, reply) => {
    let body: IdentifyDataType;
    try {
      body = IdentifyData.parse(request.body);
    } catch (e) {
      return reply.status(400).send({ message: "Invalid input" });
    }

    const authHeader = request.headers.authorization as string | undefined;
    if (!authHeader) {
      return reply.status(401).send({ message: "Authorization header missing" });
    }

    const workspaceId = await validateWriteKey(authHeader);
    if (!workspaceId) {
      return reply.status(401).send({ message: "Invalid write key" });
    }

    const now = new Date().toISOString().slice(0, 19).replace("T", " "); // e.g., "2025-03-05 20:02:18"
    const message = {
      workspace_id: workspaceId,
      message_raw: JSON.stringify({
        user_id: body.userId,
        type: "identify",
        traits: body.traits || {},
        timestamp: now,
      }),
      processing_time: now,  // Nullable, keeping full ISO 8601 is fine here
      message_id: randomUUID(),
      event_time: now,  // Must match DateTime format for partitioning
    };

    try {
      if (process.env.USE_DIRECT_INSERT === "true") {
        await insertEventsDirect([message], true);
      } else {
        await sendToKafka("identify", message);
      }
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ message: "Failed to process event" });
    }

    return reply.status(204).send();
  });

  fastify.post<{ Body: TrackDataType }>("/track", async (request, reply) => {
    let body: TrackDataType;
    try {
      body = TrackData.parse(request.body);
    } catch (e) {
      return reply.status(400).send({ message: "Invalid input" });
    }

    const authHeader = request.headers.authorization as string | undefined;
    if (!authHeader) {
      return reply.status(401).send({ message: "Authorization header missing" });
    }

    const workspaceId = await validateWriteKey(authHeader);
    if (!workspaceId) {
      return reply.status(401).send({ message: "Invalid write key" });
    }

    const now = new Date().toISOString().slice(0, 19).replace("T", " "); // e.g., "2025-03-05 20:02:18"
    const message = {
      workspace_id: workspaceId,
      message_raw: JSON.stringify({
        user_id: body.userId,
        type: "track",
        event: body.event,
        properties: body.properties || {},
        timestamp: now,
      }),
      processing_time: now,
      message_id: randomUUID(),
      event_time: now,
    };

    try {
      if (process.env.USE_DIRECT_INSERT === "true") {
        await insertEventsDirect([message], true);
      } else {
        await sendToKafka("track", message);
      }
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ message: "Failed to process event" });
    }

    return reply.status(204).send();
  });
}