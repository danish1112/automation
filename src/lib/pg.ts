import { eq } from "drizzle-orm";
import { db } from "../db";
import { secret, writeKey } from "../db/schema";

export async function validateWriteKey(writeKeyValue: string): Promise<string | null> {
  const result = await db
    .select({ workspaceId: writeKey.workspaceId }) // Select workspaceId from writeKey table
    .from(writeKey)
    .innerJoin(secret, eq(writeKey.secretId, secret.id))
    .where(eq(secret.value, writeKeyValue)) // Use parameter writeKeyValue
    .limit(1);

  return result[0]?.workspaceId || null;
}