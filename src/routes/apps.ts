import { FastifyInstance } from "fastify";
import {
  IdentifyData,
  IdentifyDataType,
  TrackData,
  TrackDataType,
  BaseMessageResponse,
} from "../lib/types";
import { validateWriteKey } from "../lib/pg";
import { sendToKafka } from "../lib/kafka";
import { randomUUID } from "crypto";

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

    const message = {
      id: randomUUID(),
      workspace_id: workspaceId,
      user_id: body.userId,
      type: "identify",
      event: null,
      properties: body.traits || {},
      timestamp: new Date().toISOString(),
    };

    try {
      await sendToKafka("identify", message);
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ message: "Failed to publish event to Kafka" });
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

    const message = {
      id: randomUUID(),
      workspace_id: workspaceId,
      user_id: body.userId,
      type: "track",
      event: body.event,
      properties: body.properties || {},
      timestamp: new Date().toISOString(),
    };

    try {
      await sendToKafka("track", message);
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ message: "Failed to publish event to Kafka" });
    }

    return reply.status(204).send();
  });
}