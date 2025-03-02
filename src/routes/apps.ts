import { FastifyInstance } from "fastify";
import {
  IdentifyData,
  IdentifyDataType,
  TrackData,
  TrackDataType,
  BaseMessageResponse,
} from "../lib/types";

// Mock validation until PostgreSQL is added
async function validateWriteKey(writeKey: string): Promise<string | null> {
  // Hardcoded for now; will replace with PostgreSQL lookup later
  if (writeKey === "Basic abcdefg...") {
    return "550e8400-e29b-41d4-a716-446655440000"; // Mock workspace ID
  }
  return null;
}

export default async function publicAppsController(fastify: FastifyInstance) {
  fastify.post<{ Body: IdentifyDataType }>("/identify", async (request, reply) => {
    // Validate request body with Zod
    let body: IdentifyDataType;
    try {
      body = IdentifyData.parse(request.body);
    } catch (e) {
      return reply.status(400).send({ message: "Invalid input" });
    }

    const workspaceId = await validateWriteKey(request.headers.authorization as string);
    if (!workspaceId) {
      return reply.status(401).send({ message: "Invalid write key." });
    }

    // For now, just log and return success
    fastify.log.info(
      {
        workspaceId,
        userId: body.userId,
        traits: body.traits,
      },
      "Identify event received"
    );

    return reply.status(204).send();
  });

  fastify.post<{ Body: TrackDataType }>("/track", async (request, reply) => {
    // Validate request body with Zod
    let body: TrackDataType;
    try {
      body = TrackData.parse(request.body);
    } catch (e) {
      return reply.status(400).send({ message: "Invalid input" });
    }

    const workspaceId = await validateWriteKey(request.headers.authorization as string);
    if (!workspaceId) {
      return reply.status(401).send({ message: "Invalid write key." });
    }

    // For now, just log and return success
    fastify.log.info(
      {
        workspaceId,
        userId: body.userId,
        event: body.event,
        properties: body.properties,
      },
      "Track event received"
    );

    return reply.status(204).send();
  });
}