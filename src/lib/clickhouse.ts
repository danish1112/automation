import { createClient, ClickHouseSettings } from "@clickhouse/client";
import { randomUUID } from "crypto";
require("dotenv").config();

const clickhouseClient = createClient({
  host: "http://localhost:8123",
  database: "default",
  username: "default",
  password: "danish",
});

export async function insertEventsDirect(events: any[], asyncInsert = false) {
  const values = events.map((e) => ({
    workspace_id: e.workspace_id,
    message_raw: e.message_raw,
    processing_time: e.processing_time || null,  // Nullable
    message_id: e.message_id || randomUUID(),
    event_time: e.event_time || new Date().toISOString(),  // Required
  }));

  const settings: ClickHouseSettings = {
    async_insert: asyncInsert ? 1 : undefined,
    wait_for_async_insert: asyncInsert ? 1 : undefined,
    wait_end_of_query: asyncInsert ? undefined : (1 as const),  // Type assertion for sync
  } as const;  // Ensure literal types (0 | 1 | undefined)

  await clickhouseClient.insert({
    table: "user_events_v2",
    values,
    clickhouse_settings: settings,
    format: "JSONEachRow",
  });
}

export { clickhouseClient }; // For querying later